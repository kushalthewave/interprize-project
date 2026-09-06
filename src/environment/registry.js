/**
 * registry.js
 * Single place that knows which environments exist. Adding an environment is
 * one import plus one array entry - no other file changes.
 */
import * as env01 from './scenes/env01.js';
import * as env02 from './scenes/env02.js';
import * as env03 from './scenes/env03.js';

export const ENVIRONMENTS = [env01, env02, env03].sort(
  (a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99),
);

export const ENVIRONMENT_IDS = ENVIRONMENTS.map((e) => e.meta.id);

export function getEnvironment(id) {
  return ENVIRONMENTS.find((e) => e.meta.id === id) ?? null;
}
