/**
 * HistoryScreen.js
 * "Your history": every round this trainee has played.
 *
 * Reads from the database when an account is signed in, so the list follows
 * the person to any computer they log in on. With no database configured, no
 * account, or no connection, it falls back to the rounds saved on this
 * device and says so, rather than showing an empty page and looking broken.
 */
import { el, mount } from './dom.js';
import { DIFFICULTIES } from '../data/config.js';
import { ENVIRONMENTS } from '../environment/registry.js';
import { db } from '../services/db/client.js';
import { queueSize } from '../services/db/sync.js';
import { roundsToCsv, exportFilename, downloadText } from '../services/export.js';

const siteName = (id) => ENVIRONMENTS.find((e) => e.meta.id === id)?.meta.name ?? id ?? '—';
const modeLabel = (r) =>
  (r.mode === 'train' ? 'Training' : `Test · ${DIFFICULTIES[r.difficulty]?.label ?? r.difficulty ?? ''}`);

function when(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * The game's own saved history, shaped like a row from the database, with
 * each round's integrity state carried through so an edited one can be shown
 * as what it is.
 */
function localRows(profile) {
  return profile.historyWithIntegrity().map(({ entry: h, state }) => ({
    played_at: new Date(h.at).toISOString(),
    mode: h.mode,
    environment: h.environment,
    difficulty: h.difficulty,
    score: h.score,
    rank: h.rank,
    correct: h.correct,
    // The stored round has this; without it the Wrong flags column in the
    // exported file was always empty for a round played on this device.
    wrong: h.wrong,
    total_hazards: h.total,
    integrity: state,
  }));
}

function table(rows) {
  return el('table.prog-table', {}, [
    el('thead', {}, [el('tr', {}, [
      el('th', { text: 'When' }),
      el('th', { text: 'Warehouse' }),
      el('th', { text: 'Mode' }),
      el('th', { text: 'Found', style: { textAlign: 'right' } }),
      el('th', { text: 'Score', style: { textAlign: 'right' } }),
      el('th', { text: 'Rank' }),
    ])]),
    el('tbody', {}, rows.map((r) => el('tr', {}, [
      el('td', { text: when(r.played_at) }),
      el('td', { text: siteName(r.environment) }),
      el('td', { text: modeLabel(r) }),
      el('td.num', { text: `${r.correct ?? 0}/${r.total_hazards ?? 0}` }),
      el('td.num', { text: String(r.score ?? 0) }),
      el('td', {}, [
        r.rank ?? '—',
        // A round stored on this computer whose values no longer match its
        // tag. Said plainly rather than hidden: a supervisor reading this
        // needs to know which numbers to trust.
        r.integrity === 'edited' && el('span.tag.tag-major', { text: 'Unverified', title: 'This round was changed after it was saved.' }),
      ]),
    ]))),
  ]);
}

function summaryBoxes(rows) {
  const scores = rows.map((r) => Number(r.score) || 0);
  const best = scores.length ? Math.max(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const stat = (v, k) => el('div.stat-box', {}, [el('div.v', { text: String(v) }), el('div.k', { text: k })]);
  return el('div.stat-grid', {}, [
    stat(rows.length, 'Rounds played'),
    stat(best, 'Best score'),
    stat(avg, 'Average score'),
  ]);
}

/**
 * @param {object} ctx
 * @param {object} [o]
 * @param {object} [o.client] injectable for tests
 */
export function historyScreen(ctx, { client = db } = {}) {
  const body = el('div.card.mt', {}, [el('p.faint', { text: 'Loading your rounds…' })]);
  const head = el('div', {});
  // Whatever the table is currently showing, so the file always matches the
  // page rather than quietly exporting something else.
  let shown = [];

  const download = el('button.btn', {
    text: 'Download as CSV',
    disabled: true,
    // A greyed out button with no reason on it reads as broken.
    title: 'Finish a round and this will save your history as a spreadsheet file.',
    on: {
      click: () => {
        const who = ctx.profile?.name ?? '';
        downloadText(exportFilename(who), roundsToCsv(shown, { name: who, siteName }));
      },
    },
  });

  const show = (rows, note) => {
    shown = rows;
    download.disabled = rows.length === 0;
    mount(body,
      el('h3', { text: 'Your rounds' }),
      rows.length
        ? table(rows)
        : el('p.faint', { text: 'No rounds yet. Finish a training round or a test and it will appear here.' }),
      note ? el('p.faint.mt', { text: note }) : null,
    );
    head.replaceChildren(summaryBoxes(rows));
  };

  // Show what is on this device straight away: a page that waits on the
  // network before showing anything feels broken on a slow connection.
  const local = localRows(ctx.profile);

  if (!client.configured) {
    show(local, 'Saved on this computer. This build has no results service, so the list does not follow you to another machine.');
  } else if (!client.signedIn) {
    show(local, 'Saved on this computer. Log in with your account to see rounds from every computer you use.');
  } else {
    show(local, 'Loading the rest from your account…');
    client.mySessions({ limit: 100 })
      .then((rows) => {
        const waiting = queueSize();
        show(rows.length ? rows : local,
          waiting
            ? `${waiting} round${waiting === 1 ? '' : 's'} on this computer have not been uploaded yet. They will go up automatically.`
            : 'From your account, so this is every computer you have trained on.');
      })
      .catch(() => {
        show(local, 'Could not reach your account just now, so these are the rounds saved on this computer.');
      });
  }

  return el('div.screen', {}, [
    el('div.screen-inner.wide', {}, [
      el('div.section-head', {}, [
        el('h2', { text: 'Your history' }),
        el('p', { text: 'Every round you have played, newest first.' }),
      ]),
      head,
      body,
      el('div.row.mt', {}, [
        el('button.btn', { text: '← Back', on: { click: () => ctx.go('menu') } }),
        download,
      ]),
    ]),
  ]);
}
