/**
 * main.js
 * Application entry point. Wires the engine, player, game manager, audio,
 * profile and UI together, and owns the input bindings that cross layers
 * (Esc to pause, E/click to flag).
 */
import './ui/styles.css';
import { Engine } from './core/Engine.js';
import { PlayerController } from './player/PlayerController.js';
import { GameManager, MODE, STATE } from './gameplay/GameManager.js';
import { Profile } from './services/Profile.js';
import { AuthManager } from './services/auth/AuthManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIManager } from './ui/UIManager.js';
import { bus, EV } from './core/EventBus.js';
import { PLAYER } from './data/config.js';

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

  let engine;
  try {
    engine = new Engine(canvas);
  } catch (err) {
    console.error(err);
    showFatal('Could not start the 3D renderer', String(err?.message ?? err));
    return;
  }

  const profile = new Profile();
  const auth = new AuthManager(profile);
  const audio = new AudioManager({
    enabled: profile.settings.audio,
    volume: profile.settings.volume,
  });
  const player = new PlayerController(engine.camera, canvas);
  const game = new GameManager({ engine, player, profile, audio });

  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* ---------------------------------------------------------------- *
   * Actions exposed to the UI
   * ---------------------------------------------------------------- */
  /**
   * After any successful sign-in, require the second factor if one is enrolled,
   * then land on the menu. One funnel, so no route can skip 2FA.
   */
  async function completeSignIn() {
    audio.init();
    audio.resume();
    if (auth.hasTotp) {
      ui.go('totp-challenge', { onSuccess: () => ui.go('menu') });
      return;
    }
    ui.go('menu');
  }

  /** Refresh what the login screen is allowed to offer. */
  async function refreshCaps() {
    ui.caps = await auth.capabilities();
    ui.ctx.authCaps = ui.caps;
    return ui.caps;
  }

  const actions = {
    async signInWithName({ name, avatar }) {
      auth.signInWithName({ name, avatar });
      await completeSignIn();
    },

    async signInWithProvider(id) {
      const account = await auth.signInWithProvider(id);
      ui.toast(`Signed in as ${account.name}`, 'ok');
      await completeSignIn();
    },

    async signInWithPasskey() {
      await auth.signInWithPasskey();
      ui.toast('Unlocked with your passkey', 'ok');
      await completeSignIn();
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
      game.quit();
      game.unload();
      ui.setTouchVisible(false);
      ui.setLockPrompt(false);
      ui.go('menu');
    },
    requestLock() { player.requestLock(); },
    setTouchMove(x, y) { player.touch.move.x = x; player.touch.move.y = y; },
    touchLook(dx, dy) { player.applyTouchLook(dx, dy); },
    setSetting(k, v) {
      profile.setSetting(k, v);
      if (k === 'audio') audio.init();
      // One path for everything, so a setting can never be saved but not applied.
      applySettings();
    },
    toast(msg, kind) { ui.toast(msg, kind); },
  };

  const ui = new UIManager(document.getElementById('ui'), {
    profile,
    auth,
    actions,
  });

  /* ---------------------------------------------------------------- *
   * Round start
   * ---------------------------------------------------------------- */
  async function startRound(envId, difficulty, mode) {
    audio.init();
    audio.resume();
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
  function applySettings() {
    const s = profile.settings;
    audio.setEnabled(s.audio);
    audio.setVolume(s.volume);
    player.reducedMotion = !!s.reducedMotion;
    player.invertY = !!s.invertY;
    player.lookSensitivity = s.lookSensitivity ?? 1;
    if (s.reducedMotion) player._bob = 0;
    ui.setFps('', !!s.showFps);
  }

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
      if (game.state === STATE.PLAYING) { e.preventDefault(); game.pause(); }
      else if (game.state === STATE.PAUSED) { e.preventDefault(); actions.resume(); }
      return;
    }
    if (e.code === 'KeyE' && game.state === STATE.PLAYING) {
      e.preventDefault();
      game.flag();
    }
    if (e.code === 'KeyP' && game.state === STATE.PLAYING) {
      e.preventDefault();
      game.pause();
    }
  });

  // Auto-pause when the tab is hidden - a reaction clock running in a
  // background tab would be unfair and confusing.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === STATE.PLAYING) game.pause();
  });

  // Invert-Y support, applied at the source so every input path respects it.
  const rawApplyLook = player._onMouseMove;
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
    const redirected = await auth.completeRedirectSignIn();
    await refreshCaps();
    if (redirected) {
      ui.toast(`Signed in as ${redirected.name}`, 'ok');
      await completeSignIn();
      return;
    }
    if (!profile.isSignedIn) { ui.go('login'); return; }
    // A returning trainee with 2FA on still has to present a code.
    if (auth.hasTotp) ui.go('totp-challenge', { onSuccess: () => ui.go('menu') });
    else ui.go('menu');
  })();

  // Expose a small surface for manual QA in the browser console.
  window.BTH = { engine, game, player, profile, audio, ui, bus, EV, auth };
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
