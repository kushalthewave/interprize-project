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

    this.chipTimer = el('div.hud-chip', {}, [el('span.k', { text: 'Reaction clock' }), this.elTimer]);
    this.chipScore = el('div.hud-chip', {}, [el('span.k', { text: 'Score' }), this.elScore]);
    this.chipFound = el('div.hud-chip.wide', {}, [
      el('span.k', { text: 'Hazards found' }),
      this.elFound,
      el('div.progress-track', {}, [this.elProgFill]),
    ]);
    this.comboBadge = el('div.combo-badge', { hidden: true }, ['🔥 COMBO', el('span', { text: '' })]);
    this.comboCount = this.comboBadge.lastChild;

    this.topBar = el('div.hud-top', {}, [
      el('div.hud-group', {}, [
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

    // --- controls hint
    this.hint = el('div.controls-hint', {}, [
      el('span', { html: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move' }),
      el('span', { html: '<kbd>Mouse</kbd> Look' }),
      el('span', { html: '<kbd>Shift</kbd> Run' }),
      el('span', { html: '<kbd>C</kbd> Crouch' }),
      el('span', { html: '<kbd>E</kbd> / <kbd>Click</kbd> Flag hazard' }),
      el('span', { html: '<kbd>Esc</kbd> Pause' }),
    ]);

    this.el = el('div#hud', { hidden: true }, [
      this.topBar,
      this.reticle,
      this.targetLabel,
      this.feedback,
      this.trainPanel,
      this.hint,
    ]);
    this.root.append(this.el);
  }

  _wire() {
    const on = (ev, fn) => this._subs.push(bus.on(ev, fn));

    on(EV.GAME_START, (d) => {
      this.elMode.textContent = d.mode === 'train' ? 'TRAIN' : 'TEST';
      this.elDiff.textContent = d.difficulty
        ? d.difficulty[0].toUpperCase() + d.difficulty.slice(1)
        : '—';
      this.showHazardCount = d.showHazardCount;
      this.total = d.totalHazards;
      this.elFound.textContent = d.showHazardCount ? `0/${d.totalHazards}` : '0';
      this.chipFound.querySelector('.k').textContent = d.showHazardCount
        ? 'Hazards found' : 'Hazards found (total hidden)';
      this.elScore.textContent = '0';
      this.elTimer.textContent = Timer.format(d.secondsPerHazard);
      this.comboBadge.hidden = true;
      this.feedback.hidden = true;
      this.trainPanel.hidden = d.mode !== 'train';
      if (d.mode === 'train') {
        this._renderTrainPanel({ index: 0, total: d.totalHazards, next: null, started: true });
      }
      this.show();
    });

    on(EV.GAME_TICK, (d) => {
      this.elTimer.textContent = Timer.format(d.hazardRemaining);
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
      this._card({
        kind: 'expired',
        title: '⏱ Time up on that hazard',
        body: `The clock ran out. "${d.name}" is still out there - keep looking.`,
      });
    });
    on(EV.TRAIN_STEP, (d) => this._renderTrainPanel(d));
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

  _card({ kind, title, points, body, tip, extra, severity, combo, train, keywords }) {
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
      el('div.fb-body', { text: body }),
      extra && el('div.faint', { text: extra, style: { marginTop: '0.4rem' } }),
      train && el('div.fb-body', { text: train, style: { marginTop: '0.55rem' } }),
      tip && el('div.fb-tip', {}, [el('strong', { text: 'Safe practice: ' }), tip]),
      keywords?.length &&
        el('div.kw', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' } },
          keywords.map((k) => el('span.stat-pill', { text: k }))),
    );
    f.hidden = false;

    clearTimeout(this._feedbackTimer);
    // Correct finds in Train Mode linger - they are the teaching moment.
    const dwell = kind === 'correct' ? (train ? 11000 : 7000) : 6000;
    this._feedbackTimer = setTimeout(() => { f.hidden = true; }, dwell);
  }

  _renderTrainPanel(d) {
    this.trainPanel.hidden = false;

    // Three distinct states. `next == null` alone does NOT mean "finished" -
    // at round start nothing has been found yet and there is no "next" to
    // name, which previously showed "Training complete" on the opening frame.
    const complete = !d.started && d.next == null && d.index >= d.total && d.total > 0;

    mount(
      this.trainPanel,
      el('div.tp-k', { text: `Training · ${d.index}/${d.total} learned` }),
      el('h4', {
        text: complete ? '🎓 Training complete' : d.next ? 'Find the next hazard' : 'Explore the warehouse',
      }),
      el('p', {
        text: complete
          ? 'You have identified every hazard in this environment. Test Mode is now unlocked.'
          : d.next
            ? (d.next.hint ?? 'Look for anything physically wrong: an obstruction, damage, instability, or a person in the wrong place.')
            : 'Walk around and look for anything physically wrong. Glowing rings mark the hazards you have not found yet — look at one and press E to flag it.',
      }),
      d.next && !complete && el('div.kw', {}, [el('span', { text: d.next.name })]),
    );
  }

  show() { this.el.hidden = false; }
  hide() { this.el.hidden = true; this.targetLabel.hidden = true; this.feedback.hidden = true; }

  setTouchMode(on) {
    this.hint.style.display = on ? 'none' : '';
  }

  dispose() {
    for (const off of this._subs) off();
    this._subs = [];
    clearTimeout(this._feedbackTimer);
    this.el.remove();
  }
}
