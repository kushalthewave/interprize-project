/**
 * HUD.js
 * The in-game overlay: score, reaction clock, hazard progress, combo, mode
 * badge, reticle, target label, feedback cards and the Train Mode panel.
 *
 * The HUD subscribes to the event bus - it never reaches into GameManager.
 * Everything is positioned around the edges so the warehouse view stays clear.
 */
import { el, mount, secs } from './dom.js';
import { bus, EV } from '../core/EventBus.js';
import { Timer } from '../gameplay/Timer.js';
import { avatarNode, getAvatar } from './avatars.js';

export class HUD {
  constructor(root) {
    this.root = root;
    this._subs = [];
    this._feedbackTimer = null;
    this._build();
    this._wire();
    this.hide();
  }

  _build() {
    // --- top bar
    this.elScore = el('span.v', { text: '0' });
    this.elTimer = el('span.v', { text: '--:--' });
    this.elFound = el('span.v', { text: '0/0' });
    this.elMode = el('span.v', { text: 'TEST' });
    this.elDiff = el('span.v', { text: 'Simple' });
    this.elProgFill = el('div.progress-fill', { style: { width: '0%' } });

    this.chipTimer = el('div.hud-chip.hud-clock', {}, [el('span.k', { text: 'Time left' }), this.elTimer]);
    this.chipScore = el('div.hud-chip', {}, [el('span.k', { text: 'Score' }), this.elScore]);
    this.chipFound = el('div.hud-chip.wide', {}, [
      el('span.k', { text: 'Hazards found' }),
      this.elFound,
      el('div.progress-track', {}, [this.elProgFill]),
    ]);
    this.comboBadge = el('div.combo-badge', { hidden: true }, ['🔥 COMBO', el('span', { text: '' })]);
    this.comboCount = this.comboBadge.lastChild;

    // Who is playing — your own avatar, in the corner, the whole round.
    this.playerCard = el('div.hud-player');

    this.topBar = el('div.hud-top', {}, [
      el('div.hud-group', {}, [
        this.playerCard,
        el('div.hud-chip', {}, [el('span.k', { text: 'Mode' }), this.elMode]),
        el('div.hud-chip', {}, [el('span.k', { text: 'Difficulty' }), this.elDiff]),
      ]),
      el('div.hud-group', {}, [this.comboBadge, this.chipFound, this.chipScore, this.chipTimer]),
    ]);

    // --- reticle + target label
    this.reticle = el('div.reticle', {}, [el('div.dot')]);
    this.targetLabel = el('div.target-label', { hidden: true }, [
      el('span', { text: '' }),
      el('span.key', { text: 'E' }),
    ]);
    this.targetLabelText = this.targetLabel.firstChild;

    // --- feedback card
    this.feedback = el('div.feedback', { hidden: true });

    // --- train panel
    this.trainPanel = el('div.train-panel', { hidden: true });

    // --- train guide: which way, how far, and where
    this.guideArrow = el('div.guide-arrow', {}, [el('div.guide-arrow-head')]);
    this.guideDist = el('div.guide-dist', { text: '' });
    this.guideName = el('div.guide-name', { text: '' });
    this.guideWhere = el('div.guide-where', { text: '' });
    this.guide = el('div.train-guide', { hidden: true, role: 'status', 'aria-live': 'off' }, [
      el('div.guide-dial', {}, [this.guideArrow]),
      el('div.guide-text', {}, [this.guideDist, this.guideName, this.guideWhere]),
    ]);

    // --- controls hint
    this.hint = el('div.controls-hint', {}, [
      el('span', { html: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move' }),
      el('span', { html: '<kbd>Mouse</kbd> Look' }),
      el('span', { html: '<kbd>Shift</kbd> Run' }),
      el('span', { html: '<kbd>C</kbd> Crouch' }),
      el('span', { html: '<kbd>E</kbd> / <kbd>Click</kbd> Flag hazard' }),
      el('span', { html: '<kbd>V</kbd> Switch view' }),
      el('span', { html: '<kbd>Esc</kbd> Pause' }),
    ]);

    this.el = el('div#hud', { hidden: true }, [
      this.topBar,
      this.reticle,
      this.targetLabel,
      this.feedback,
      this.trainPanel,
      this.guide,
      this.hint,
    ]);
    this.root.append(this.el);
  }

  _wire() {
    const on = (ev, fn) => this._subs.push(bus.on(ev, fn));

    on(EV.GAME_START, (d) => {
      this.elMode.textContent = d.mode === 'train' ? 'TRAIN' : 'TEST';
      // Train Mode always uses the gentle presentation, so naming a
      // difficulty there was misleading.
      this.elDiff.textContent = d.mode === 'train'
        ? 'Guided'
        : d.difficulty ? d.difficulty[0].toUpperCase() + d.difficulty.slice(1) : '—';
      this.showHazardCount = d.showHazardCount;
      this.total = d.totalHazards;
      this.elFound.textContent = d.showHazardCount ? `0/${d.totalHazards}` : '0';
      this.chipFound.querySelector('.k').textContent = d.showHazardCount
        ? 'Hazards found' : 'Hazards found (total hidden)';
      this.elScore.textContent = '0';
      this.mode = d.mode;
      this.timed = d.mode === 'test' && d.timed !== false;
      // Train Mode has no clock, so it shows no clock. Test Mode counts the
      // five minutes down; untimed practice counts up.
      this.chipTimer.hidden = d.mode === 'train';
      this.chipTimer.querySelector('.k').textContent = this.timed ? 'Time left' : 'Time (untimed)';
      this.elTimer.textContent = this.timed ? Timer.format(d.timeLimit ?? 0) : '00:00';
      this.chipTimer.classList.remove('warn', 'crit');
      this.comboBadge.hidden = true;
      this.feedback.hidden = true;
      this.trainPanel.hidden = d.mode !== 'train';
      this.guide.hidden = true;
      this._renderPlayer(d.player);
      this.show();
    });

    on(EV.GAME_TICK, (d) => {
      // The whole round counts down in a test; untimed practice counts up
      // instead, because a frozen "600:00" told the player nothing.
      this.elTimer.textContent = this.timed
        ? Timer.format(d.remaining)
        : Timer.format(d.elapsed ?? 0);
      this.chipTimer.classList.toggle('warn', d.warning && !d.critical);
      this.chipTimer.classList.toggle('crit', d.critical);
      this.elScore.textContent = String(d.score);
      this.elFound.textContent = this.showHazardCount
        ? `${d.progress.found}/${d.progress.total}`
        : String(d.progress.found);
      this.elProgFill.style.width = `${(d.progress.found / Math.max(1, d.progress.total)) * 100}%`;
      if (d.combo) {
        this.comboBadge.hidden = false;
        this.comboCount.textContent = `x${d.streak}`;
      } else {
        this.comboBadge.hidden = true;
      }
    });

    on(EV.HAZARD_TARGET, (t) => {
      const active = !!t;
      this.reticle.classList.toggle('active', active);
      if (t && !t.decoy) {
        this.targetLabelText.textContent = 'Flag this hazard';
        this.targetLabel.hidden = false;
      } else if (t && t.decoy) {
        this.targetLabelText.textContent = 'Flag this';
        this.targetLabel.hidden = false;
      } else {
        this.targetLabel.hidden = true;
      }
    });

    on(EV.HAZARD_FOCUS, (d) => this._showFeedback(d));
    on(EV.HAZARD_EXPIRED, (d) => {
      // Deliberately does not name a hazard: when the clock expires we cannot
      // know which one the player was hunting, so naming one was misleading.
      const n = d.remaining ?? 0;
      this._card({
        kind: 'expired',
        title: '⏱ Slow search — combo reset',
        body: `That one took a while, so your combo has reset. ${n} hazard${n === 1 ? '' : 's'} still to find — keep going.`,
      });
    });
    on(EV.TRAIN_STEP, (d) => this._renderTrainPanel(d));
    on(EV.TRAIN_GUIDE, (d) => this._renderGuide(d));
    on(EV.GAME_END, () => this.hide());
  }

  _showFeedback(d) {
    if (d.kind === 'correct') {
      const h = d.hazard;
      this._card({
        kind: 'correct',
        title: `✓ ${h.name}`,
        points: `+${d.points}`,
        severity: h.severity,
        location: d.where,
        body: h.whyDangerous,
        tip: h.safetyTip,
        extra: d.fast ? 'Fast response bonus' : null,
        combo: d.combo,
        train: d.mode === 'train' ? h.trainExplanation : null,
        keywords: d.mode === 'train' ? h.keywords : null,
      });
    } else {
      this._card({
        kind: 'wrong',
        title: '✗ Not a hazard',
        points: '+0',
        body: d.reason,
      });
    }
  }

  _card({ kind, title, points, body, tip, extra, severity, combo, train, keywords, location }) {
    const f = this.feedback;
    f.className = `feedback ${kind === 'correct' ? '' : kind}`.trim();
    mount(
      f,
      el('div.fb-head', {}, [
        el('span.fb-title', { text: title }),
        severity && el(`span.tag.tag-${severity}`, { text: severity }),
        combo && el('span.tag.tag-minor', { text: 'combo' }),
        points && el('span.fb-points', { text: points }),
      ]),
      location && el('div.fb-where', {}, ['📍 ', location]),
      el('div.fb-body', { text: body }),
      extra && el('div.faint', { text: extra, style: { marginTop: '0.4rem' } }),
      train && el('div.fb-body', { text: train, style: { marginTop: '0.55rem' } }),
      tip && el('div.fb-tip', {}, [el('strong', { text: 'Safe practice: ' }), tip]),
      // Keywords used to render as unlabelled grey pills on a dark panel -
      // present in the DOM but effectively invisible. They now get a heading
      // and their own high-contrast styling.
      keywords?.length &&
        el('div.fb-keywords', {}, [
          el('span.fb-kw-label', { text: 'Remember' }),
          el('div.fb-kw-list', {}, keywords.map((k) => el('span.kw-chip', { text: k }))),
        ]),
    );
    f.hidden = false;

    clearTimeout(this._feedbackTimer);
    // Correct finds in Train Mode linger - they are the teaching moment.
    const dwell = kind === 'correct' ? (train ? 11000 : 7000) : 6000;
    this._feedbackTimer = setTimeout(() => { f.hidden = true; }, dwell);
  }

  _renderTrainPanel(d) {
    this.trainPanel.hidden = false;

    // `next == null` alone does NOT mean "finished" — it also happens before
    // anything is loaded. Finished means every hazard counted as learned.
    const complete = d.next == null && d.total > 0 && d.index >= d.total;
    if (complete) this.guide.hidden = true;

    const sev = d.next?.severity;
    mount(
      this.trainPanel,
      el('div.tp-k', { text: `Training · ${d.index}/${d.total} found` }),
      el('h4', {
        text: complete ? '🎓 Training complete' : d.index === 0 ? 'Your first hazard' : 'Next hazard',
      }),
      d.next && !complete && el('div.tp-target', {}, [
        el('span', { text: d.next.name }),
        sev && el(`span.tag.tag-${sev}`, { text: sev }),
      ]),
      // Where to go, in words, from the very first frame.
      d.next?.where && !complete &&
        el('div.tp-where', {}, [el('span.tp-pin', { text: '📍' }), d.next.where]),
      el('p.tp-hint', {
        text: complete
          ? 'You found every hazard in this warehouse. When you are ready, try Test Mode — five minutes, no guide and no locations.'
          : d.next
            ? (d.next.hint ?? 'Follow the arrow and the column of light. When you can see the hazard, aim at it and press E.')
            : 'Walk around and look for anything physically wrong.',
      }),
    );
  }

  /** Train Mode compass: which way to turn, and how far to walk. */
  _renderGuide(d) {
    if (this.mode !== 'train') return;
    this.guide.hidden = false;
    this.guideArrow.style.transform = `rotate(${(-d.angle * 180) / Math.PI}deg)`;
    const m = Math.round(d.distance);
    const close = d.distance < 4;
    this.guide.classList.toggle('close', close);
    this.guide.classList.toggle('major', d.severity === 'major');
    this.guideDist.textContent = close ? 'Right here — look around' : `${m} m`;
    this.guideName.textContent = d.name;
    this.guideWhere.textContent = d.where ?? '';
    this.guideWhere.hidden = !d.where;
  }

  _renderPlayer(player) {
    if (!player) { this.playerCard.hidden = true; return; }
    const a = getAvatar(player.avatar);
    this.playerCard.hidden = false;
    mount(
      this.playerCard,
      avatarNode(a.id, { size: 44, badge: false }),
      el('div.hp-text', {}, [
        el('span.hp-name', { text: player.name }),
        el('span.hp-role', { text: a.role }),
      ]),
    );
  }

  /**
   * Crosshair style, size and colour, and whether hints are shown. Applied
   * as data attributes and CSS variables so the reticle stays pure CSS.
   */
  applySettings({ crosshairStyle = 'crossdot', crosshairSize = 1, crosshairColour = 'white', showHints = true, hudScale = 1 } = {}) {
    const colours = {
      white: 'rgba(255, 255, 255, 0.88)', amber: '#f2b90c', green: '#4ade80',
      cyan: '#22d3ee', magenta: '#e879f9',
    };
    this.el.dataset.xh = crosshairStyle;
    this.el.style.setProperty('--xh-size', String(crosshairSize));
    this.el.style.setProperty('--xh-colour', colours[crosshairColour] ?? colours.white);
    this.el.style.setProperty('--hud-scale', String(hudScale));
    this.showHints = showHints;
    this.hint.hidden = !showHints || this._touchMode;
    this.trainPanel.classList.toggle('no-hints', !showHints);
  }

  show() { this.el.hidden = false; }
  hide() {
    this.el.hidden = true;
    this.targetLabel.hidden = true;
    this.feedback.hidden = true;
    this.guide.hidden = true;
  }

  setTouchMode(on) {
    this._touchMode = on;
    this.hint.hidden = on || this.showHints === false;
  }

  dispose() {
    for (const off of this._subs) off();
    this._subs = [];
    clearTimeout(this._feedbackTimer);
    this.el.remove();
  }
}
