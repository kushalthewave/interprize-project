/**
 * GameManager.js
 * The orchestrator. Owns the round lifecycle and is the only place that knows
 * about Train vs Test rules.
 *
 * Round lifecycle:
 *   loadEnvironment(envId, difficulty)   build world + hazards
 *   start(mode)                          arm timer/score, enable player
 *   flag()                               player pressed E / clicked
 *   tick(dt)                             advance clock, expire hazards
 *   end(reason)                          produce a summary + persist it
 *
 * TRAIN MODE teaches: hazards are highlighted, the clock does not kill the
 * round, each find opens a teaching card, and finding them all completes the
 * module and unlocks testing.
 *
 * TEST MODE evaluates: no highlights (except on Simple), the reaction clock
 * runs per hazard, wrong flags break the combo, and the round ends when the
 * clock expires or every hazard is found.
 */
import * as THREE from 'three';
import { bus, EV } from '../core/EventBus.js';
import { DIFFICULTIES, SCORING } from '../data/config.js';
import { ScoreManager } from './ScoreManager.js';
import { Timer } from './Timer.js';
import { HazardSystem } from '../hazards/HazardSystem.js';
import { World } from '../environment/World.js';
import { ENVIRONMENTS, getEnvironment } from '../environment/registry.js';

export const MODE = { TRAIN: 'train', TEST: 'test' };
export const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
};

export class GameManager {
  /**
   * @param {object} deps
   * @param {import('../core/Engine.js').Engine} deps.engine
   * @param {import('../player/PlayerController.js').PlayerController} deps.player
   * @param {import('../services/Profile.js').Profile} deps.profile
   * @param {import('../audio/AudioManager.js').AudioManager} deps.audio
   */
  constructor({ engine, player, profile, audio }) {
    this.engine = engine;
    this.player = player;
    this.profile = profile;
    this.audio = audio;

    this.state = STATE.IDLE;
    this.mode = MODE.TEST;
    this.difficultyId = 'simple';
    this.environmentId = null;

    /** @type {World|null} */
    this.world = null;
    this.hazards = new HazardSystem(engine.scene, engine.camera);
    this.score = null;
    this.timer = null;

    /** Train Mode sequencing state. */
    this.train = { index: 0, order: [], showing: null, completed: false };

    this._lastSummary = null;
    this._roundStart = 0;
    this._warnedAt = -1;

    this.engine.addUpdater((dt, t) => this.update(dt, t));
  }

  get difficulty() {
    return DIFFICULTIES[this.difficultyId] ?? DIFFICULTIES.simple;
  }

  get environment() {
    return this.environmentId ? getEnvironment(this.environmentId) : null;
  }

  /* ---------------------------------------------------------------- *
   * Loading
   * ---------------------------------------------------------------- */

  /**
   * Build an environment. Yields to the browser between phases so the loading
   * screen can actually paint - building ~4000 meshes on one frame would
   * otherwise freeze the tab.
   */
  async loadEnvironment(envId, difficultyId, mode = MODE.TEST) {
    const env = getEnvironment(envId);
    if (!env) throw new Error(`Unknown environment: ${envId}`);

    this.state = STATE.LOADING;
    this.environmentId = envId;
    this.difficultyId = difficultyId;
    this.mode = mode;
    bus.emit(EV.LOADING, { active: true, label: `Loading ${env.meta.name}…`, progress: 0.05 });

    // tear down anything already loaded
    this.unload();
    await frame();

    const diff = this.difficulty;
    // Train Mode always uses the gentlest presentation regardless of the
    // difficulty picked for testing.
    const opts = mode === MODE.TRAIN
      ? { ...DIFFICULTIES.simple, highlightHazards: true, movingHazards: true, decoyCount: 0 }
      : { ...diff };

    this.world = new World(this.engine.scene, this.hazards, opts);
    this.world.onBoxImpact = () => this.audio?.boxImpact();

    bus.emit(EV.LOADING, { active: true, label: 'Building the warehouse…', progress: 0.25 });
    await frame();

    env.build(this.world);

    // Bake static props into merged batches. Without this the warehouse is
    // ~9,500 draw calls per frame; with it, a few dozen.
    const opt = this.world.optimize();
    console.info(`[Game] ${env.meta.id}: merged ${opt.before} meshes into ${opt.after} (${opt.merged} batches)`);

    bus.emit(EV.LOADING, { active: true, label: 'Placing hazards…', progress: 0.7 });
    await frame();

    this.player.setColliders(this.world.colliders);
    if (this.world.markers.bounds) this.player.setBounds(this.world.markers.bounds);
    this.hazards.setOccluders(this.world.colliders);
    this.hazards.setFlagRadius(opts.flagRadius ?? 1);
    this.hazards.setHighlight(!!opts.highlightHazards);

    const spawn = this.world.markers.spawn ?? env.meta.spawn;
    this.player.teleport(spawn.x, spawn.z, spawn.yaw ?? 0);

    bus.emit(EV.LOADING, { active: true, label: 'Ready.', progress: 1 });
    await frame();
    await frame();

    this.state = STATE.READY;
    bus.emit(EV.LOADING, { active: false });
    return this.world;
  }

  unload() {
    this.hazards.clear();
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
    this.audio?.stopAllEmitters();
  }

  /* ---------------------------------------------------------------- *
   * Round control
   * ---------------------------------------------------------------- */

  start(mode = this.mode) {
    if (!this.world) throw new Error('start() called before loadEnvironment()');
    this.mode = mode;

    const total = this.hazards.instances.length;
    const diff = this.difficulty;

    this.score = new ScoreManager({
      multiplier: mode === MODE.TRAIN ? 1 : diff.scoreMultiplier,
      scoring: SCORING,
    });

    this.timer = new Timer({
      secondsPerHazard: mode === MODE.TRAIN ? 600 : diff.secondsPerHazard,
      hazardCount: total,
      warnAt: 0.25,
    });

    this.hazards.reset();
    this.hazards.active = true;
    this.hazards.setHighlight(mode === MODE.TRAIN || diff.highlightHazards);

    if (mode === MODE.TRAIN) {
      this.train = {
        index: 0,
        // teach major hazards first, then minor - a sensible pedagogic order
        order: [...this.hazards.instances].sort((a, b) =>
          a.severity === b.severity ? 0 : a.severity === 'major' ? -1 : 1,
        ),
        showing: null,
        completed: false,
      };
    }

    this.player.enabled = true;
    this.state = STATE.PLAYING;
    this._roundStart = performance.now();
    this._warnedAt = -1;
    this.timer.start();

    this.audio?.startAmbience();
    bus.emit(EV.GAME_START, {
      mode,
      difficulty: this.difficultyId,
      environment: this.environmentId,
      totalHazards: total,
      secondsPerHazard: this.timer.secondsPerHazard,
      showHazardCount: mode === MODE.TRAIN || diff.showHazardCount,
    });
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.timer?.pause();
    this.player.enabled = false;
    this.player.releaseLock();
    this.hazards.active = false;
    bus.emit(EV.GAME_PAUSE, {});
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.PLAYING;
    this.timer?.resume();
    this.player.enabled = true;
    this.hazards.active = true;
    bus.emit(EV.GAME_RESUME, {});
  }

  /**
   * Player flagged whatever the reticle is on.
   * @returns {{result:string}|null}
   */
  flag() {
    if (this.state !== STATE.PLAYING) return null;

    const allotted = this.timer.secondsPerHazard;
    const reaction = this.timer.hazardElapsed;
    const res = this.hazards.flag(reaction);

    if (res.result === 'correct') {
      const inst = res.instance;
      const out = this.score.recordCorrect({
        id: inst.id,
        severity: inst.severity,
        reactionTime: reaction,
        allottedTime: allotted,
      });
      this.timer.nextHazard();
      this.audio?.correct();
      if (out.combo && out.comboBonus) this.audio?.combo();

      bus.emit(EV.HAZARD_FOCUS, {
        kind: 'correct',
        hazard: inst.def,
        hint: inst.hint,
        points: Math.round(out.points * this.score.multiplier),
        fast: out.fast,
        combo: out.combo,
        progress: this.hazards.progress,
        mode: this.mode,
      });

      if (this.mode === MODE.TRAIN) this._advanceTrain(inst);

      if (this.hazards.progress.found >= this.hazards.progress.total) {
        this.end('complete');
      }
      return { result: 'correct' };
    }

    this.score.recordWrong({ reason: res.reason });
    this.audio?.incorrect();
    bus.emit(EV.HAZARD_FOCUS, {
      kind: 'wrong',
      reason: res.reason,
      progress: this.hazards.progress,
      mode: this.mode,
    });
    return { result: 'wrong' };
  }

  /** Train Mode: point the player at the next hazard to learn. */
  _advanceTrain(found) {
    const t = this.train;
    t.index = t.order.filter((i) => i.found).length;
    const next = t.order.find((i) => !i.found);
    bus.emit(EV.TRAIN_STEP, {
      index: t.index,
      total: t.order.length,
      next: next ? { id: next.id, name: next.def.name, hint: next.hint } : null,
      justFound: found?.def ?? null,
    });
    if (!next) {
      t.completed = true;
      bus.emit(EV.TRAIN_COMPLETE, { environment: this.environmentId });
    }
  }

  /* ---------------------------------------------------------------- *
   * Frame update
   * ---------------------------------------------------------------- */

  update(dt, t) {
    this.world?.update(dt, t);
    this.hazards.update(dt, t);

    if (this.state !== STATE.PLAYING || !this.timer) return;

    this.player.update(dt);

    const { expired, hazardExpired } = this.timer.tick(dt);

    // per-hazard clock ran out: the current hazard is "missed" but the round
    // continues - a training tool should not punish with a hard stop.
    if (hazardExpired && this.mode === MODE.TEST) {
      const next = this.hazards.remaining[0];
      if (next) {
        this.score.recordExpired({ id: next.id, severity: next.severity });
        bus.emit(EV.HAZARD_EXPIRED, { id: next.id, name: next.def.name });
      }
    }

    // timer audio warnings, at most once per second
    if (this.mode === MODE.TEST) {
      const sec = Math.ceil(this.timer.hazardRemaining);
      if (sec !== this._warnedAt && sec <= 5 && sec > 0) {
        this._warnedAt = sec;
        this.timer.critical ? this.audio?.timerCritical() : this.audio?.timerWarn();
      }
    }

    bus.emit(EV.GAME_TICK, {
      remaining: this.timer.remaining,
      display: this.timer.display,
      hazardRemaining: this.timer.hazardRemaining,
      warning: this.timer.warning,
      critical: this.timer.critical,
      score: this.score.score,
      streak: this.score.streak,
      combo: this.score.comboActive,
      progress: this.hazards.progress,
    });

    if (expired) this.end('timeout');
  }

  /* ---------------------------------------------------------------- *
   * Ending
   * ---------------------------------------------------------------- */

  /** @param {'complete'|'timeout'|'quit'} reason */
  end(reason = 'complete') {
    if (this.state === STATE.FINISHED) return this._lastSummary;
    this.state = STATE.FINISHED;

    this.hazards.active = false;
    this.hazards.revealAll();
    this.player.enabled = false;
    this.player.releaseLock();
    this.timer?.pause();
    this.audio?.stopAmbience();
    this.audio?.stopAllEmitters();

    const elapsed = (performance.now() - this._roundStart) / 1000;
    const summary = this.score.summary({
      totalHazards: this.hazards.instances.length,
      elapsed,
      difficulty: this.difficultyId,
      environment: this.environmentId,
      mode: this.mode,
    });
    summary.reason = reason;
    summary.improvementAreas = this._improvementAreas(summary);
    summary.tips = this._tips(summary);
    summary.missedHazards = this.hazards.instances
      .filter((i) => !i.found)
      .map((i) => ({ id: i.id, name: i.def.name, severity: i.severity, safetyTip: i.def.safetyTip }));

    let unlocked = [];
    if (this.mode === MODE.TRAIN) {
      if (this.train.completed || summary.correct === summary.totalHazards) {
        this.profile.markTrainComplete(this.environmentId);
      }
      unlocked = [];
    } else {
      unlocked = this.profile.recordResult(summary);
    }
    summary.newAchievements = unlocked;

    this._lastSummary = summary;
    this.audio?.[summary.rank.id === 'needs-practice' ? 'resultPoor' : 'resultGood']?.();
    bus.emit(EV.GAME_END, summary);
    return summary;
  }

  /** Which hazard categories did the player struggle with? */
  _improvementAreas(summary) {
    const missedByCat = {};
    for (const i of this.hazards.instances) {
      if (i.found) continue;
      missedByCat[i.def.category] = (missedByCat[i.def.category] ?? 0) + 1;
    }
    return Object.entries(missedByCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
  }

  /** Personalised coaching lines for the results screen. */
  _tips(summary) {
    const out = [];
    if (summary.wrong > summary.correct && summary.attempts > 2) {
      out.push('You are flagging a lot of things that are already under control. Before flagging, ask: what is physically wrong here?');
    }
    if (summary.averageReactionTime != null && summary.averageReactionTime > this.timer.secondsPerHazard * 0.7) {
      out.push('Work the room systematically - scan floor, then eye level, then above head height - rather than wandering.');
    }
    if (summary.bestCombo < 3 && summary.correct >= 3) {
      out.push('Three correct finds in a row triggers a combo bonus. Slow down slightly and confirm before you flag.');
    }
    if (summary.missed > 0) {
      const majors = summary.missedHazards?.filter?.((h) => h.severity === 'major').length ?? 0;
      if (majors > 0) out.push(`You missed ${majors} major hazard${majors > 1 ? 's' : ''}. Major hazards are the ones that kill - prioritise vehicles, racking and edges.`);
    }
    if (summary.perfect) out.push('Perfect round - every hazard found with no wrong flags. Try the next difficulty.');
    if (out.length === 0) out.push('Solid work. Repeat on a harder difficulty to keep sharpening your hazard spotting.');
    return out;
  }

  restart() {
    this.state = STATE.READY;
    this.hazards.reset();
    const spawn = this.world?.markers.spawn ?? this.environment?.meta.spawn;
    if (spawn) this.player.teleport(spawn.x, spawn.z, spawn.yaw ?? 0);
    this.start(this.mode);
  }

  quit() {
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this.end('quit');
    this.player.enabled = false;
    this.player.releaseLock();
    this.state = STATE.IDLE;
  }

  get lastSummary() {
    return this._lastSummary;
  }
}

/**
 * Yield so the browser can paint the loading screen.
 *
 * requestAnimationFrame alone is not enough: browsers stop firing it entirely
 * in a hidden tab, which would leave loadEnvironment() awaiting forever if the
 * user switches away mid-load. Racing it against a timeout guarantees the load
 * always completes, and still yields on the real frame boundary when visible.
 */
function frame(timeout = 60) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeout);
    requestAnimationFrame(finish);
  });
}
