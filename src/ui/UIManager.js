/**
 * UIManager.js
 * Screen router, overlays (loading / pause / click-to-play), toasts and the
 * touch control layer. Owns all DOM outside the canvas.
 */
import { el, mount } from './dom.js';
import { bus, EV } from '../core/EventBus.js';
import { HUD } from './HUD.js';
import * as Screens from './Screens.js';
import { ACHIEVEMENTS } from '../data/config.js';

const LOADING_TIPS = [
  'Major hazards - vehicles, racking, edges - are the ones that kill. Prioritise them.',
  'A spill with a sign and cones is being managed. An unmarked one is the hazard.',
  'Blind corners are hazards created by layout. Look for a missing mirror.',
  'Compare a suspect pallet with the ones beside it. Difference is the clue.',
  'Three correct finds in a row starts a combo and adds bonus points.',
  'Scan low, then eye level, then above head height. Systematic beats wandering.',
];

export class UIManager {
  /**
   * @param {HTMLElement} root
   * @param {object} ctxBase  { profile, actions, googleClientId }
   */
  constructor(root, ctxBase) {
    this.root = root;
    this.ctx = { ...ctxBase, go: (s, p) => this.go(s, p) };

    this.screenHost = el('div#screens');
    this.toasts = el('div#toasts');
    this.root.append(this.screenHost, this.toasts);

    this.hud = new HUD(this.root);
    this._buildOverlays();
    this._buildTouch();

    this.current = null;
    this.currentParams = {};
    this._subs = [];
    this._wire();
  }

  /* ---------------------------------------------------------------- *
   * Overlays
   * ---------------------------------------------------------------- */

  _buildOverlays() {
    // loading
    this.loadLabel = el('div.load-label', { text: 'Loading…' });
    this.loadFill = el('div', { style: { width: '0%' } });
    this.loadTip = el('div.load-tip');
    this.loading = el('div.overlay', { hidden: true }, [
      el('div.spinner'),
      this.loadLabel,
      el('div.load-bar', {}, [this.loadFill]),
      this.loadTip,
    ]);

    // click-to-play (pointer lock needs a user gesture)
    this.clickPrompt = el('div.click-prompt', { hidden: true }, [
      el('div.box', {}, [
        el('div.big', { text: 'Click to look around' }),
        el('div.small', { text: 'WASD to move · Mouse to look · E or click to flag a hazard · Esc to pause' }),
      ]),
    ]);
    this.clickPrompt.addEventListener('click', () => this.ctx.actions.requestLock());

    // pause
    this.pause = el('div.overlay', { hidden: true }, [
      el('div.card.pause-menu.stack', {}, [
        el('h2', { text: 'Paused' }),
        el('button.btn.btn-primary.btn-block', { text: 'Resume', on: { click: () => this.ctx.actions.resume() } }),
        el('button.btn.btn-block', { text: 'Restart round', on: { click: () => this.ctx.actions.retry() } }),
        el('button.btn.btn-block', { text: 'End round & see results', on: { click: () => this.ctx.actions.endRound() } }),
        el('button.btn.btn-ghost.btn-block', { text: 'Quit to menu', on: { click: () => this.ctx.actions.quitToMenu() } }),
        el('div.faint.center', { text: 'Press Esc again to resume' }),
      ]),
    ]);

    this.fps = el('div', {
      style: {
        position: 'absolute', bottom: '0.5rem', right: '0.6rem',
        font: '600 11px/1.4 monospace', color: 'var(--text-faint)',
        background: 'rgba(0,0,0,0.5)', padding: '0.3rem 0.5rem', borderRadius: '5px',
        pointerEvents: 'none',
      },
      hidden: true,
    });

    this.root.append(this.clickPrompt, this.loading, this.pause, this.fps);
  }

  /* ---------------------------------------------------------------- *
   * Touch controls
   * ---------------------------------------------------------------- */

  _buildTouch() {
    const mkStick = (side) => {
      const stick = el('div.stick', { hidden: true }, [el('div.knob')]);
      const zone = el(`div.stick-zone.${side}`, {}, [stick]);
      return { zone, stick, knob: stick.firstChild };
    };
    this.left = mkStick('left');
    this.right = mkStick('right');

    this.flagBtn = el('button.touch-btn', { text: 'FLAG', 'aria-label': 'Flag hazard' });
    this.pauseBtn = el('button.touch-btn.secondary', { text: 'MENU', 'aria-label': 'Pause' });

    this.touch = el('div#touch', { hidden: true }, [
      this.left.zone, this.right.zone, this.flagBtn, this.pauseBtn,
    ]);
    this.root.append(this.touch);

    this.flagBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.ctx.actions.flag(); });
    this.flagBtn.addEventListener('click', () => this.ctx.actions.flag());
    this.pauseBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.ctx.actions.pause(); });
    this.pauseBtn.addEventListener('click', () => this.ctx.actions.pause());

    this._bindStick(this.left, (dx, dy, id) => {
      this.ctx.actions.setTouchMove(dx, -dy);
    });
    this._bindStick(this.right, (dx, dy, id, raw) => {
      this.ctx.actions.touchLook(raw.dx, raw.dy);
    }, true);
  }

  _bindStick(s, onMove, isLook = false) {
    let id = null;
    let ox = 0;
    let oy = 0;
    let lx = 0;
    let ly = 0;
    const R = 54;

    const start = (e) => {
      if (id !== null) return;
      const t = e.changedTouches[0];
      id = t.identifier;
      ox = lx = t.clientX;
      oy = ly = t.clientY;
      const r = s.zone.getBoundingClientRect();
      s.stick.style.left = `${ox - r.left}px`;
      s.stick.style.top = `${oy - r.top}px`;
      s.stick.hidden = false;
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        const dx = t.clientX - ox;
        const dy = t.clientY - oy;
        const raw = { dx: t.clientX - lx, dy: t.clientY - ly };
        lx = t.clientX;
        ly = t.clientY;
        const d = Math.min(R, Math.hypot(dx, dy));
        const a = Math.atan2(dy, dx);
        s.knob.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
        onMove(Math.cos(a) * (d / R), Math.sin(a) * (d / R), id, raw);
        e.preventDefault();
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        id = null;
        s.stick.hidden = true;
        s.knob.style.transform = '';
        if (!isLook) this.ctx.actions.setTouchMove(0, 0);
      }
    };
    s.zone.addEventListener('touchstart', start, { passive: false });
    s.zone.addEventListener('touchmove', move, { passive: false });
    s.zone.addEventListener('touchend', end);
    s.zone.addEventListener('touchcancel', end);
  }

  setTouchVisible(v) {
    this.touch.hidden = !v;
    this.hud.setTouchMode(v);
  }

  /* ---------------------------------------------------------------- *
   * Events
   * ---------------------------------------------------------------- */

  _wire() {
    const on = (e, f) => this._subs.push(bus.on(e, f));

    on(EV.LOADING, (d) => {
      if (d.active) {
        this.loading.hidden = false;
        this.loadLabel.textContent = d.label ?? 'Loading…';
        this.loadFill.style.width = `${Math.round((d.progress ?? 0) * 100)}%`;
        if (!this._tipShown) {
          this.loadTip.textContent = `💡 ${LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]}`;
          this._tipShown = true;
        }
      } else {
        this.loading.hidden = true;
        this._tipShown = false;
      }
    });

    on(EV.GAME_PAUSE, () => { this.pause.hidden = false; this.clickPrompt.hidden = true; });
    on(EV.GAME_RESUME, () => { this.pause.hidden = true; });
    on(EV.GAME_END, (summary) => {
      this.pause.hidden = true;
      this.clickPrompt.hidden = true;
      this.setTouchVisible(false);
      this.go('results', { summary });
    });

    on(EV.ACHIEVEMENT, (a) => {
      if (a) this.toast(`${a.icon} ${a.label} unlocked`, 'achievement');
    });
    on(EV.TOAST, (t) => this.toast(t.message, t.kind));
    on(EV.COMBO_START, () => this.toast('🔥 Combo started', 'achievement'));
  }

  /* ---------------------------------------------------------------- *
   * Routing
   * ---------------------------------------------------------------- */

  go(screen, params = {}) {
    this.current = screen;
    this.currentParams = params;
    const c = this.ctx;

    let node;
    switch (screen) {
      case 'login': node = Screens.loginScreen(c); break;
      case 'menu': node = Screens.menuScreen(c); break;
      case 'environments': node = Screens.environmentScreen(c, { mode: 'test' }); break;
      case 'train-select': node = Screens.environmentScreen(c, { mode: 'train' }); break;
      case 'test-select': node = Screens.environmentScreen(c, { mode: 'test' }); break;
      case 'difficulty': node = Screens.difficultyScreen(c, params); break;
      case 'results': node = Screens.resultsScreen(c, params); break;
      case 'profile': node = Screens.profileScreen(c); break;
      case 'progress': node = Screens.progressScreen(c); break;
      case 'guide': node = Screens.guideScreen(c); break;
      case 'settings': node = Screens.settingsScreen(c); break;
      case 'game': node = null; break;
      default:
        console.warn('[UI] unknown screen', screen);
        node = Screens.menuScreen(c);
    }

    mount(this.screenHost, node);
    this.screenHost.hidden = !node;
    bus.emit(EV.SCREEN_CHANGE, { screen, params });

    // focus the first control for keyboard users
    if (node) {
      const first = node.querySelector('button, input, [tabindex]');
      first?.focus?.({ preventScroll: true });
    }
    return node;
  }

  /** Hide all menus and show the game overlay. */
  enterGame({ touch = false } = {}) {
    this.screenHost.hidden = true;
    mount(this.screenHost);
    this.pause.hidden = true;
    this.setTouchVisible(touch);
    this.clickPrompt.hidden = touch;
  }

  setLockPrompt(visible) {
    this.clickPrompt.hidden = !visible;
  }

  toast(message, kind = '') {
    const t = el(`div.toast${kind ? `.${kind}` : ''}`, { text: message });
    this.toasts.append(t);
    setTimeout(() => {
      t.style.transition = 'opacity 0.3s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 320);
    }, 3200);
  }

  setFps(text, visible) {
    this.fps.hidden = !visible;
    if (visible) this.fps.textContent = text;
  }

  dispose() {
    for (const off of this._subs) off();
    this.hud.dispose();
  }
}
