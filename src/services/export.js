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
export function roundsToCsv(rounds, { name = '' } = {}) {
  const headers = [
    'Trainee', 'Played at', 'Warehouse', 'Mode', 'Difficulty',
    'Score', 'Rank', 'Hazards found', 'Hazards total', 'Wrong flags', 'Accuracy %',
  ];
  const rows = rounds.map((r) => [
    name,
    iso(r.played_at ?? r.at),
    r.environment ?? '',
    r.mode ?? '',
    r.mode === 'train' ? '' : (r.difficulty ?? ''),
    r.score ?? 0,
    r.rank ?? '',
    r.correct ?? 0,
    r.total_hazards ?? r.total ?? 0,
    r.wrong ?? '',
    r.accuracy ?? '',
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
