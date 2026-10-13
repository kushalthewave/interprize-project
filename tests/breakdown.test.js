/**
 * The per-category breakdown of a round.
 *
 * The ordering is the feature: the row a trainee should read first has to be
 * at the top, and "you missed every racking hazard" has to be said plainly
 * rather than left for them to work out from a table.
 */
import { describe, it, expect } from 'vitest';
import { categoryBreakdown, breakdownAdvice } from '../src/gameplay/breakdown.js';
import { HAZARDS } from '../src/data/hazards.js';

const idsIn = (category) => HAZARDS.filter((h) => h.category === category).map((h) => h.id);
const round = ({ found = [], missed = [] }) => ({
  finds: found.map((id) => ({ id })),
  missedHazards: missed.map((id) => ({ id })),
});

describe('categoryBreakdown', () => {
  it('counts found and missed per hazard type', () => {
    const vehicle = idsIn('vehicle');
    const rows = categoryBreakdown(round({ found: [vehicle[0]], missed: [vehicle[1]] }));
    const row = rows.find((r) => r.id === 'vehicle');
    expect(row).toMatchObject({ found: 1, missed: 1, total: 2, rate: 0.5 });
    expect(row.label).toBe('Forklift & Vehicle');
  });

  it('puts the weakest category first, which is the one worth reading', () => {
    const vehicle = idsIn('vehicle');
    const storage = idsIn('storage');
    const rows = categoryBreakdown(round({
      found: [vehicle[0], vehicle[1]],
      missed: [storage[0]],
    }));
    expect(rows[0].id).toBe('storage');
  });

  it('breaks a tie by how many hazards the category had', () => {
    const vehicle = idsIn('vehicle');
    const storage = idsIn('storage');
    const rows = categoryBreakdown(round({ missed: [vehicle[0], vehicle[1], storage[0]] }));
    expect(rows[0].id).toBe('vehicle');
    expect(rows.every((r) => r.rate === 0)).toBe(true);
  });

  it('only reports categories the round actually contained', () => {
    const rows = categoryBreakdown(round({ found: [idsIn('vehicle')[0]] }));
    expect(rows).toHaveLength(1);
  });

  it('ignores an id that is not a hazard rather than inventing a row', () => {
    const rows = categoryBreakdown(round({ found: ['not-a-hazard'], missed: [idsIn('floor')[0]] }));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('floor');
  });

  it('returns nothing for an empty round', () => {
    expect(categoryBreakdown({})).toEqual([]);
    expect(categoryBreakdown(round({}))).toEqual([]);
  });
});

describe('breakdownAdvice', () => {
  it('says nothing after a perfect round', () => {
    const rows = categoryBreakdown(round({ found: idsIn('vehicle') }));
    expect(breakdownAdvice(rows)).toBeNull();
  });

  it('calls out a category that was missed completely', () => {
    const storage = idsIn('storage');
    const rows = categoryBreakdown(round({ missed: storage.slice(0, 2) }));
    expect(breakdownAdvice(rows)).toMatch(/missed every/i);
    expect(breakdownAdvice(rows)).toMatch(/hazard guide/i);
  });

  it('names the weakest area and the numbers when it was only partly missed', () => {
    const storage = idsIn('storage');
    const rows = categoryBreakdown(round({ found: [storage[0]], missed: [storage[1]] }));
    expect(breakdownAdvice(rows)).toMatch(/weakest area/i);
    expect(breakdownAdvice(rows)).toContain('1 of 2');
  });

  it('does not claim a pattern from one hazard in a category', () => {
    const rows = categoryBreakdown(round({ missed: [idsIn('electrical')[0]] }));
    expect(breakdownAdvice(rows)).toMatch(/weakest area/i);
    expect(breakdownAdvice(rows)).not.toMatch(/missed every/i);
  });
});
