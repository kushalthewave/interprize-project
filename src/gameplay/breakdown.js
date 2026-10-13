/**
 * breakdown.js
 * What a round says about a trainee, by hazard category.
 *
 * A score tells somebody they did badly. It does not tell them what to work
 * on. The seven categories in the hazard knowledge base do: "you found every
 * spill and missed three of the four racking problems" is something a person
 * can act on before their next round, and something a supervisor can act on
 * across a site.
 *
 * Pure: takes a finished summary, returns rows. No DOM, no Three.js.
 */
import { HAZARDS, HAZARD_CATEGORIES } from '../data/hazards.js';

/**
 * @param {object} summary a finished round
 * @param {object} [o]
 * @param {object[]} [o.hazards]
 * @returns {{id:string, label:string, found:number, missed:number, total:number,
 *            rate:number}[]} worst first, then by size
 */
export function categoryBreakdown(summary, { hazards = HAZARDS } = {}) {
  const byId = new Map(hazards.map((h) => [h.id, h]));
  const rows = new Map();

  const touch = (id) => {
    const h = byId.get(id);
    if (!h) return null;
    if (!rows.has(h.category)) {
      rows.set(h.category, {
        id: h.category,
        label: HAZARD_CATEGORIES[h.category]?.label ?? h.category,
        found: 0,
        missed: 0,
      });
    }
    return rows.get(h.category);
  };

  for (const f of summary?.finds ?? []) {
    const row = touch(f.id);
    if (row) row.found += 1;
  }
  for (const m of summary?.missedHazards ?? []) {
    const row = touch(m.id);
    if (row) row.missed += 1;
  }

  return [...rows.values()]
    .map((r) => ({ ...r, total: r.found + r.missed, rate: r.found / (r.found + r.missed) }))
    .sort((a, b) => a.rate - b.rate || b.total - a.total || a.label.localeCompare(b.label));
}

/**
 * One sentence a trainee can act on, or null when the round says nothing
 * useful: a perfect round needs no advice, and a single category is not a
 * pattern.
 */
export function breakdownAdvice(rows) {
  const weak = rows.filter((r) => r.missed > 0);
  if (weak.length === 0) return null;

  const worst = weak[0];
  if (worst.found === 0 && worst.total > 1) {
    return `You missed every ${worst.label.toLowerCase()} hazard in this round. Read that section of the Hazard Guide before trying again.`;
  }
  return `Your weakest area was ${worst.label.toLowerCase()}: ${worst.missed} of ${worst.total} missed.`;
}
