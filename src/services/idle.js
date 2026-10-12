/**
 * idle.js
 * Locks the game back to the sign-in screen after a spell of no input.
 *
 * The product runs on a shared warehouse PC. A trainee finishes, walks off
 * without signing out, and the next person sits down inside their profile:
 * their name, their email, their history, and the ability to play rounds that
 * get recorded against them. That is the gap this closes. It defends against
 * the next person at the keyboard, not against someone with the machine and
 * developer tools, and the report says so.
 *
 * A round in progress is paused first rather than locked straight out, so a
 * two-minute interruption on the floor does not throw away a timed test. Only
 * after the longer wait does it sign out.
 */

/** Activity worth counting. Mouse movement is included: the trainee is there. */
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'gamepadconnected'];

/**
 * @param {object} o
 * @param {() => void} o.onPause     called when a round should pause
 * @param {() => void} o.onLock      called when the profile should be locked
 * @param {() => boolean} [o.isPlaying]  true while a round is running
 * @param {() => number} [o.pauseMs]  idle time before a round pauses
 * @param {() => number} [o.lockMs]   idle time before the profile locks
 * @param {Window} [o.win]
 * @param {() => number} [o.now]
 */
export function createIdleLock({
  onPause,
  onLock,
  isPlaying = () => false,
  pauseMs = () => 2 * 60_000,
  lockMs = () => 5 * 60_000,
  win = typeof window === 'undefined' ? null : window,
  now = Date.now,
}) {
  let last = now();
  let paused = false;
  let locked = false;
  let timer = null;

  const idleFor = () => now() - last;

  /** Called on every tick, and directly by tests. */
  function check() {
    if (locked) return;

    const lock = lockMs();
    const pause = pauseMs();

    // 0 means the trainee has turned the lock off.
    if (!lock) return;

    if (!paused && isPlaying() && pause && idleFor() >= pause) {
      paused = true;
      onPause();
    }
    if (idleFor() >= lock) {
      locked = true;
      onLock();
    }
  }

  function activity() {
    // An event that arrives after the lock has fired is the next person
    // sitting down, not the same trainee coming back: it must not reset it.
    if (locked) return;
    last = now();
    paused = false;
  }

  function start(intervalMs = 10_000) {
    if (!win) return stop;
    for (const ev of EVENTS) win.addEventListener(ev, activity, { passive: true });
    timer = win.setInterval(check, intervalMs);
    return stop;
  }

  function stop() {
    if (!win) return;
    for (const ev of EVENTS) win.removeEventListener(ev, activity);
    if (timer) win.clearInterval(timer);
    timer = null;
  }

  /** After signing back in, the watch starts again from now. */
  function reset() {
    locked = false;
    paused = false;
    last = now();
  }

  return { start, stop, check, activity, reset, get locked() { return locked; }, get idleMs() { return idleFor(); } };
}
