/**
 * admin/main.js
 * The supervisor's view: who has an account, and how they are doing.
 *
 * This page has no privileges of its own. It signs in with the same public
 * key as the game and asks the database for every account; the database
 * answers with everything only if that account's role is 'admin', and with
 * nothing otherwise. Hiding the page would not be security, so the page is
 * not hidden: the policy in the database is the control.
 */
import '../ui/styles.css';
import './admin.css';
import { el, mount } from '../ui/dom.js';
import { db } from '../services/db/client.js';
import { ENVIRONMENTS } from '../environment/registry.js';
import { DIFFICULTIES } from '../data/config.js';
import { overallStats } from './stats.js';

const root = document.getElementById('admin');
const siteName = (id) => ENVIRONMENTS.find((e) => e.meta.id === id)?.meta.name ?? id ?? '—';
const when = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};
const day = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

function shell(...children) {
  return el('div.admin-shell', {}, [
    el('header.admin-head', {}, [
      el('div', {}, [
        el('h1', { text: 'Beat The Hazard' }),
        el('p', { text: 'Training records' }),
      ]),
      db.signedIn && el('div.admin-who', {}, [
        el('span', { text: db.email ?? '' }),
        el('button.btn.btn-sm', {
          text: 'Sign out',
          on: { click: async () => { await db.signOut(); render(); } },
        }),
      ]),
    ]),
    el('main.admin-main', {}, children),
  ]);
}

function notConfigured() {
  return shell(el('div.card', {}, [
    el('h2', { text: 'No results service' }),
    el('p', { text: 'This build was made without a database, so there are no records to show. Training still works; results stay on each computer.' }),
  ]));
}

function signIn() {
  const email = el('input', { type: 'email', id: 'ad-email', autocomplete: 'username', placeholder: 'name@example.com' });
  const password = el('input', { type: 'password', id: 'ad-password', autocomplete: 'current-password' });
  const error = el('div.auth-error', { role: 'alert' });
  const button = el('button.btn.btn-primary.btn-block', { type: 'submit', text: 'Sign in' });

  const form = el('form.stack', {
    noValidate: true,
    on: {
      async submit(e) {
        e.preventDefault();
        error.textContent = '';
        button.disabled = true;
        try {
          await db.signIn({ email: email.value.trim(), password: password.value });
          render();
        } catch (err) {
          error.textContent = err.message;
          error.classList.add('show');
        } finally {
          button.disabled = false;
        }
      },
    },
  }, [
    el('div.field', {}, [el('label', { for: 'ad-email', text: 'Email address' }), email]),
    el('div.field', {}, [el('label', { for: 'ad-password', text: 'Password' }), password]),
    error,
    button,
  ]);

  return shell(el('div.card.admin-signin', {}, [
    el('h2', { text: 'Supervisor sign in' }),
    el('p.faint', { text: 'Use the account that has been given the admin role.' }),
    form,
  ]));
}

function accountsTable(rows, onPick) {
  return el('table.prog-table', {}, [
    el('thead', {}, [el('tr', {}, [
      el('th', { text: 'Name' }),
      el('th', { text: 'Email' }),
      el('th', { text: 'Joined' }),
      el('th', { text: 'Rounds', style: { textAlign: 'right' } }),
      el('th', { text: 'Best', style: { textAlign: 'right' } }),
      el('th', { text: 'Average', style: { textAlign: 'right' } }),
      el('th', { text: 'Last played' }),
      el('th', {}),
    ])]),
    el('tbody', {}, rows.map((r) => el('tr', {}, [
      el('td', {}, [el('strong', { text: r.name || '—' })]),
      el('td', { text: r.email ?? '—' }),
      el('td', { text: day(r.created_at) }),
      el('td.num', { text: String(r.rounds_played ?? 0) }),
      el('td.num', { text: String(r.best_score ?? 0) }),
      el('td.num', { text: String(r.average_score ?? 0) }),
      el('td', { text: r.last_played ? when(r.last_played) : 'Never' }),
      el('td', {}, [
        Number(r.rounds_played) > 0 && el('button.btn.btn-sm', {
          text: 'Rounds',
          on: { click: () => onPick(r) },
        }),
      ]),
    ]))),
  ]);
}

function roundsTable(rows) {
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
      el('td', { text: r.mode === 'train' ? 'Training' : `Test · ${DIFFICULTIES[r.difficulty]?.label ?? r.difficulty}` }),
      el('td.num', { text: `${r.correct ?? 0}/${r.total_hazards ?? 0}` }),
      el('td.num', { text: String(r.score ?? 0) }),
      el('td', { text: r.rank ?? '—' }),
    ]))),
  ]);
}

async function dashboard() {
  const body = el('div', {}, [el('p.faint', { text: 'Loading…' })]);
  const view = shell(body);
  mount(root, view);

  let rows;
  try {
    rows = await db.adminAccounts();
  } catch (err) {
    mount(body, el('div.card', {}, [
      el('h2', { text: 'Could not load the records' }),
      el('p', { text: err.message }),
    ]));
    return;
  }

  if (rows.length === 0) {
    mount(body, el('div.card', {}, [
      el('h2', { text: 'Nothing to show yet' }),
      el('p', {
        text: 'Either no accounts have been created, or this account does not have the admin role. '
          + 'The database decides what you can see, so an ordinary account sees only its own rows.',
      }),
    ]));
    return;
  }

  const s = overallStats(rows);
  const stat = (v, k) => el('div.stat-box', {}, [el('div.v', { text: String(v) }), el('div.k', { text: k })]);
  const detail = el('div');

  mount(body,
    el('div.stat-grid', {}, [
      stat(s.accounts, 'Accounts'),
      stat(s.trained, 'Have trained'),
      stat(s.totalRounds, 'Rounds played'),
      stat(s.best, 'Highest score'),
    ]),
    el('div.card.mt', {}, [
      el('h2', { text: 'Accounts' }),
      accountsTable(rows, async (row) => {
        mount(detail, el('div.card.mt', {}, [el('p.faint', { text: `Loading ${row.name}'s rounds…` })]));
        try {
          const sessions = await db.accountSessions(row.id);
          mount(detail, el('div.card.mt', {}, [
            el('h2', { text: `${row.name || row.email} · ${sessions.length} round${sessions.length === 1 ? '' : 's'}` }),
            sessions.length ? roundsTable(sessions) : el('p.faint', { text: 'No rounds.' }),
          ]));
        } catch (err) {
          mount(detail, el('div.card.mt', {}, [el('p', { text: err.message })]));
        }
      }),
    ]),
    detail,
  );
}

function render() {
  if (!db.configured) { mount(root, notConfigured()); return; }
  if (!db.signedIn) { mount(root, signIn()); return; }
  dashboard();
}

render();
