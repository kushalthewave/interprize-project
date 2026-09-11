/**
 * Graphics.js
 * Applies the Video settings to the renderer, the camera and the scene.
 *
 * Every setting here changes something real:
 *
 *   resolution      renderer pixel ratio (Auto keeps the adaptive drop)
 *   frame-rate cap  frames skipped in Engine's loop
 *   field of view   camera.fov
 *   textures        anisotropic filtering on every map in the scene
 *   shadows         shadow map on/off, filter type and map resolution
 *   lighting        how many high-bay lamps are real light sources
 *   anti-aliasing   MSAA (context attribute — needs a restart) or FXAA (a pass)
 *   motion blur     frame-blend pass (AfterimagePass)
 *   depth of field  bokeh pass, auto-focused on what the crosshair is on
 *   lens flare      procedural flares on the lamps that cast light
 *
 * With no post effect switched on the renderer draws straight to the screen —
 * the composer only exists when something needs it, so the default path costs
 * nothing extra.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { RENDER } from '../data/config.js';
import { pixelRatioFor } from '../data/settings.js';
import { setDefaultAnisotropy } from './Textures.js';

const ANISO = { low: 1, medium: 4, high: 8, ultra: 16 };
const SHADOWS = {
  off: null,
  low: { size: 512, type: THREE.PCFShadowMap },
  medium: { size: 1024, type: THREE.PCFShadowMap },
  high: { size: 2048, type: THREE.PCFSoftShadowMap },
  ultra: { size: 4096, type: THREE.PCFSoftShadowMap },
};
const MAP_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap'];

export class Graphics {
  /** @param {import('./Engine.js').Engine} engine */
  constructor(engine) {
    this.engine = engine;
    this.s = {};
    this.composer = null;
    this.passes = {};
    this.flareTextures = null;
    this.focusTarget = 8;
    this.focus = 8;
    engine.renderFn = () => this.render();
    engine.addUpdater((dt) => this._update(dt));
  }

  /** The anti-aliasing this renderer was actually created with. */
  get msaaActive() { return !!this.engine.msaa; }

  /** True when the stored anti-aliasing setting needs a restart to take effect. */
  get restartNeeded() {
    return (this.s.antialias === 'msaa') !== this.msaaActive;
  }

  /* ---------------------------------------------------------------- *
   * Apply
   * ---------------------------------------------------------------- */

  /** Apply every video setting. Safe to call repeatedly; only changes cost. */
  apply(settings) {
    const prev = this.s;
    this.s = { ...settings };
    const e = this.engine;
    const r = e.renderer;

    // Resolution
    e.adaptive = settings.renderScale === 'auto';
    const ratio = pixelRatioFor(settings.renderScale, window.devicePixelRatio, RENDER.maxPixelRatio);
    if (Math.abs(r.getPixelRatio() - ratio) > 0.001 && (!e.adaptive || prev.renderScale !== 'auto')) {
      r.setPixelRatio(ratio);
      e.resize();
    }

    // Frame-rate cap
    e.fpsCap = Number(settings.fpsCap) || 0;

    // Field of view
    const fov = Number(settings.fov) || RENDER.fov;
    if (e.camera.fov !== fov) {
      e.camera.fov = fov;
      e.camera.updateProjectionMatrix();
    }

    // Everything that touches the scene.
    if (prev.textureQuality !== settings.textureQuality) this._applyTextures();
    if (prev.shadowQuality !== settings.shadowQuality) this._applyShadows(true);
    if (prev.lighting !== settings.lighting) this._applyLighting();
    if (prev.lensFlare !== settings.lensFlare || prev.lighting !== settings.lighting) this._applyFlares();

    // Post-processing pipeline — rebuilt only when its shape changes.
    const shape = (s) => `${s.antialias}|${!!s.motionBlur}|${!!s.depthOfField}`;
    if (shape(prev) !== shape(settings)) this._buildComposer();
  }

  /** A new environment was built: push the scene-dependent settings into it. */
  onWorldLoaded() {
    this._captureLighting();
    this._applyTextures();
    this._applyShadows(false);
    this._applyLighting();
    this._applyFlares();
    this._buildComposer();
  }

  /** Depth of field focuses here (metres). Called with what the crosshair is on. */
  setFocusDistance(d) {
    this.focusTarget = Math.max(1.5, Math.min(40, d || 8));
  }

  /* ---------------------------------------------------------------- *
   * Textures
   * ---------------------------------------------------------------- */

  _applyTextures() {
    const r = this.engine.renderer;
    const max = r.capabilities.getMaxAnisotropy?.() ?? 1;
    const level = Math.min(ANISO[this.s.textureQuality] ?? 8, max);
    setDefaultAnisotropy(level);
    const seen = new Set();
    this.engine.scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const slot of MAP_SLOTS) {
          const t = m[slot];
          if (!t || seen.has(t)) continue;
          seen.add(t);
          if (t.anisotropy !== level) {
            t.anisotropy = level;
            t.needsUpdate = true;
          }
        }
      }
    });
    this.textureLevel = level;
  }

  /* ---------------------------------------------------------------- *
   * Shadows
   * ---------------------------------------------------------------- */

  _applyShadows(recompile) {
    const r = this.engine.renderer;
    // `off` maps to null on purpose, so `??` would wrongly fall through to High.
    const spec = Object.hasOwn(SHADOWS, this.s.shadowQuality) ? SHADOWS[this.s.shadowQuality] : SHADOWS.high;
    const wasEnabled = r.shadowMap.enabled;
    const wasType = r.shadowMap.type;

    r.shadowMap.enabled = !!spec;
    if (spec) r.shadowMap.type = spec.type;

    this.engine.scene.traverse((o) => {
      if (!o.isLight || !o.shadow || !o.castShadow) return;
      if (spec && o.shadow.mapSize.x !== spec.size) {
        o.shadow.mapSize.set(spec.size, spec.size);
        o.shadow.map?.dispose();
        o.shadow.map = null;
      }
    });

    // Switching shadows on/off or changing the filter changes the shaders.
    if (recompile && (wasEnabled !== r.shadowMap.enabled || wasType !== r.shadowMap.type)) {
      this._recompileMaterials();
    }
    r.shadowMap.needsUpdate = true;
  }

  _recompileMaterials() {
    this.engine.scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) m.needsUpdate = true;
    });
  }

  /* ---------------------------------------------------------------- *
   * Lighting
   * ---------------------------------------------------------------- */

  /** Record each lamp and the fill lights' authored intensities, once per world. */
  _captureLighting() {
    this.lamps = [];
    this.fills = [];
    this.engine.scene.traverse((o) => {
      if (o.name === 'lighting') {
        o.traverse((l) => {
          if (l.isPointLight) this.lamps.push(l);
          if (l.isHemisphereLight || l.isAmbientLight) this.fills.push(l);
        });
      }
    });
    for (const f of this.fills) f.userData.baseIntensity = f.intensity;
  }

  _applyLighting() {
    if (!this.lamps) this._captureLighting();
    const q = this.s.lighting ?? 'high';
    // High: every lamp is a light. Medium: every other one. Low: none, with
    // the fill lights raised so the building is not simply darker.
    this.lamps.forEach((l, i) => {
      l.visible = q === 'high' || (q === 'medium' && i % 2 === 0);
    });
    const lift = q === 'low' ? 1.55 : q === 'medium' ? 1.18 : 1;
    for (const f of this.fills) {
      const base = f.userData.baseIntensity ?? f.intensity;
      f.intensity = base * lift;
    }
  }

  /* ---------------------------------------------------------------- *
   * Lens flare
   * ---------------------------------------------------------------- */

  _flareTextures() {
    if (this.flareTextures) return this.flareTextures;
    const make = (size, stops) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      for (const [at, col] of stops) grad.addColorStop(at, col);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    this.flareTextures = {
      glow: make(256, [[0, 'rgba(255,248,230,1)'], [0.18, 'rgba(255,236,200,0.55)'], [1, 'rgba(255,220,170,0)']]),
      ring: make(128, [[0, 'rgba(255,255,255,0)'], [0.62, 'rgba(255,255,255,0)'], [0.78, 'rgba(190,220,255,0.35)'], [1, 'rgba(190,220,255,0)']]),
      disc: make(64, [[0, 'rgba(255,210,150,0.5)'], [1, 'rgba(255,210,150,0)']]),
    };
    return this.flareTextures;
  }

  _applyFlares() {
    if (!this.lamps) return;
    for (const l of this.lamps) {
      if (l.userData.flare) {
        l.remove(l.userData.flare);
        l.userData.flare.dispose();
        l.userData.flare = null;
      }
    }
    if (!this.s.lensFlare) return;
    const t = this._flareTextures();
    const colour = new THREE.Color(0xfff0d6);
    for (const l of this.lamps) {
      if (!l.visible) continue;
      const f = new Lensflare();
      f.addElement(new LensflareElement(t.glow, 220, 0, colour));
      f.addElement(new LensflareElement(t.disc, 40, 0.45));
      f.addElement(new LensflareElement(t.ring, 90, 0.7));
      f.addElement(new LensflareElement(t.disc, 60, 0.95));
      l.add(f);
      l.userData.flare = f;
    }
  }

  /* ---------------------------------------------------------------- *
   * Post-processing
   * ---------------------------------------------------------------- */

  _buildComposer() {
    const e = this.engine;
    const s = this.s;
    this.composer?.dispose();
    this.composer = null;
    this.passes = {};

    const need = s.antialias === 'fxaa' || s.motionBlur || s.depthOfField;
    if (!need) return;

    const size = e.renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      // Keep MSAA through the composer when the context has it.
      samples: this.msaaActive ? 4 : 0,
    });
    const c = new EffectComposer(e.renderer, target);
    c.addPass(new RenderPass(e.scene, e.camera));

    if (s.depthOfField) {
      const bokeh = new BokehPass(e.scene, e.camera, { focus: this.focus, aperture: 0.0022, maxblur: 0.009 });
      c.addPass(bokeh);
      this.passes.bokeh = bokeh;
    }
    if (s.motionBlur) {
      const blur = new AfterimagePass(0.78);
      c.addPass(blur);
      this.passes.blur = blur;
    }
    c.addPass(new OutputPass());
    if (s.antialias === 'fxaa') {
      const fxaa = new ShaderPass(FXAAShader);
      c.addPass(fxaa);
      this.passes.fxaa = fxaa;
    }
    this.composer = c;
    this._sizeComposer();
  }

  _sizeComposer() {
    if (!this.composer) return;
    const r = this.engine.renderer;
    const css = r.getSize(new THREE.Vector2());
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(css.x, css.y);
    if (this.passes.fxaa) {
      const pr = r.getPixelRatio();
      this.passes.fxaa.material.uniforms.resolution.value.set(1 / (css.x * pr), 1 / (css.y * pr));
    }
  }

  /** Keep the composer in step with the canvas. Engine calls this on resize. */
  onResize() {
    this._sizeComposer();
  }

  _update(dt) {
    // Motion blur fades in with movement speed, so a still frame is sharp.
    if (this.passes.blur) {
      const moving = this.engine.cameraSpeed ?? 0;
      const damp = 0.62 + Math.min(1, moving / 5) * 0.22;
      this.passes.blur.uniforms.damp.value = damp;
    }
    if (this.passes.bokeh) {
      this.focus += (this.focusTarget - this.focus) * (1 - Math.exp(-6 * dt));
      this.passes.bokeh.uniforms.focus.value = this.focus;
    }
  }

  render() {
    const e = this.engine;
    if (this.composer) this.composer.render();
    else e.renderer.render(e.scene, e.camera);
  }
}
