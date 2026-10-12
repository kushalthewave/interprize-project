/**
 * The idle lock on a shared computer.
 *
 * The behaviour worth pinning: a round pauses before anything is lost, the
 * profile closes after the longer wait, a trainee who is still there keeps
 * their session, and the person who sits down afterwards cannot cancel the
 * lock by moving the mouse.
 */
import { describe, it, expect, vi } from 'vitest';
import { createIdleLock } from '../src/services/idle.js';

function mk({ playing = false, lockMinutes = 5, pauseMinutes = 2 } = {}) {
  let clock = 0;
  const onPause = vi.fn();
  const onLock = vi.fn();
  const lock = createIdleLock({
    onPause,
    onLock,
    isPlaying: () => playing,
    pauseMs: () => pauseMinutes * 60_000,
    lockMs: () => lockMinutes * 60_000,
    win: null,
    now: () => clock,
  });
  return {
    lock, onPause, onLock,
    tick(minutes) { clock += minutes * 60_000; lock.check(); },
    use() { lock.activity(); },
  };
}

describe('Idle lock', () => {
  it('leaves a busy trainee alone', () => {
    const t = mk();
    t.tick(4);
    t.use();
    t.tick(4);
    expect(t.onLock).not.toHaveBeenCalled();
  });

  it('locks after the chosen wait', () => {
    const t = mk({ lockMinutes: 5 });
    t.tick(6);
    expect(t.onLock).toHaveBeenCalledTimes(1);
    expect(t.lock.locked).toBe(true);
  });

  it('pauses a round first, so a timed test is not thrown away', () => {
    const t = mk({ playing: true, pauseMinutes: 2, lockMinutes: 10 });
    t.tick(3);
    expect(t.onPause).toHaveBeenCalledTimes(1);
    expect(t.onLock).not.toHaveBeenCalled();
  });

  it('does not pause a trainee who is only reading a menu', () => {
    const t = mk({ playing: false, pauseMinutes: 2, lockMinutes: 10 });
    t.tick(3);
    expect(t.onPause).not.toHaveBeenCalled();
  });

  it('pauses once, not every time it checks', () => {
    const t = mk({ playing: true, pauseMinutes: 2, lockMinutes: 30 });
    t.tick(3);
    t.tick(3);
    t.tick(3);
    expect(t.onPause).toHaveBeenCalledTimes(1);
  });

  it('pauses again after the trainee comes back and leaves again', () => {
    const t = mk({ playing: true, pauseMinutes: 2, lockMinutes: 30 });
    t.tick(3);
    t.use();
    t.tick(3);
    expect(t.onPause).toHaveBeenCalledTimes(2);
  });

  it('locks only once however long the machine sits there', () => {
    const t = mk({ lockMinutes: 5 });
    t.tick(6);
    t.tick(60);
    expect(t.onLock).toHaveBeenCalledTimes(1);
  });

  it('cannot be cancelled by whoever sits down after it has locked', () => {
    const t = mk({ lockMinutes: 5 });
    t.tick(6);
    t.use();
    t.tick(1);
    expect(t.lock.locked).toBe(true);
  });

  it('starts watching again once someone signs back in', () => {
    const t = mk({ lockMinutes: 5 });
    t.tick(6);
    t.lock.reset();
    expect(t.lock.locked).toBe(false);
    t.tick(2);
    expect(t.onLock).toHaveBeenCalledTimes(1);
    t.tick(4);
    expect(t.onLock).toHaveBeenCalledTimes(2);
  });

  it('never locks when the trainee has turned it off', () => {
    const t = mk({ lockMinutes: 0 });
    t.tick(120);
    expect(t.onLock).not.toHaveBeenCalled();
    expect(t.onPause).not.toHaveBeenCalled();
  });
});
