/**
 * ScoreManager.js
 * Pure scoring/combo/statistics logic. No Three.js, no DOM - which is exactly
 * why it is the part of the game with real unit tests (tests/score.test.js).
 *
 * Rules implemented (all values come from data/config.js):
 *   major hazard  fast +15  slow +7
 *   minor hazard  fast +5   slow +2
 *   wrong flag     0 points (configurable penalty) + a safety tip
 *   combo          3 correct in a row -> combo active, +comboBonus per find
 *   difficulty     final score is multiplied by the difficulty multiplier
 */
import { SCORING, rankForScore } from '../data/config.js';
import { bus, EV } from '../core/EventBus.js';

export class ScoreManager {
  /**
   * @param {object} o
   * @param {number} o.multiplier   difficulty score multiplier
   * @param {object} o.scoring      override SCORING for tests/tuning
   * @param {boolean} o.emit        emit events on the global bus (false in tests)
   */
  constructor({ multiplier = 1, scoring = SCORING, emit = true } = {}) {
    this.cfg = scoring;
    this.multiplier = multiplier;
    this.emit = emit;
    this.reset();
  }

  reset() {
    this.rawScore = 0;
    this.correct = 0;
    this.wrong = 0;
    this.attempts = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.comboActive = false;
    this.comboBonusTotal = 0;
    /** @type {{id:string,severity:string,reactionTime:number,points:number,fast:boolean}[]} */
    this.finds = [];
    /** @type {{reason:string,at:number}[]} */
    this.misses = [];
    /** How many times the reaction clock ran out mid-search. */
    this.slowSearches = 0;
  }

  /** Everything needed to carry a round across a page reload. */
  toJSON() {
    return {
      rawScore: this.rawScore, correct: this.correct, wrong: this.wrong,
      attempts: this.attempts, streak: this.streak, bestStreak: this.bestStreak,
      comboActive: this.comboActive, comboBonusTotal: this.comboBonusTotal,
      finds: this.finds.map((f) => ({ ...f })), misses: this.misses.map((m) => ({ ...m })),
      slowSearches: this.slowSearches,
    };
  }

  restore(data) {
    if (!data || typeof data !== 'object') return this;
    const num = (v) => (Number.isFinite(v) ? v : 0);
    this.rawScore = num(data.rawScore);
    this.correct = num(data.correct);
    this.wrong = num(data.wrong);
    this.attempts = num(data.attempts);
    this.streak = num(data.streak);
    this.bestStreak = num(data.bestStreak);
    this.comboActive = !!data.comboActive;
    this.comboBonusTotal = num(data.comboBonusTotal);
    this.finds = Array.isArray(data.finds) ? data.finds.map((f) => ({ ...f })) : [];
    this.misses = Array.isArray(data.misses) ? data.misses.map((m) => ({ ...m })) : [];
    this.slowSearches = num(data.slowSearches);
    return this;
  }

  /** Final score after the difficulty multiplier, rounded to an integer. */
  get score() {
    return Math.max(0, Math.round(this.rawScore * this.multiplier));
  }

  get rank() {
    return rankForScore(this.score);
  }

  get accuracy() {
    return this.attempts === 0 ? 0 : this.correct / this.attempts;
  }

  get averageReactionTime() {
    if (this.finds.length === 0) return null;
    const sum = this.finds.reduce((a, f) => a + f.reactionTime, 0);
    return sum / this.finds.length;
  }

  /**
   * Was this find "fast"? Fast means inside `fastThresholdRatio` of the time
   * that was allotted for the hazard.
   */
  isFast(reactionTime, allottedTime) {
    if (!allottedTime || allottedTime <= 0) return false;
    return reactionTime <= allottedTime * this.cfg.fastThresholdRatio;
  }

  /**
   * Record a correct hazard identification.
   * @param {object} o
   * @param {string} o.id
   * @param {'major'|'minor'} o.severity
   * @param {number} o.reactionTime seconds taken
   * @param {number} o.allottedTime seconds available for this hazard
   * @returns {{points:number, fast:boolean, combo:boolean, comboBonus:number}}
   */
  recordCorrect({ id, severity, reactionTime, allottedTime }) {
    const fast = this.isFast(reactionTime, allottedTime);
    const table = this.cfg[severity] ?? this.cfg.minor;
    const base = fast ? table.fast : table.slow;

    this.attempts++;
    this.correct++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);

    const wasCombo = this.comboActive;
    if (this.streak >= this.cfg.comboLength) {
      this.comboActive = true;
      if (!wasCombo && this.emit) bus.emit(EV.COMBO_START, { streak: this.streak });
    }

    let comboBonus = 0;
    if (this.comboActive) {
      comboBonus = this.cfg.comboBonus;
      this.comboBonusTotal += comboBonus;
    }

    const points = base + comboBonus;
    this.rawScore += points;
    this.finds.push({ id, severity, reactionTime, points, fast });

    if (this.emit) {
      bus.emit(EV.SCORE_CHANGED, {
        score: this.score,
        delta: Math.round(points * this.multiplier),
        streak: this.streak,
        comboActive: this.comboActive,
      });
    }

    return { points, fast, combo: this.comboActive, comboBonus };
  }

  /**
   * Record a wrong flag. Breaks the combo streak.
   * @returns {{points:number}}
   */
  recordWrong({ reason = '' } = {}) {
    this.attempts++;
    this.wrong++;
    const hadCombo = this.comboActive;
    this.streak = 0;
    this.comboActive = false;
    this.misses.push({ reason, at: Date.now() });

    const penalty = this.cfg.wrongPenalty ?? 0;
    if (penalty) this.rawScore = Math.max(0, this.rawScore - penalty);

    if (this.emit) {
      if (hadCombo) bus.emit(EV.COMBO_BREAK, {});
      bus.emit(EV.SCORE_CHANGED, {
        score: this.score,
        delta: -Math.round(penalty * this.multiplier),
        streak: 0,
        comboActive: false,
      });
    }
    return { points: -penalty };
  }

  /**
   * The reaction clock ran out without a find.
   *
   * This is NOT attributed to a particular hazard: when the clock expires the
   * player is searching, and there is no way to know which hazard they were
   * looking for. Blaming a specific one (previously the first unfound hazard in
   * registration order) produced misleading feedback and a wrong "missed" list.
   * It records a slow search and breaks the combo, nothing more.
   */
  noteSlowSearch() {
    const hadCombo = this.comboActive;
    this.streak = 0;
    this.comboActive = false;
    this.slowSearches++;
    if (this.emit && hadCombo) bus.emit(EV.COMBO_BREAK, {});
  }

  /** Everything the results screen needs. */
  summary({ totalHazards = 0, elapsed = 0, difficulty = 'mid', environment = '', mode = 'test' } = {}) {
    const byCategory = {};
    for (const f of this.finds) {
      byCategory[f.id] = { severity: f.severity, points: f.points, fast: f.fast, reactionTime: f.reactionTime };
    }
    return {
      mode,
      difficulty,
      environment,
      score: this.score,
      rawScore: this.rawScore,
      multiplier: this.multiplier,
      correct: this.correct,
      wrong: this.wrong,
      attempts: this.attempts,
      totalHazards,
      missed: Math.max(0, totalHazards - this.correct),
      accuracy: this.accuracy,
      averageReactionTime: this.averageReactionTime,
      bestCombo: this.bestStreak,
      comboBonusTotal: this.comboBonusTotal,
      rank: this.rank,
      finds: [...this.finds],
      misses: [...this.misses],
      slowSearches: this.slowSearches,
      elapsed,
      perfect: this.wrong === 0 && totalHazards > 0 && this.correct === totalHazards,
      finishedAt: Date.now(),
      byCategory,
    };
  }
}
