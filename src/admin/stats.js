/**
 * stats.js
 * The totals across every account, worked out in the page rather than in the
 * database: it is three sums over a list that is already loaded, and keeping
 * it here means it can be unit tested without a browser or a connection.
 */

/**
 * @param {{rounds_played?:number|null, best_score?:number|null}[]} rows
 *        one row per account, as public.admin_overview returns them
 */
export function overallStats(rows) {
  const num = (v) => Number(v) || 0;
  return {
    accounts: rows.length,
    trained: rows.filter((r) => num(r.rounds_played) > 0).length,
    totalRounds: rows.reduce((n, r) => n + num(r.rounds_played), 0),
    best: rows.reduce((n, r) => Math.max(n, num(r.best_score)), 0),
  };
}
