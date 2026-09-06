/**
 * Engine.js
 * Owns the WebGL renderer, the scene graph root, the camera and the frame loop.
 * Nothing gameplay-specific lives here - systems register update callbacks.
 */
import * as THREE from 'three';
import { RENDER } from '../data/config.js';

export class Engine {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e12);

    this.camera = new THREE.PerspectiveCamera(
      RENDER.fov,
      window.innerWidth / window.innerHeight,
      RENDER.near,
      RENDER.far,
    );
    this.camera.position.set(0, 1.7, 0);

    this.clock = new THREE.Clock();
    /** @type {Set<(dt:number, elapsed:number)=>void>} */
    this.updaters = new Set();
    this.running = false;
    this.paused = false;
    this._raf = null;

    // rolling FPS estimate for the perf overlay / adaptive quality
    this.fps = 60;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._adaptiveCooldown = 0;

    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this.resize();

    // WebGL context-loss resilience
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      console.warn('[Engine] WebGL context lost.');
      this.onContextLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('[Engine] WebGL context restored.');
      this.onContextRestored?.();
      this.start();
    });
  }

  /** @returns {() => void} unregister */
  addUpdater(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      // Clamp dt so a background tab does not teleport the player.
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.elapsedTime;

      this._trackFps(dt);

      if (!this.paused) {
        for (const fn of this.updaters) {
          try {
            fn(dt, elapsed);
          } catch (err) {
            console.error('[Engine] updater threw:', err);
          }
        }
      }
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  setPaused(v) {
    this.paused = v;
  }

  _trackFps(dt) {
    this._fpsAccum += dt;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
      this._adaptiveQuality();
    }
  }

  /**
   * Cheap adaptive quality: if we are consistently below ~40fps, drop the
   * device pixel ratio one notch (down to 1) before touching anything else.
   * Recovers when headroom returns.
   */
  _adaptiveQuality() {
    if (this._adaptiveCooldown > 0) {
      this._adaptiveCooldown--;
      return;
    }
    const cur = this.renderer.getPixelRatio();
    const target = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    if (this.fps < 40 && cur > 1) {
      this.renderer.setPixelRatio(Math.max(1, cur - 0.25));
      this._adaptiveCooldown = 8;
    } else if (this.fps > 58 && cur < target) {
      this.renderer.setPixelRatio(Math.min(target, cur + 0.25));
      this._adaptiveCooldown = 8;
    }
  }

  /** Remove and dispose everything under a root object. */
  static disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose?.());
      else m?.dispose?.();
    });
    obj.parent?.remove(obj);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    Engine.disposeObject(this.scene);
    this.renderer.dispose();
  }
}
