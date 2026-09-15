/**
 * throttle.js
 * Locks a sign-in step after repeated wrong attempts.
 *
 * A 6-digit authenticator code has a million possibilities; with no limit a
 * script could try them all in minutes. After `max` wrong attempts the step is
 * locked for `lockMs`, and each further lock doubles, up to `maxLockMs`. The
 * count is saved, so reloading the page does not reset it.
 *
 * Scope, stated plainly: this is a browser game with no server, so someone
 * with developer tools can clear the saved count. It stops guessing through
 * the interface, which is the attack this game can actually defend against.
 */

/** localStorage, falling back to memory when storage is blocked. */
export function browserStorage() {
  const memory = new Map();
  return {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { memory.set(key, value); }
    },
  };
}

/** A storage that only lives in memory — for tests. */
export function memoryStorage() {
  const m = new Map();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v) };
}

/**
 * @param {object} o
 * @param {string} o.key                 storage key
 * @param {{get:Function,set:Function}} [o.storage]
 * @param {number} [o.max]               wrong attempts before a lock
 * @param {number} [o.lockMs]            first lock length
 * @param {number} [o.maxLockMs]         longest lock
 * @param {() => number} [o.now]
 */
export function createThrottle({
  key,
  storage = browserStorage(),
  max = 5,
  lockMs = 30_000,
  maxLockMs = 5 * 60_000,
  now = () => Date.now(),
}) {
  const read = () => {
    try {
      const s = JSON.parse(storage.get(key) || 'null');
      if (s && Number.isFinite(s.fails) && Number.isFinite(s.lockedUntil) && Number.isFinite(s.locks)) return s;
    } catch { /* corrupt: start clean */ }
    return { fails: 0, lockedUntil: 0, locks: 0 };
  };
  const write = (s) => storage.set(key, JSON.stringify(s));

  const status = () => {
    const s = read();
    const waitMs = Math.max(0, s.lockedUntil - now());
    return { locked: waitMs > 0, waitMs, remaining: Math.max(0, max - s.fails) };
  };

  return {
    status,

    /** Record a wrong attempt. Returns the new status. */
    fail() {
      const s = read();
      if (s.lockedUntil > now()) return status();
      s.fails += 1;
      if (s.fails >= max) {
        s.locks += 1;
        s.lockedUntil = now() + Math.min(lockMs * 2 ** (s.locks - 1), maxLockMs);
        s.fails = 0;
      }
      write(s);
      return status();
    },

    /** A correct attempt clears the history. */
    succeed() {
      write({ fails: 0, lockedUntil: 0, locks: 0 });
    },
  };
}

/** "30 seconds", "2 minutes" — for the locked message. */
export function describeWait(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.ceil(s / 60);
  return `${m} minute${m === 1 ? '' : 's'}`;
}
