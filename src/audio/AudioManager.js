/**
 * AudioManager.js
 * All sound is SYNTHESISED at runtime with the Web Audio API.
 *
 * Why: it removes every third-party audio licence and attribution problem,
 * adds zero bytes to the download, and lets the reversing alarm and forklift
 * engine react continuously to distance and speed rather than being a looped
 * clip. See docs/ASSET_CREDITS.md.
 *
 * Everything degrades silently: if AudioContext is unavailable or the user
 * never gestures (autoplay policy), calls are no-ops rather than errors.
 */
export class AudioManager {
  constructor({ enabled = true, volume = 0.7 } = {}) {
    this.enabled = enabled;
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.ambienceNodes = null;
    this.available = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
    /** @type {Map<string, object>} continuous emitters keyed by id */
    this.emitters = new Map();
  }

  /** Must be called from a user gesture (click/keypress) to satisfy autoplay policy. */
  init() {
    if (!this.available || this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      // gentle limiter so layered sounds never clip
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 8;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    } catch (err) {
      console.warn('[Audio] unavailable:', err);
      this.available = false;
    }
    return this.ctx;
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) {
      this.master.gain.setTargetAtTime(v ? this.volume : 0, this.ctx.currentTime, 0.05);
    }
    if (!v) this.stopAmbience();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master && this.enabled) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  get ready() {
    return !!(this.ctx && this.enabled && this.master);
  }

  /* ---------------------------------------------------------------- *
   * Primitives
   * ---------------------------------------------------------------- */

  _env(gain, t, { attack = 0.005, decay = 0.2, peak = 1, sustain = 0 } = {}) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + attack + decay);
  }

  /** One-shot oscillator blip. */
  tone(freq, dur = 0.14, { type = 'sine', gain = 0.25, slideTo = null, delay = 0 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    this._env(g, t, { attack: 0.006, decay: dur, peak: gain });
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Filtered noise burst - used for impacts, whooshes and the ambience bed. */
  noise(dur = 0.3, { gain = 0.2, freq = 900, q = 0.8, type = 'bandpass', delay = 0 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    this._env(g, t, { attack: 0.004, decay: dur, peak: gain });
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /* ---------------------------------------------------------------- *
   * Game cues
   * ---------------------------------------------------------------- */

  uiClick() { this.tone(520, 0.05, { type: 'triangle', gain: 0.12 }); }
  uiHover() { this.tone(760, 0.03, { type: 'sine', gain: 0.05 }); }
  uiBack() { this.tone(300, 0.08, { type: 'triangle', gain: 0.12, slideTo: 210 }); }

  /** Rising major arpeggio - a hazard was correctly identified. */
  correct() {
    this.tone(659.25, 0.12, { type: 'triangle', gain: 0.2 });
    this.tone(830.61, 0.12, { type: 'triangle', gain: 0.18, delay: 0.08 });
    this.tone(1046.5, 0.22, { type: 'triangle', gain: 0.16, delay: 0.16 });
  }

  /** Low double buzz - wrong flag. */
  incorrect() {
    this.tone(180, 0.16, { type: 'sawtooth', gain: 0.16, slideTo: 130 });
    this.tone(150, 0.2, { type: 'sawtooth', gain: 0.13, slideTo: 110, delay: 0.13 });
  }

  /** Combo start - bright fifth stack. */
  combo() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'sine', gain: 0.14, delay: i * 0.06 }),
    );
  }

  achievement() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.tone(f, 0.4, { type: 'triangle', gain: 0.13, delay: i * 0.07 }),
    );
  }

  /** Timer warning pip. */
  timerWarn() { this.tone(880, 0.09, { type: 'square', gain: 0.1 }); }
  timerCritical() { this.tone(1100, 0.07, { type: 'square', gain: 0.14 }); }

  /** Round finished. */
  resultGood() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) =>
      this.tone(f, 0.5, { type: 'triangle', gain: 0.15, delay: i * 0.11 }),
    );
  }

  resultPoor() {
    [392, 349.23, 293.66].forEach((f, i) =>
      this.tone(f, 0.45, { type: 'triangle', gain: 0.14, delay: i * 0.13 }),
    );
  }

  /** Forklift horn. */
  horn() {
    this.tone(392, 0.45, { type: 'square', gain: 0.12 });
    this.tone(466, 0.45, { type: 'square', gain: 0.1 });
  }

  /** A carton hitting the concrete. */
  boxImpact() {
    this.noise(0.22, { gain: 0.28, freq: 260, q: 0.6, type: 'lowpass' });
    this.tone(90, 0.18, { type: 'sine', gain: 0.22, slideTo: 55 });
  }

  footstep() {
    this.noise(0.07, { gain: 0.045, freq: 1400, q: 1.2 });
  }

  /* ---------------------------------------------------------------- *
   * Continuous emitters
   * ---------------------------------------------------------------- */

  /**
   * Warehouse ambience: a low HVAC rumble plus a faint high hiss.
   * Runs until stopAmbience().
   */
  startAmbience() {
    if (!this.ready || this.ambienceNodes) return;
    const t = this.ctx.currentTime;

    const frames = this.ctx.sampleRate * 4;
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    // brown-ish noise for a plausible plant-room rumble
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;

    const hiss = this.ctx.createBufferSource();
    hiss.buffer = buf;
    hiss.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;

    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.16, t + 2);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.012, t + 2);

    src.connect(lp); lp.connect(g1); g1.connect(this.master);
    hiss.connect(hp); hp.connect(g2); g2.connect(this.master);
    src.start(t);
    hiss.start(t);

    this.ambienceNodes = { src, hiss, g1, g2 };
  }

  stopAmbience() {
    const n = this.ambienceNodes;
    if (!n || !this.ctx) return;
    const t = this.ctx.currentTime;
    n.g1.gain.cancelScheduledValues(t);
    n.g2.gain.cancelScheduledValues(t);
    n.g1.gain.setTargetAtTime(0.0001, t, 0.3);
    n.g2.gain.setTargetAtTime(0.0001, t, 0.3);
    setTimeout(() => {
      try { n.src.stop(); n.hiss.stop(); } catch { /* already stopped */ }
    }, 1200);
    this.ambienceNodes = null;
  }

  /**
   * A positional-ish forklift engine + reversing alarm.
   * `update(distance, moving, reversing)` is called each frame by the scene.
   */
  createForkliftEmitter(id) {
    if (!this.ready) return { update() {}, stop() {} };
    if (this.emitters.has(id)) return this.emitters.get(id);

    const t = this.ctx.currentTime;
    const engine = this.ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 62;
    const engLp = this.ctx.createBiquadFilter();
    engLp.type = 'lowpass';
    engLp.frequency.value = 220;
    const engGain = this.ctx.createGain();
    engGain.gain.value = 0.0001;
    engine.connect(engLp); engLp.connect(engGain); engGain.connect(this.master);
    engine.start(t);

    // reversing alarm: a square wave gated by an LFO-driven gain
    const beep = this.ctx.createOscillator();
    beep.type = 'square';
    beep.frequency.value = 1180;
    const beepGain = this.ctx.createGain();
    beepGain.gain.value = 0.0001;
    beep.connect(beepGain); beepGain.connect(this.master);
    beep.start(t);

    const emitter = {
      _beepPhase: 0,
      /**
       * @param {number} distance metres from the listener
       * @param {number} speed    0..1
       * @param {boolean} reversing
       * @param {number} dt
       */
      update: (distance, speed, reversing, dt = 0.016) => {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        const atten = Math.max(0, 1 - distance / 32) ** 2;
        engGain.gain.setTargetAtTime(0.075 * atten * (0.35 + speed * 0.65), now, 0.12);
        engine.frequency.setTargetAtTime(56 + speed * 46, now, 0.2);
        engLp.frequency.setTargetAtTime(180 + speed * 420, now, 0.2);

        emitter._beepPhase += dt;
        if (reversing && atten > 0.002) {
          const on = emitter._beepPhase % 1.0 < 0.42;
          beepGain.gain.setTargetAtTime(on ? 0.05 * atten : 0.0001, now, 0.01);
        } else {
          beepGain.gain.setTargetAtTime(0.0001, now, 0.03);
        }
      },
      stop: () => {
        try { engine.stop(); beep.stop(); } catch { /* already stopped */ }
        this.emitters.delete(id);
      },
    };
    this.emitters.set(id, emitter);
    return emitter;
  }

  stopAllEmitters() {
    for (const e of [...this.emitters.values()]) e.stop();
    this.emitters.clear();
  }

  dispose() {
    this.stopAmbience();
    this.stopAllEmitters();
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
  }
}
