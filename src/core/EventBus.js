/**
 * EventBus.js
 * Minimal typed-ish pub/sub used to decouple gameplay systems from the UI.
 * Systems emit; the UI listens. Nothing in src/gameplay touches the DOM.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /** @returns {() => void} unsubscribe function */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (...args) => {
      off();
      handler(...args);
    });
    return off;
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy so handlers may unsubscribe during dispatch.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${event}" threw:`, err);
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

/** Application-wide bus. */
export const bus = new EventBus();

/** Canonical event names, kept in one place to avoid typo bugs. */
export const EV = {
  // game lifecycle
  GAME_START: 'game:start',
  GAME_END: 'game:end',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_TICK: 'game:tick',
  // hazards
  HAZARD_FOUND: 'hazard:found',
  HAZARD_WRONG: 'hazard:wrong',
  HAZARD_EXPIRED: 'hazard:expired',
  HAZARD_FOCUS: 'hazard:focus',
  HAZARD_TARGET: 'hazard:target',
  // scoring
  SCORE_CHANGED: 'score:changed',
  COMBO_START: 'combo:start',
  COMBO_BREAK: 'combo:break',
  // train mode
  TRAIN_STEP: 'train:step',
  TRAIN_COMPLETE: 'train:complete',
  // ui / app
  SCREEN_CHANGE: 'app:screen',
  TOAST: 'ui:toast',
  ACHIEVEMENT: 'profile:achievement',
  PROFILE_CHANGED: 'profile:changed',
  LOADING: 'app:loading',
};
