/**
 * AudioManager.js
 * All sound is SYNTHESISED at runtime with the Web Audio API.
 *
 * Why: it removes every third-party audio licence and attribution problem,
 * adds zero bytes to the download, and lets the reversing alarm and forklift
 * engine react continuously to distance and speed rather than being a looped
 * clip. See docs/ASSET_CREDITS.md.
 *
 * Mix
 *   master ─┬─ music   procedural ambient pad (ducks during a round)
 *           ├─ sfx     every game sound: cues, forklifts, footsteps, ambience
 *           └─ (voice) spoken announcements go through the browser's speech
 *                      engine, which has its own volume, set from the same mix
 *
 * Captions: every important sound reports a caption through onCaption, and
 * every spoken line through onSpeech. The UI decides whether to show them.
 *
 * Everything degrades silently: if AudioContext is unavailable or the user
 * never gestures (autoplay policy), calls are no-ops rather than errors.
 */
export class AudioManager {
  constructor({ enabled = true, volume = 0.7, music = 0.35, voice = 0.8, sfx = 0.9 } = {}) {
    this.enabled = enabled;
    this.volume = volume;
    this.mix = { music, voice, sfx };
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.musicBus = null;
    this.ambienceNodes = null;
    this.available = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
    /** @type {Map<string, object>} continuous emitters keyed by id */
    this.emitters = new Map();
    this.music = null;
    this.musicWanted = false;
    this.duck = 1;
    this.sinkId = 'default';
    /** @type {(text:string, kind:string) => void} */
    this.onCaption = null;
    /** @type {(text:string) => void} */
    this.onSpeech = null;
    this._lastCaption = new Map();
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

      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.mix.sfx;
      this.sfx.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.mix.music * this.duck;
      this.musicBus.connect(this.master);

      if (this.sinkId !== 'default') this.setOutputDevice(this.sinkId);
      if (this.musicWanted) this.startMusic();
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
    if (!v) {
      this.stopAmbience();
      window.speechSynthesis?.cancel?.();
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master && this.enabled) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  /** Set the music, voice and sound-effect levels (each 0–1, under master). */
  setMix({ music = this.mix.music, voice = this.mix.voice, sfx = this.mix.sfx } = {}) {
    this.mix = { music, voice, sfx };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(music * this.duck, t, 0.1);
  }

  /**
   * Lower the music during a round. The reversing alarm is a safety cue in a
   * game about hazards; it must never be masked by the soundtrack.
   */
  setMusicDuck(ducked) {
    this.duck = ducked ? 0.35 : 1;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.mix.music * this.duck, this.ctx.currentTime, 0.6);
  }

  get ready() {
    return !!(this.ctx && this.enabled && this.master);
  }

  /* ---------------------------------------------------------------- *
   * Output device
   * ---------------------------------------------------------------- */

  /** Can this browser route Web Audio to a chosen output? */
  static get canChooseOutput() {
    return typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
  }

  /**
   * The outputs the browser is willing to name. Most browsers only reveal
   * device names after the page has been granted microphone access, so an
   * unlabelled list is normal and is shown as such.
   */
  static async listOutputs() {
    try {
      const all = await navigator.mediaDevices?.enumerateDevices?.();
      return (all ?? [])
        .filter((d) => d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
        .map((d, i) => ({ id: d.deviceId, label: d.label || `Output ${i + 1}` }));
    } catch {
      return [];
    }
  }

  async setOutputDevice(id) {
    this.sinkId = id || 'default';
    if (!this.ctx || !AudioManager.canChooseOutput) return false;
    try {
      await this.ctx.setSinkId(this.sinkId === 'default' ? '' : this.sinkId);
      return true;
    } catch (err) {
      console.warn('[Audio] could not switch output:', err);
      this.sinkId = 'default';
      return false;
    }
  }

  /* ---------------------------------------------------------------- *
   * Captions and voice
   * ---------------------------------------------------------------- */

  /** Report a sound as text, at most once per `every` seconds per key. */
  _caption(key, text, every = 0) {
    if (!this.onCaption || !this.enabled) return;
    const now = performance.now() / 1000;
    const last = this._lastCaption.get(key) ?? -Infinity;
    if (now - last < every) return;
    this._lastCaption.set(key, now);
    this.onCaption(text, key);
  }

  /**
   * Speak a line through the browser's own speech engine. It runs offline on
   * the operating system's voices, so nothing is downloaded. Subtitles are
   * raised whether or not a voice is available.
   */
  say(text, { interrupt = false } = {}) {
    if (!this.enabled) return;
    this.onSpeech?.(text);
    const synth = window.speechSynthesis;
    const vol = this.volume * this.mix.voice;
    if (!synth || vol <= 0.001 || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      if (interrupt) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.volume = Math.min(1, vol);
      u.rate = 1.02;
      u.lang = 'en-GB';
      synth.speak(u);
    } catch { /* speech unavailable: the subtitle was still shown */ }
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
  tone(freq, dur = 0.14, { type = 'sine', gain = 0.25, slideTo = null, delay = 0, bus = null } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    this._env(g, t, { attack: 0.006, decay: dur, peak: gain });
    osc.connect(g);
    g.connect(bus ?? this.sfx);
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
    g.connect(this.sfx);
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
    this._caption('correct', '[Chime — hazard found]');
  }

  /** Low double buzz - wrong flag. */
  incorrect() {
    this.tone(180, 0.16, { type: 'sawtooth', gain: 0.16, slideTo: 130 });
    this.tone(150, 0.2, { type: 'sawtooth', gain: 0.13, slideTo: 110, delay: 0.13 });
    this._caption('wrong', '[Buzzer — not a hazard]');
  }

  /** Combo start - bright fifth stack. */
  combo() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'sine', gain: 0.14, delay: i * 0.06 }),
    );
    this._caption('combo', '[Rising chord — combo]');
  }

  achievement() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.tone(f, 0.4, { type: 'triangle', gain: 0.13, delay: i * 0.07 }),
    );
  }

  /** Timer warning pip. */
  timerWarn() {
    this.tone(880, 0.09, { type: 'square', gain: 0.1 });
    this._caption('timer', '[Timer beeping]', 4);
  }

  timerCritical() {
    this.tone(1100, 0.07, { type: 'square', gain: 0.14 });
    this._caption('timer', '[Timer beeping — seconds left]', 4);
  }

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
    this._caption('horn', '[Forklift horn]', 3);
  }

  /** A carton hitting the concrete. */
  boxImpact(distance = 10) {
    const atten = Math.max(0.12, 1 - distance / 30);
    this.noise(0.22, { gain: 0.28 * atten, freq: 260, q: 0.6, type: 'lowpass' });
    this.tone(90, 0.18, { type: 'sine', gain: 0.22 * atten, slideTo: 55 });
    if (distance < 18) this._caption('box', distance < 7 ? '[Carton crashes to the floor — close]' : '[Carton falls somewhere nearby]', 2);
  }

  footstep() {
    this.noise(0.07, { gain: 0.045, freq: 1400, q: 1.2 });
  }

  /* ---------------------------------------------------------------- *
   * Music
   * ---------------------------------------------------------------- */

  /**
   * A slow, quiet procedural pad: four chords, eight seconds each, detuned
   * triangle voices through a low-pass filter. Nothing is downloaded, and it
   * stays out of the frequency range of the alarms and the feedback chimes.
   */
  startMusic() {
    this.musicWanted = true;
    if (!this.ctx || this.music) return;
    const chords = [
      [220.0, 261.63, 329.63],   // A minor
      [174.61, 220.0, 261.63],   // F major
      [196.0, 246.94, 293.66],   // G major
      [164.81, 207.65, 246.94],  // E major (a gentle lift back to A)
    ];
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    lp.connect(this.musicBus);

    const state = { lp, step: 0, timer: null, nodes: new Set() };
    const bar = 8;
    const playChord = () => {
      if (!this.ctx || this.music !== state) return;
      const t = this.ctx.currentTime + 0.05;
      const notes = chords[state.step % chords.length];
      for (const f of [...notes, notes[0] / 2]) {
        for (const detune of [-6, 5]) {
          const o = this.ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = f;
          o.detune.value = detune;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.045, t + 2.4);
          g.gain.setValueAtTime(0.045, t + bar - 2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + bar + 1.5);
          o.connect(g);
          g.connect(lp);
          o.start(t);
          o.stop(t + bar + 1.6);
          state.nodes.add(o);
          o.onended = () => state.nodes.delete(o);
        }
      }
      state.step++;
      state.timer = setTimeout(playChord, bar * 1000);
    };
    this.music = state;
    playChord();
  }

  stopMusic() {
    this.musicWanted = false;
    const m = this.music;
    if (!m) return;
    this.music = null;
    clearTimeout(m.timer);
    for (const o of m.nodes) { try { o.stop(); } catch { /* ended */ } }
    m.nodes.clear();
    try { m.lp.disconnect(); } catch { /* already */ }
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

    src.connect(lp); lp.connect(g1); g1.connect(this.sfx);
    hiss.connect(hp); hp.connect(g2); g2.connect(this.sfx);
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
   * `update(distance, speed, reversing, dt)` is called each frame by the game.
   */
  createForkliftEmitter(id) {
    if (!this.ready) return null;
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
    engine.connect(engLp); engLp.connect(engGain); engGain.connect(this.sfx);
    engine.start(t);

    // reversing alarm: a square wave gated by an LFO-driven gain
    const beep = this.ctx.createOscillator();
    beep.type = 'square';
    beep.frequency.value = 1180;
    const beepGain = this.ctx.createGain();
    beepGain.gain.value = 0.0001;
    beep.connect(beepGain); beepGain.connect(this.sfx);
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
          if (atten > 0.05) {
            this._caption(`rev:${id}`, distance < 10 ? '[Reversing alarm — close by]' : '[Reversing alarm in the distance]', 5);
          }
        } else {
          beepGain.gain.setTargetAtTime(0.0001, now, 0.03);
          if (atten > 0.35 && speed > 0.05) this._caption(`eng:${id}`, '[Forklift engine nearby]', 8);
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

  /** Silence every emitter without destroying it (pause). */
  silenceEmitters() {
    for (const e of this.emitters.values()) e.update(1e3, 0, false, 0);
  }

  stopAllEmitters() {
    for (const e of [...this.emitters.values()]) e.stop();
    this.emitters.clear();
  }

  dispose() {
    this.stopAmbience();
    this.stopMusic();
    this.stopAllEmitters();
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
  }
}
