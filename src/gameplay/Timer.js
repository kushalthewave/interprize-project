/**
 * Timer.js
 * The reaction clock. Pure logic, driven by explicit tick(dt) calls so it is
 * deterministic and testable (tests/timer.test.js).
 *
 * Model: the round has a total budget of `secondsPerHazard * hazardCount`.
 * A per-hazard clock also runs, resetting each time a hazard is found; that is
 * what decides whether a find counted as "fast" and what the warning state is.
 */
export class Timer {
  /**
   * @param {object} o
   * @param {number} o.secondsPerHazard budget per hazard
   * @param {number} o.hazardCount      hazards in the round
   * @param {number} o.warnAt           fraction of the per-hazard clock left
   *                                    at which the UI should warn
   */
  constructor({ secondsPerHazard = 60, hazardCount = 1, warnAt = 0.25 } = {}) {
    this.secondsPerHazard = secondsPerHazard;
    this.hazardCount = Math.max(1, hazardCount);
    this.warnAt = warnAt;
    this.reset();
  }

  reset() {
    this.total = this.secondsPerHazard * this.hazardCount;
    this.remaining = this.total;
    this.elapsed = 0;
    this.hazardElapsed = 0;
    this.running = false;
    this.finished = false;
  }

  start() {
    this.running = true;
    this.finished = false;
  }

  pause() {
    this.running = false;
  }

  resume() {
    if (!this.finished) this.running = true;
  }

  /** Called when a hazard is found (or skipped): restart the per-hazard clock. */
  nextHazard() {
    this.hazardElapsed = 0;
  }

  /**
   * Advance the clock.
   * @returns {{expired:boolean, hazardExpired:boolean}}
   */
  tick(dt) {
    if (!this.running || this.finished) return { expired: false, hazardExpired: false };

    this.elapsed += dt;
    this.hazardElapsed += dt;
    this.remaining = Math.max(0, this.total - this.elapsed);

    const hazardExpired = this.hazardElapsed >= this.secondsPerHazard;
    if (hazardExpired) this.hazardElapsed = 0;

    const expired = this.remaining <= 0;
    if (expired) {
      this.finished = true;
      this.running = false;
    }
    return { expired, hazardExpired };
  }

  /** Time left on the current hazard's clock. */
  get hazardRemaining() {
    return Math.max(0, this.secondsPerHazard - this.hazardElapsed);
  }

  get warning() {
    return this.hazardRemaining <= this.secondsPerHazard * this.warnAt;
  }

  get critical() {
    return this.hazardRemaining <= Math.min(10, this.secondsPerHazard * 0.15);
  }

  /** mm:ss for the whole round. */
  get display() {
    return Timer.format(this.remaining);
  }

  static format(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
}
