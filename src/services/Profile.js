/**
 * Profile.js
 * Player identity, progression, achievements and score history.
 *
 * Persistence is behind a tiny adapter so the storage backend is replaceable:
 * today it is localStorage (offline-first, no server needed); swapping in a
 * REST or Firestore adapter means implementing load()/save() only.
 * Every access is wrapped - a browser with site data blocked must not break
 * the game, it just loses persistence.
 */
import { ACHIEVEMENTS, DIFFICULTY_ORDER, PROGRESSION } from '../data/config.js';
import { bus, EV } from '../core/EventBus.js';

const KEY = 'beat-the-hazard:profile:v1';

/** localStorage adapter with graceful degradation to an in-memory store. */
export class LocalStorageAdapter {
  constructor(key = KEY) {
    this.key = key;
    this.memory = null;
    this.available = (() => {
      try {
        const t = '__bth_test__';
        window.localStorage.setItem(t, '1');
        window.localStorage.removeItem(t);
        return true;
      } catch {
        return false;
      }
    })();
    if (!this.available) {
      console.warn('[Profile] localStorage unavailable - progress will not persist this session.');
    }
  }

  load() {
    if (!this.available) return this.memory;
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[Profile] failed to read saved profile:', err);
      return null;
    }
  }

  save(data) {
    if (!this.available) {
      this.memory = data;
      return false;
    }
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('[Profile] failed to save profile:', err);
      return false;
    }
  }

  clear() {
    this.memory = null;
    if (!this.available) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch { /* ignore */ }
  }
}

/** In-memory adapter used by unit tests. */
export class MemoryAdapter {
  constructor() { this.data = null; }
  load() { return this.data; }
  save(d) { this.data = d; return true; }
  clear() { this.data = null; }
}

function blankProfile() {
  return {
    version: 1,
    name: '',
    avatar: 'male',
    authProvider: 'local',
    email: null,
    createdAt: Date.now(),
    stats: {
      bestScore: 0,
      totalScore: 0,
      sessions: 0,
      hazardsFound: 0,
      wrongFlags: 0,
      bestCombo: 0,
      fastestAverage: null,
    },
    /** environmentId -> { train:boolean, simple:number, mid:number, hard:number } */
    progress: {},
    achievements: [],
    history: [],
    settings: {
      audio: true,
      volume: 0.7,
      invertY: false,
      showFps: false,
      reducedMotion: false,
      /** Look-speed multiplier, 0.25 - 3.0. */
      lookSensitivity: 1,
      /** Run Test Mode against the reaction clock. Off = untimed practice. */
      timedTest: true,
      /** Show each hazard's location in Train Mode and on the results screen. */
      showLocations: true,
    },
  };
}

export class Profile {
  constructor(adapter = null) {
    this.adapter = adapter ?? new LocalStorageAdapter();
    this.data = this.adapter.load() ?? blankProfile();
    this._migrate();
  }

  _migrate() {
    const base = blankProfile();
    this.data = { ...base, ...this.data };
    this.data.stats = { ...base.stats, ...(this.data.stats ?? {}) };
    this.data.settings = { ...base.settings, ...(this.data.settings ?? {}) };
    this.data.progress ??= {};
    this.data.achievements ??= [];
    this.data.history ??= [];
  }

  save() {
    const ok = this.adapter.save(this.data);
    bus.emit(EV.PROFILE_CHANGED, this.data);
    return ok;
  }

  get name() { return this.data.name; }
  get avatar() { return this.data.avatar; }
  get settings() { return this.data.settings; }
  get isSignedIn() { return !!this.data.name; }

  signIn({ name, avatar = 'male', provider = 'local', email = null }) {
    this.data.name = String(name ?? '').trim().slice(0, 32) || 'Trainee';
    this.data.avatar = avatar;
    this.data.authProvider = provider;
    this.data.email = email;
    if (!this.data.createdAt) this.data.createdAt = Date.now();
    this.save();
    return this.data;
  }

  signOut() {
    this.data.name = '';
    this.data.authProvider = 'local';
    this.data.email = null;
    this.save();
  }

  setAvatar(a) {
    this.data.avatar = a;
    this.save();
  }

  setSetting(k, v) {
    this.data.settings[k] = v;
    this.save();
  }

  /* ---------------- progression ---------------- */

  envProgress(envId) {
    this.data.progress[envId] ??= { train: false, simple: 0, mid: 0, hard: 0 };
    return this.data.progress[envId];
  }

  markTrainComplete(envId) {
    this.envProgress(envId).train = true;
    this.unlock('training-complete');
    this.save();
  }

  /**
   * Is a difficulty unlocked for an environment?
   * Gate order: Train -> Simple -> Mid -> Hard.
   */
  isUnlocked(envId, difficulty) {
    const p = this.envProgress(envId);
    if (difficulty === 'train') return true;
    if (PROGRESSION.requireTrainBeforeTest && !p.train) return false;
    if (difficulty === 'simple') return true;
    if (difficulty === 'mid') {
      return !PROGRESSION.requireSimpleBeforeMid || p.simple >= PROGRESSION.unlockScore;
    }
    if (difficulty === 'hard') {
      return !PROGRESSION.requireMidBeforeHard || p.mid >= PROGRESSION.unlockScore;
    }
    return true;
  }

  /** Human-readable reason a difficulty is locked (for the UI tooltip). */
  lockReason(envId, difficulty) {
    const p = this.envProgress(envId);
    if (difficulty !== 'train' && PROGRESSION.requireTrainBeforeTest && !p.train) {
      return 'Complete Train Mode in this environment first.';
    }
    if (difficulty === 'mid' && p.simple < PROGRESSION.unlockScore) {
      return `Score ${PROGRESSION.unlockScore}+ on Simple to unlock.`;
    }
    if (difficulty === 'hard' && p.mid < PROGRESSION.unlockScore) {
      return `Score ${PROGRESSION.unlockScore}+ on Mid to unlock.`;
    }
    return '';
  }

  /* ---------------- results ---------------- */

  /**
   * Fold a finished test into the profile: stats, best scores, achievements.
   * @returns {string[]} ids of achievements newly unlocked
   */
  recordResult(summary) {
    const s = this.data.stats;
    s.sessions++;
    s.totalScore += summary.score;
    s.bestScore = Math.max(s.bestScore, summary.score);
    s.hazardsFound += summary.correct;
    s.wrongFlags += summary.wrong;
    s.bestCombo = Math.max(s.bestCombo, summary.bestCombo);
    if (summary.averageReactionTime != null) {
      s.fastestAverage =
        s.fastestAverage == null
          ? summary.averageReactionTime
          : Math.min(s.fastestAverage, summary.averageReactionTime);
    }

    if (summary.mode === 'test' && summary.environment) {
      const p = this.envProgress(summary.environment);
      p[summary.difficulty] = Math.max(p[summary.difficulty] ?? 0, summary.score);
    }

    this.data.history.unshift({
      at: summary.finishedAt ?? Date.now(),
      mode: summary.mode,
      environment: summary.environment,
      difficulty: summary.difficulty,
      score: summary.score,
      rank: summary.rank?.id,
      correct: summary.correct,
      wrong: summary.wrong,
      total: summary.totalHazards,
    });
    this.data.history = this.data.history.slice(0, 50);

    const unlocked = this._evaluateAchievements(summary);
    this.save();
    return unlocked;
  }

  _evaluateAchievements(summary) {
    const got = [];
    const test = (id, cond) => {
      if (cond && this.unlock(id, false)) got.push(id);
    };

    test('first-hazard', summary.correct >= 1);
    test('safety-champion', summary.rank?.id === 'champion');
    test('fast-responder', summary.averageReactionTime != null && summary.averageReactionTime < 15);
    test('combo-master', summary.bestCombo >= 5);
    test('perfect-test', summary.perfect);
    test('hard-cleared', summary.difficulty === 'hard' && summary.rank?.id !== 'needs-practice');

    const envs = Object.entries(this.data.progress).filter(
      ([, p]) => (p.simple ?? 0) > 0 || (p.mid ?? 0) > 0 || (p.hard ?? 0) > 0,
    );
    test('all-environments', envs.length >= 3);

    for (const id of got) {
      bus.emit(EV.ACHIEVEMENT, ACHIEVEMENTS.find((a) => a.id === id));
    }
    return got;
  }

  /** @returns {boolean} true if it was newly unlocked */
  unlock(id, autoSave = true) {
    if (this.data.achievements.includes(id)) return false;
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return false;
    this.data.achievements.push(id);
    if (autoSave) {
      bus.emit(EV.ACHIEVEMENT, ACHIEVEMENTS.find((a) => a.id === id));
      this.save();
    }
    return true;
  }

  hasAchievement(id) {
    return this.data.achievements.includes(id);
  }

  /** Overall completion percentage across all environments and difficulties. */
  completion(environmentIds) {
    if (!environmentIds?.length) return 0;
    let done = 0;
    const per = 1 + DIFFICULTY_ORDER.length;
    for (const id of environmentIds) {
      const p = this.envProgress(id);
      if (p.train) done++;
      for (const d of DIFFICULTY_ORDER) if ((p[d] ?? 0) > 0) done++;
    }
    return done / (environmentIds.length * per);
  }

  resetProgress() {
    const { name, avatar, authProvider, email, settings } = this.data;
    this.data = { ...blankProfile(), name, avatar, authProvider, email, settings };
    this.save();
  }
}
