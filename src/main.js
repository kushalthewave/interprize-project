/**
 * main.js
 * Application entry point. Wires the engine, player, game manager, audio,
 * profile and UI together, and owns the input bindings that cross layers
 * (Esc to pause, E/click to flag).
 */
import './ui/styles.css';
import { Engine } from './core/Engine.js';
import { PlayerController } from './player/PlayerController.js';
import { AvatarRig } from './player/PlayerAvatar.js';
import { GameManager, MODE, STATE } from './gameplay/GameManager.js';
import { Profile } from './services/Profile.js';
import { AuthManager } from './services/auth/AuthManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIManager } from './ui/UIManager.js';
import { bus, EV } from './core/EventBus.js';
import { Graphics } from './core/Graphics.js';
import { actionForKey, presetPatch, detectPreset, isPresetKey, keyLabel } from './data/settings.js';
import { getAvatar } from './data/avatars.js';
import { setColourMode, palette } from './data/palette.js';
import { initOffline, onOfflineChange } from './services/offline.js';

/** Where a training round in progress is kept, so a closed tab can resume it. */
const CHECKPOINT_KEY = 'beat-the-hazard:checkpoint:v1';
const AIM_ASSIST = { off: { size: 1, friction: 1 }, low: { size: 1.25, friction: 0.7 }, high: { size: 1.55, friction: 0.5 } };

function boot() {
  const canvas = document.getElementById('scene');
  if (!canvas) throw new Error('#scene canvas missing');

  // --- WebGL capability check with a graceful message rather than a blank page
  if (!hasWebGL()) {
    showFatal(
      'WebGL is not available',
      'Beat The Hazard needs WebGL 2 to render the 3D warehouse. Try a current version of Chrome, Edge or Firefox, and make sure hardware acceleration is enabled in your browser settings.',
    );
    return;
  }

  // The profile comes first: MSAA is fixed when the graphics context is
  // created, so the saved anti-aliasing choice has to be known before that.
  const profile = new Profile();

  let engine;
  try {
    engine = new Engine(canvas, { antialias: profile.settings.antialias === 'msaa' });
  } catch (err) {
    console.error(err);
    showFatal('Could not start the 3D renderer', String(err?.message ?? err));
    return;
  }

  const graphics = new Graphics(engine);
  engine.onResize = () => graphics.onResize();

  const auth = new AuthManager(profile);
  const s0 = profile.settings;
  const audio = new AudioManager({
    enabled: s0.audio, volume: s0.volume,
    music: s0.musicVolume, voice: s0.voiceVolume, sfx: s0.sfxVolume,
  });
  const player = new PlayerController(engine.camera, canvas);
  // The trainee's own avatar, standing in the warehouse (third-person view).
  const avatarRig = new AvatarRig(engine.scene);
  const game = new GameManager({ engine, player, profile, audio });
  game.onWorldLoaded = () => graphics.onWorldLoaded();

  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* ---------------------------------------------------------------- *
   * Actions exposed to the UI
   * ---------------------------------------------------------------- */
  /**
   * Every sign-in route funnels through here, so none can skip the second
   * factor. The identity is only written to the profile *after* the code is
   * accepted: a failed or abandoned prompt leaves the existing profile exactly
   * as it was.
   */
  async function completeSignIn(identity) {
    audio.init();
    audio.resume();
    audio.startMusic();
    const finish = async () => {
      auth.commit(identity);
      await refreshCaps();
      ui.go('menu');
    };
    if (auth.needsSecondFactor(identity)) {
      ui.go('totp-challenge', {
        pending: identity,
        onSuccess: finish,
        // Backing out of a pending sign-in must not sign the owner out.
        onCancel: () => ui.go('login'),
        canUsePasskey: auth.hasPasskey && ui.caps?.passkey?.available,
      });
      return;
    }
    await finish();
  }

  /** Refresh what the login screen is allowed to offer. */
  async function refreshCaps() {
    ui.caps = await auth.capabilities();
    ui.ctx.authCaps = ui.caps;
    return ui.caps;
  }

  const actions = {
    async signInWithName({ name, avatar }) {
      await completeSignIn(auth.identityForName({ name, avatar }));
    },

    async signInWithProvider(id) {
      const identity = await auth.identityFromProvider(id);
      await completeSignIn(identity);
    },

    async signInWithPasskey() {
      const identity = await auth.identityFromPasskey();
      await completeSignIn(identity);
    },

    /**
     * Create a passkey and sign in with it in one step, straight from the
     * login screen.
     */
    async createPasskeyAndSignIn({ name, avatar }) {
      const before = { ...auth.profile.data };
      // The profile needs a name before a credential can be attached to it.
      auth.profile.signIn({ name, avatar, provider: 'passkey' });
      try {
        await auth.enrolPasskey();
      } catch (err) {
        // Put the profile back: a cancelled prompt must not sign anyone in.
        Object.assign(auth.profile.data, {
          name: before.name, avatar: before.avatar,
          authProvider: before.authProvider, email: before.email,
        });
        auth.profile.save();
        await refreshCaps();
        throw err;
      }
      await completeSignIn({ name, avatar, provider: 'passkey', email: null, method: 'passkey' });
    },

    /** Re-read auth capabilities after the provider settings change. */
    async refreshAuthCaps() {
      return refreshCaps();
    },

    /** Start the authenticator-app enrolment flow. */
    beginTotpSetup() {
      const { secret, uri } = auth.beginTotpSetup ? auth.beginTotpSetup() : auth.beginTotpEnrolment();
      ui.go('totp-setup', {
        secret,
        uri,
        onDone: async () => { await refreshCaps(); ui.go('settings'); },
        onCancel: () => ui.go('settings'),
      });
    },

    signOut() {
      auth.signOut();
      refreshCaps().then(() => ui.go('login'));
    },

    async startTrain(envId) {
      await startRound(envId, 'simple', MODE.TRAIN);
    },

    async startTest(envId, difficulty) {
      await startRound(envId, difficulty, MODE.TEST);
    },

    async retry() {
      if (!game.environmentId) return ui.go('menu');
      await startRound(game.environmentId, game.difficultyId, game.mode);
    },

    flag() { game.flag(); },
    pause() { game.pause(); },
    resume() {
      game.resume();
      if (!isTouch) actions.requestLock();
    },
    endRound() { game.end('quit'); },
    quitToMenu() {
      // Quitting a training round on purpose keeps its checkpoint, so it can
      // be picked up again from the menu.
      const snap = game.snapshot();
      game.quit();
      if (snap && Number(profile.settings.autosave)) {
        try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(snap)); } catch { /* blocked */ }
      }
      audio.setMusicDuck(false);
      game.unload();
      ui.setTouchVisible(false);
      ui.setLockPrompt(false);
      ui.go('menu');
    },
    requestLock() { player.requestLock(); },
    setTouchMove(x, y) { player.touch.move.x = x; player.touch.move.y = y; },
    touchLook(dx, dy) { player.applyTouchLook(dx, dy); },
    /**
     * Change one setting. Presets move several values at once, and moving
     * any of those values by hand turns the preset into "Custom".
     */
    setSetting(k, v) {
      if (k === 'quality') {
        if (v !== 'custom') profile.setSettings(presetPatch(v));
      } else {
        profile.setSetting(k, v);
        if (isPresetKey(k)) profile.setSetting('quality', detectPreset(profile.settings));
      }
      if (k === 'audio' || k === 'volume' || k.endsWith('Volume')) { audio.init(); audio.resume(); audio.startMusic(); }
      if (k === 'displayMode') setFullscreen(v === 'fullscreen');
      // One path for everything, so a setting can never be saved but not applied.
      applySettings();
    },
    setSettings(patch) {
      profile.setSettings(patch);
      if ('quality' in patch && patch.quality !== 'custom') profile.setSettings(presetPatch(patch.quality));
      applySettings();
    },
    closeSettingsToPause() { ui.closeSettingsToPause(); },
    /** A saved training round, if there is one to resume. */
    checkpoint() { return readCheckpoint(); },
    async resumeTraining() {
      const snap = readCheckpoint();
      if (!snap) return;
      await startRound(snap.environment, 'simple', MODE.TRAIN);
      if (game.restore(snap)) ui.toast(`Training resumed — ${snap.found.length}/${snap.total} found`, 'ok');
    },
    discardCheckpoint() { clearCheckpoint(); },
    toast(msg, kind) { ui.toast(msg, kind); },
  };

  const ui = new UIManager(document.getElementById('ui'), {
    profile,
    auth,
    actions,
    graphics,
    engine,
    player,
    onOfflineChange,
  });

  // Offline play: register the service worker, catch the install offer, and
  // tell the player when the connection comes and goes.
  initOffline({
    onOnlineChange: (on) => ui.toast(on ? 'Back online' : '📴 You are offline — the game keeps working', on ? 'ok' : ''),
  });

  // Captions: sounds as [bracketed text], spoken lines as subtitles.
  audio.onCaption = (text) => ui.caption(text);
  audio.onSpeech = (text) => ui.caption(text, { speech: true });

  /* ---------------------------------------------------------------- *
   * Round start
   * ---------------------------------------------------------------- */
  async function startRound(envId, difficulty, mode) {
    audio.init();
    audio.resume();
    audio.startMusic();
    clearCheckpoint();
    ui.enterGame({ touch: isTouch });
    try {
      await game.loadEnvironment(envId, difficulty, mode);
    } catch (err) {
      console.error('[Game] failed to load environment', err);
      bus.emit(EV.LOADING, { active: false });
      ui.toast('Could not load that environment. See the console for details.', 'error');
      ui.go('menu');
      return;
    }
    applySettings();
    game.start(mode);
    if (!isTouch) ui.setLockPrompt(true);
  }

  /**
   * Push every saved setting into the systems that consume it.
   * Called on round start and whenever the profile changes, so a setting
   * changed mid-session takes effect immediately.
   */
  let lastSink = null;
  function applySettings() {
    const s = profile.settings;
    const root = document.documentElement;

    // Audio
    audio.setEnabled(s.audio);
    audio.setVolume(s.volume);
    audio.setMix({ music: s.musicVolume, voice: s.voiceVolume, sfx: s.sfxVolume });
    if (s.outputDevice !== lastSink) { lastSink = s.outputDevice; audio.setOutputDevice(s.outputDevice); }

    // Video
    graphics.apply(s);
    ui.setFps('', !!s.showFps);

    // Controls
    player.reducedMotion = !!s.reducedMotion;
    player.headBob = !!s.headBob;
    player.cameraShake = !!s.cameraShake;
    player.invertY = !!s.invertY;
    player.lookSensitivity = s.lookSensitivity ?? 1;
    player.keybinds = s.keybinds;
    player.setView(s.cameraView);
    avatarRig.setAvatar(profile.avatar);
    if (s.reducedMotion || !s.headBob) player._bob = 0;
    game.hazards.setAimAssist((AIM_ASSIST[s.aimAssist] ?? AIM_ASSIST.off).size);

    // Gameplay and HUD
    ui.hud.applySettings(s);
    ui.setCaptionSize(s.captionSize);

    // Accessibility
    root.style.fontSize = `${16 * (Number(s.uiScale) || 1)}px`;
    root.classList.toggle('reduce-motion', !!s.reducedMotion);
    if (setColourMode(s.colourblind) !== root.dataset.cb) {
      root.dataset.cb = s.colourblind;
      const pal = palette();
      root.style.setProperty('--major', pal.major);
      root.style.setProperty('--minor', pal.minor);
      root.style.setProperty('--success', pal.success);
      root.style.setProperty('--danger', pal.danger);
      game.hazards.refreshColours();
    }
  }

  /* ---------------------------------------------------------------- *
   * Fullscreen
   * ---------------------------------------------------------------- */
  function setFullscreen(on) {
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.()?.catch?.(() => {
        profile.setSetting('displayMode', 'windowed');
        ui.toast('The browser did not allow fullscreen here.', 'error');
      });
      if (!on && document.fullscreenElement) document.exitFullscreen?.();
    } catch { /* unsupported: stay windowed */ }
  }
  // Esc or F11 leaves fullscreen without going through Settings; keep the
  // setting truthful about what the screen is actually doing.
  document.addEventListener('fullscreenchange', () => {
    const mode = document.fullscreenElement ? 'fullscreen' : 'windowed';
    if (profile.settings.displayMode !== mode) profile.setSetting('displayMode', mode);
  });

  /* ---------------------------------------------------------------- *
   * Training checkpoints
   * ---------------------------------------------------------------- */
  function readCheckpoint() {
    try {
      const snap = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || 'null');
      // A checkpoint older than a day is stale; nobody expects that back.
      if (!snap || Date.now() - (snap.savedAt ?? 0) > 864e5) return null;
      return snap;
    } catch { return null; }
  }
  function clearCheckpoint() {
    try { localStorage.removeItem(CHECKPOINT_KEY); } catch { /* storage blocked */ }
  }
  let checkpointAcc = 0;
  engine.addUpdater((dt) => {
    const every = Number(profile.settings.autosave);
    if (!every || game.mode !== MODE.TRAIN || game.state !== STATE.PLAYING) return;
    checkpointAcc += dt;
    if (checkpointAcc < every) return;
    checkpointAcc = 0;
    const snap = game.snapshot();
    if (!snap) return;
    try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(snap)); } catch { /* storage full or blocked */ }
  });

  /* ---------------------------------------------------------------- *
   * Cross-layer input
   * ---------------------------------------------------------------- */
  player.onLockChange = (locked) => {
    const playing = game.state === STATE.PLAYING;
    // Once the browser has refused pointer lock, stop asking - drag-look is
    // now the control scheme and the prompt would just be in the way.
    ui.setLockPrompt(playing && !locked && !isTouch && !player.lockFailed);
  };

  player.onLockUnavailable = () => {
    ui.setLockPrompt(false);
    ui.setDragLookMode(true);
    ui.toast('Mouse capture unavailable here — click and drag to look around.', 'error');
  };

  canvas.addEventListener('mousedown', (e) => {
    if (game.state !== STATE.PLAYING || e.button !== 0) return;
    // First click tries to capture the mouse; it must not also flag a hazard.
    if (!player.locked && !player.lockFailed) {
      player.requestLock();
      return;
    }
    if (player.locked) game.flag();
    // In drag-look mode the flag happens on mouseup, so a drag that was meant
    // to turn the camera is not mistaken for a hazard call.
  });

  canvas.addEventListener('mouseup', (e) => {
    if (game.state !== STATE.PLAYING || e.button !== 0) return;
    if (player.locked || !player.lockFailed) return;
    // A click, not a drag: treat it as flagging whatever is under the reticle.
    if (player.dragMoved < 6) game.flag();
  });

  // Losing the window mid-drag must not leave the camera stuck to the mouse.
  window.addEventListener('blur', () => { player.dragging = false; });

  document.addEventListener('keydown', (e) => {
    // Ignore while typing in a form field.
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.code === 'Escape') {
      if (ui.inPauseSettings) { e.preventDefault(); ui.closeSettingsToPause(); return; }
      if (game.state === STATE.PLAYING) { e.preventDefault(); game.pause(); }
      else if (game.state === STATE.PAUSED) { e.preventDefault(); actions.resume(); }
      return;
    }
    // Flag and Pause follow the player's own key bindings.
    const action = actionForKey(profile.settings.keybinds, e.code);
    if (action === 'flag' && game.state === STATE.PLAYING) {
      e.preventDefault();
      game.flag();
    }
    if (action === 'view' && !e.repeat && game.state === STATE.PLAYING) {
      e.preventDefault();
      switchView();
    }
    if (action === 'pause' && !e.repeat) {
      if (game.state === STATE.PLAYING) { e.preventDefault(); game.pause(); }
      else if (game.state === STATE.PAUSED && !ui.inPauseSettings) { e.preventDefault(); actions.resume(); }
    }
  });

  /* ---------------------------------------------------------------- *
   * Controller, aim assist, depth-of-field focus, footsteps
   * ---------------------------------------------------------------- */
  player.onPadFlag = () => { if (game.state === STATE.PLAYING) game.flag(); };
  player.onPadView = () => { if (game.state === STATE.PLAYING) switchView(); };

  /** V / controller Y: third person (see your avatar) or first person. Remembered. */
  function switchView() {
    const v = player.toggleView();
    profile.setSetting('cameraView', v);
    ui.toast(v === 'third' ? 'Third person — this is you.' : 'First person.', 'ok');
  }
  player.onPadPause = () => {
    if (game.state === STATE.PLAYING) game.pause();
    else if (game.state === STATE.PAUSED) actions.resume();
  };
  player.onGamepadChange = (pad) => ui.toast(pad ? '🎮 Controller connected' : 'Controller disconnected', pad ? 'ok' : '');
  player.onStep = () => { if (game.state === STATE.PLAYING) audio.footstep(); };

  engine.addUpdater((dt) => {
    player.pollGamepad(dt);
    // The avatar stands wherever the trainee is, whenever a warehouse is loaded.
    avatarRig.update(player, dt, !!game.world && player.showsAvatar, game.state === STATE.PLAYING);
    game.hazards.extraRange = player.boomLength;
    const current = game.hazards.current;
    const assist = AIM_ASSIST[profile.settings.aimAssist] ?? AIM_ASSIST.off;
    player.aimFriction = current ? assist.friction : 1;
    // Depth of field focuses on the hazard under the crosshair, or mid-distance.
    graphics.setFocusDistance(current ? current.center.distanceTo(engine.camera.position) : 8);
  });

  /* ---------------------------------------------------------------- *
   * Spoken announcements (voice volume + subtitles)
   * ---------------------------------------------------------------- */
  let warned60 = false;
  let warned30 = false;
  bus.on(EV.GAME_START, (d) => {
    warned60 = warned30 = false;
    // Show the trainee who they are: the camera opens on their avatar's face.
    avatarRig.setAvatar(profile.avatar);
    if (profile.settings.avatarIntro !== false && !d.resumed) player.playIntro();
    const me = getAvatar(profile.avatar);
    const viewKey = profile.settings.keybinds.view?.[0];
    ui.toast(`This is you — ${me.name}, ${me.role}. ${viewKey ? `Press ${keyLabel(viewKey)} to switch view.` : 'Switch view in Settings → Controls.'}`, 'ok');
    audio.setMusicDuck(true);
    audio.say(d.mode === 'train'
      ? 'Training. Follow the arrow to the first hazard.'
      : d.timed ? 'Test started. You have five minutes.' : 'Test started. There is no time limit.', { interrupt: true });
  });
  bus.on(EV.HAZARD_FOCUS, (d) => {
    if (d.kind === 'correct') audio.say(`${d.hazard.name}. ${d.hazard.severity === 'major' ? 'Major' : 'Minor'} hazard.`, { interrupt: true });
  });
  bus.on(EV.GAME_TICK, (d) => {
    if (!d.timed) return;
    if (!warned60 && d.remaining <= 60 && d.remaining > 30) { warned60 = true; audio.say('One minute remaining.'); }
    if (!warned30 && d.remaining <= 30) { warned30 = true; audio.say('Thirty seconds.'); }
  });
  bus.on(EV.TRAIN_COMPLETE, () => audio.say('Training complete. Every hazard found.'));
  bus.on(EV.GAME_END, (s) => {
    audio.setMusicDuck(false);
    clearCheckpoint();
    audio.say(`Round over. ${s.score} points. ${s.rank.label}.`, { interrupt: true });
  });

  // Auto-pause when the tab is hidden - a reaction clock running in a
  // background tab would be unfair and confusing.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === STATE.PLAYING) game.pause();
  });

  bus.on(EV.PROFILE_CHANGED, () => applySettings());

  /* ---------------------------------------------------------------- *
   * Performance overlay
   * ---------------------------------------------------------------- */
  let fpsAcc = 0;
  engine.addUpdater((dt) => {
    if (!profile.settings.showFps) return;
    fpsAcc += dt;
    if (fpsAcc < 0.4) return;
    fpsAcc = 0;
    const info = engine.renderer.info;
    ui.setFps(
      `${engine.fps.toFixed(0)} fps · ${info.render.calls} calls · ${(info.render.triangles / 1000).toFixed(0)}k tris · ${info.memory.geometries} geo`,
      true,
    );
  });

  engine.onContextLost = () => {
    ui.toast('Graphics context lost. Attempting to recover…', 'error');
    game.pause();
  };

  /* ---------------------------------------------------------------- *
   * Go
   * ---------------------------------------------------------------- */
  engine.start();

  // Decide the opening screen only after we know what auth can offer, and
  // after any OAuth redirect has been consumed.
  (async () => {
    const redirected = await auth.identityFromRedirect();
    await refreshCaps();
    if (redirected) {
      await completeSignIn(redirected);
      return;
    }
    if (!profile.isSignedIn) { ui.go('login'); return; }
    // A returning trainee with 2FA on still has to present a code. Here the
    // profile already belongs to them, so cancelling does sign them out.
    if (auth.hasTotp) {
      ui.go('totp-challenge', {
        onSuccess: () => ui.go('menu'),
        onCancel: () => actions.signOut(),
        canUsePasskey: auth.hasPasskey && ui.caps?.passkey?.available,
      });
    } else {
      ui.go('menu');
    }
  })();

  // Expose a small surface for manual QA in the browser console.
  window.BTH = { engine, game, player, profile, audio, ui, bus, EV, auth, graphics };
  applySettings();
  document.getElementById('boot-fallback')?.remove();
  console.info('[Beat The Hazard] ready. window.BTH exposes the running systems.');
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function showFatal(title, message) {
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;inset:0;display:grid;place-items:center;padding:2rem;background:#0b0f14;color:#e9eef4;font-family:system-ui,sans-serif;z-index:999';
  d.innerHTML = `<div style="max-width:520px;text-align:center">
    <h1 style="color:#f2b90c;margin:0 0 .8rem;font-size:1.5rem">${title}</h1>
    <p style="color:#97a4b2;line-height:1.6;margin:0">${message}</p>
  </div>`;
  document.body.append(d);
}

// Surface unexpected errors instead of failing silently in a black canvas.
window.addEventListener('error', (e) => console.error('[Uncaught]', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => console.error('[Unhandled rejection]', e.reason));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
