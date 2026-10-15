/**
 * export.js
 * Taking a training record out of the browser.
 *
 * A supervisor's record has to survive the browser it was made in: a cleared
 * cache, a reimaged machine, or simply a different person asking "what did
 * they score". The database solves that where there is one, but a site using
 * the offline build has no database, and a tutor or auditor usually wants a
 * file rather than a login.
 *
 * CSV because it opens in Excel and in Google Sheets without anything being
 * installed, which is the same reason the whole product runs in a browser.
 */

/** RFC 4180: quotes doubled, and a field containing a comma, quote or newline is quoted. */
export function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {string[]} headers
 * @param {(string|number|null)[][]} rows
 */
export function toCsv(headers, rows) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const iso = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

/**
 * One round per row, in the order a person reads them.
 *
 * Takes the rows as the history screen has them, so the file matches what is
 * on screen: a file that disagrees with the page it came from is worse than
 * no file.
 *
 * @param {object[]} rounds
 * @param {object} [o]
 * @param {string} [o.name]  who these belong to
 */
/**
 * Accuracy as a percentage, the same definition ScoreManager uses:
 * correct out of the flags that were actually made.
 *
 * It is computed from the counts rather than read from the round, because the
 * two sources disagree: the database stores a fraction (0.85) and the column
 * is headed with a per cent sign. A stored value is only used when the counts
 * cannot give an answer, and is scaled if it looks like a fraction.
 */
function accuracyPercent(r) {
  const correct = Number(r.correct);
  const wrong = Number(r.wrong);
  if (Number.isFinite(correct) && Number.isFinite(wrong) && correct + wrong > 0) {
    return Math.round((correct / (correct + wrong)) * 1000) / 10;
  }
  const stored = Number(r.accuracy);
  if (!Number.isFinite(stored)) return '';
  return stored <= 1 ? Math.round(stored * 1000) / 10 : stored;
}

/**
 * @param {object[]} rounds
 * @param {object} [o]
 * @param {string} [o.name] the trainee, repeated on every row
 * @param {(id: string) => string} [o.siteName] turns env01 into Main Storage
 *   Hall. Passed in rather than imported: this file stays free of the 3D
 *   engine so it can be tested without one.
 */
export function roundsToCsv(rounds, { name = '', siteName = (id) => id ?? '' } = {}) {
  const headers = [
    'Trainee', 'Played at', 'Warehouse', 'Mode', 'Difficulty',
    'Score', 'Rank', 'Hazards found', 'Hazards total', 'Wrong flags', 'Accuracy %',
  ];
  const rows = rounds.map((r) => [
    name,
    iso(r.played_at ?? r.at),
    siteName(r.environment) ?? '',
    r.mode ?? '',
    r.mode === 'train' ? '' : (r.difficulty ?? ''),
    r.score ?? 0,
    r.rank ?? '',
    r.correct ?? 0,
    r.total_hazards ?? r.total ?? 0,
    r.wrong ?? '',
    accuracyPercent(r),
  ]);
  return toCsv(headers, rows);
}

/** A file name a supervisor can file without renaming it. */
export function exportFilename(name, { now = () => new Date() } = {}) {
  const stamp = now().toISOString().slice(0, 10);
  const who = String(name || 'trainee').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `beat-the-hazard-${who || 'trainee'}-${stamp}.csv`;
}

/**
 * Hand the file to the browser. Separated from the formatting above so the
 * formatting can be tested without a DOM.
 */
export function downloadText(filename, text, { doc = document } = {}) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.append(a);
  a.click();
  a.remove();
  // Revoke on the next tick: Safari has been known to cancel the download if
  // the URL disappears in the same frame as the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
