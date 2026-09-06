/**
 * Screens.js
 * Every full-screen menu, rendered as plain DOM.
 *
 * Each renderer takes (ctx) where ctx exposes { profile, go, actions, ... }
 * and returns an HTMLElement. Screens never touch the 3D scene directly.
 */
import { el, secs, pct } from './dom.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, ACHIEVEMENTS, RANKS } from '../data/config.js';
import { HAZARDS, HAZARD_CATEGORIES } from '../data/hazards.js';
import { ENVIRONMENTS } from '../environment/registry.js';

const AVATARS = {
  male: { face: '🧑🏽‍🏭', label: 'Ramesh', sub: 'Daura-surwal inspired · dhaka topi' },
  female: { face: '👩🏽‍🏭', label: 'Sunita', sub: 'Kurti-surwal inspired · dupatta' },
};

function brand(sub = 'Warehouse Forklift & Pedestrian Safety Training') {
  return el('div.brand', {}, [
    el('h1', { text: 'BEAT THE HAZARD' }),
    el('p', { text: sub }),
    el('div.flagline', {}, ['🇳🇵', 'Himalaya Logistics · Birgunj Distribution Centre']),
  ]);
}

function backBar(ctx, to = 'menu', label = '← Back') {
  return el('div.row.mt', {}, [
    el('button.btn.btn-ghost', { text: label, on: { click: () => ctx.go(to) } }),
  ]);
}

/* ================================================================== *
 * Login
 * ================================================================== */
export function loginScreen(ctx) {
  const nameInput = el('input', {
    type: 'text',
    placeholder: 'e.g. Sunita Shrestha',
    maxLength: 32,
    value: ctx.profile.name || '',
    autocomplete: 'name',
    id: 'trainee-name',
  });

  let avatar = ctx.profile.avatar || 'male';
  const opts = Object.entries(AVATARS).map(([key, a]) =>
    el(`button.avatar-opt${key === avatar ? '.selected' : ''}`, {
      type: 'button',
      'aria-pressed': key === avatar,
      on: {
        click: (e) => {
          avatar = key;
          for (const n of e.currentTarget.parentElement.children) n.classList.remove('selected');
          e.currentTarget.classList.add('selected');
        },
      },
    }, [
      el('span.face', { text: a.face }),
      el('span.label', { text: a.label }),
      el('span.sub', { text: a.sub }),
    ]),
  );

  const err = el('div.faint', { style: { color: 'var(--danger)', minHeight: '1.1rem' } });

  const submit = () => {
    const name = nameInput.value.trim();
    if (name.length < 2) {
      err.textContent = 'Please enter a name of at least 2 characters.';
      nameInput.focus();
      return;
    }
    ctx.actions.signIn({ name, avatar });
  };

  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  const googleConfigured = !!ctx.googleClientId;

  return el('div.screen', {}, [
    el('div.screen-inner.narrow', {}, [
      brand(),
      el('div.card.stack', {}, [
        el('div.section-head', {}, [
          el('h2', { text: 'Start training' }),
          el('p', { text: 'Your name and progress are stored on this device only.' }),
        ]),
        el('div', {}, [el('label', { for: 'trainee-name', text: 'Your name' }), nameInput]),
        el('div', {}, [el('label', { text: 'Choose your avatar' }), el('div.avatar-grid', {}, opts)]),
        err,
        el('button.btn.btn-primary.btn-lg.btn-block', { text: 'Enter the warehouse', on: { click: submit } }),
        el('div.row.between', { style: { marginTop: '0.3rem' } }, [
          el('button.btn.btn-sm.btn-ghost', {
            text: 'Continue as guest',
            on: { click: () => ctx.actions.signIn({ name: 'Trainee', avatar }) },
          }),
          googleConfigured
            ? el('button.btn.btn-sm', { text: 'Sign in with Google', on: { click: () => ctx.actions.googleSignIn() } })
            : el('span.faint', {
                text: 'Google sign-in not configured',
                title: 'Set VITE_GOOGLE_CLIENT_ID in .env to enable Google sign-in.',
              }),
        ]),
      ]),
      el('p.faint.center.mt', {
        text: 'This is a training simulation. Hazards shown are staged for teaching purposes.',
      }),
    ]),
  ]);
}

/* ================================================================== *
 * Main menu
 * ================================================================== */
export function menuScreen(ctx) {
  const p = ctx.profile;
  const a = AVATARS[p.avatar] ?? AVATARS.male;
  const completion = p.completion(ENVIRONMENTS.map((e) => e.meta.id));

  const tile = (icon, title, desc, to, primary = false) =>
    el(`button.menu-tile${primary ? '.primary' : ''}`, { on: { click: () => ctx.go(to) } }, [
      el('span.icon', { text: icon }),
      el('span.title', { text: title }),
      el('span.desc', { text: desc }),
    ]);

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.userbar', {}, [
        el('div.who', {}, [
          el('div.avatar-chip', { text: a.face }),
          el('div', {}, [
            el('div', { text: p.name || 'Trainee', style: { fontWeight: '800' } }),
            el('div.faint', { text: `Best score ${p.data.stats.bestScore} · ${p.data.achievements.length}/${ACHIEVEMENTS.length} achievements` }),
          ]),
        ]),
        el('div.row', {}, [
          el('span.stat-pill', { text: `${Math.round(completion * 100)}% complete` }),
          el('button.btn.btn-sm', { text: 'Profile', on: { click: () => ctx.go('profile') } }),
        ]),
      ]),
      brand(),
      el('div.menu-grid', {}, [
        tile('🎓', 'Train Mode', 'Guided tour. Hazards are highlighted and explained. Unlocks testing.', 'train-select', true),
        tile('🎯', 'Test Mode', 'Find the hazards yourself against the clock. Scored and ranked.', 'test-select', true),
        tile('🏭', 'Environments', 'Three warehouses: general storage, dispatch bay and high-bay annexe.', 'environments'),
        tile('📊', 'Progress', 'Scores, ranks, achievements and your session history.', 'progress'),
        tile('📖', 'Hazard Guide', 'Reference for all 15 hazard types and their controls.', 'guide'),
        tile('⚙️', 'Settings', 'Audio, motion, accessibility and data.', 'settings'),
      ]),
      el('p.faint.center.mt', { text: 'Desktop: mouse + keyboard. Tablet/phone: on-screen sticks.' }),
    ]),
  ]);
}

/* ================================================================== *
 * Environment select
 * ================================================================== */
export function environmentScreen(ctx, { mode = 'test' } = {}) {
  const p = ctx.profile;
  const cards = ENVIRONMENTS.map((env, i) => {
    const m = env.meta;
    const prog = p.envProgress(m.id);
    const best = Math.max(prog.simple ?? 0, prog.mid ?? 0, prog.hard ?? 0);
    const locked = mode === 'test' && !p.isUnlocked(m.id, 'simple');
    const reason = locked ? p.lockReason(m.id, 'simple') : '';

    return el(`button.select-card${locked ? '.locked' : ''}`, {
      disabled: locked,
      title: reason,
      on: {
        click: () => {
          if (locked) return;
          if (mode === 'train') ctx.actions.startTrain(m.id);
          else ctx.go('difficulty', { environment: m.id });
        },
      },
    }, [
      el('span.num', { text: String(i + 1) }),
      el('span.sub', { text: m.subtitle }),
      el('span.name', { text: m.name }),
      el('span.desc', { text: m.description }),
      el('div.meta', {}, [
        el('span.stat-pill', { text: `${m.hazardCount} hazards` }),
        el('span.stat-pill', { text: `${m.size.width}×${m.size.depth} m` }),
        prog.train ? el('span.stat-pill', { text: '✓ Trained' }) : el('span.stat-pill', { text: 'Not trained' }),
        best > 0 && el('span.stat-pill', { text: `Best ${best}` }),
      ]),
      locked && el('span.lock', { text: `🔒 ${reason}` }),
    ]);
  });

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [
        el('h2', { text: mode === 'train' ? 'Train Mode · choose a site' : 'Test Mode · choose a site' }),
        el('p', {
          text: mode === 'train'
            ? 'Training highlights every hazard and explains it. Complete a site to unlock testing there.'
            : 'You will be scored on what you find, how fast, and how few wrong calls you make.',
        }),
      ]),
      el('div.grid.grid-3', {}, cards),
      backBar(ctx),
    ]),
  ]);
}

/* ================================================================== *
 * Difficulty select
 * ================================================================== */
export function difficultyScreen(ctx, { environment }) {
  const p = ctx.profile;
  const env = ENVIRONMENTS.find((e) => e.meta.id === environment);
  const prog = p.envProgress(environment);

  const cards = DIFFICULTY_ORDER.map((id) => {
    const d = DIFFICULTIES[id];
    const locked = !p.isUnlocked(environment, id);
    const reason = locked ? p.lockReason(environment, id) : '';
    const best = prog[id] ?? 0;

    return el(`button.select-card.diff-${id}${locked ? '.locked' : ''}`, {
      disabled: locked,
      title: reason,
      on: { click: () => !locked && ctx.actions.startTest(environment, id) },
    }, [
      el('span.name', { text: d.label }),
      el('span.desc', { text: d.blurb }),
      el('div.meta', {}, [
        el('span.stat-pill', { text: `${d.secondsPerHazard}s per hazard` }),
        el('span.stat-pill', { text: `×${d.scoreMultiplier} score` }),
        el('span.stat-pill', { text: d.highlightHazards ? 'Hazards highlighted' : 'No highlights' }),
        el('span.stat-pill', { text: `${d.decoyCount} decoys` }),
        d.movingHazards && el('span.stat-pill', { text: 'Moving hazards' }),
        best > 0 && el('span.stat-pill', { text: `Best ${best}` }),
      ]),
      locked && el('span.lock', { text: `🔒 ${reason}` }),
    ]);
  });

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [
        el('h2', { text: `${env?.meta.name ?? 'Site'} · choose difficulty` }),
        el('p', { text: 'Difficulty changes the clock, the lighting, the number of decoys and whether hazards move.' }),
      ]),
      el('div.grid.grid-3', {}, cards),
      el('div.row.mt', {}, [
        el('button.btn.btn-ghost', { text: '← Back', on: { click: () => ctx.go('test-select') } }),
      ]),
    ]),
  ]);
}

/* ================================================================== *
 * Results
 * ================================================================== */
export function resultsScreen(ctx, { summary }) {
  const s = summary;
  const env = ENVIRONMENTS.find((e) => e.meta.id === s.environment);
  const isTrain = s.mode === 'train';

  const foundRows = s.finds.map((f) => {
    const h = HAZARDS.find((x) => x.id === f.id);
    return el('div.hazard-row.found', {}, [
      el('span.mark', { text: '✓' }),
      el('div', { style: { flex: '1' } }, [
        el('div.hz-name', { text: h?.name ?? f.id }),
        el('div.hz-tip', { text: h?.safetyTip ?? '' }),
      ]),
      el('span.hz-time', { text: `${secs(f.reactionTime)} · +${f.points}` }),
    ]);
  });

  const missedRows = (s.missedHazards ?? []).map((h) =>
    el('div.hazard-row.missed', {}, [
      el('span.mark', { text: '✗' }),
      el('div', { style: { flex: '1' } }, [
        el('div.hz-name', {}, [h.name, ' ', el(`span.tag.tag-${h.severity}`, { text: h.severity })]),
        el('div.hz-tip', { text: h.safetyTip }),
      ]),
    ]),
  );

  const stat = (v, k) => el('div.stat-box', {}, [el('div.v', { text: v }), el('div.k', { text: k })]);

  const achNodes = (s.newAchievements ?? [])
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => el('div.ach.unlocked', {}, [
      el('span.ic', { text: a.icon }),
      el('div', {}, [el('div.t', { text: a.label }), el('div.d', { text: a.desc })]),
    ]));

  return el('div.screen', {}, [
    el('div.screen-inner.wide', {}, [
      el('div.result-hero', {}, [
        el('div.faint', { text: `${isTrain ? 'Training' : 'Test'} complete · ${env?.meta.name ?? ''} · ${s.difficulty}` }),
        el('div.result-score', { text: String(s.score) }),
        el('div.result-rank', {
          text: s.rank.label,
          style: { background: `${s.rank.color}22`, color: s.rank.color, border: `1px solid ${s.rank.color}66` },
        }),
        el('div.result-sub', {
          text: s.reason === 'timeout'
            ? 'The clock ran out.'
            : s.reason === 'quit'
              ? 'Round ended early.'
              : 'Every hazard found.',
        }),
      ]),

      el('div.grid.grid-2', {}, [
        el('div.card', {}, [
          el('h3', { text: 'Performance' }),
          el('div.stat-grid', {}, [
            stat(String(s.correct), 'Correct'),
            stat(String(s.wrong), 'Wrong flags'),
            stat(`${s.correct}/${s.totalHazards}`, 'Hazards found'),
            stat(pct(s.accuracy), 'Accuracy'),
            stat(secs(s.averageReactionTime), 'Avg reaction'),
            stat(`x${s.bestCombo}`, 'Best combo'),
            stat(String(s.attempts), 'Attempts'),
            stat(`×${s.multiplier}`, 'Difficulty'),
          ]),
          s.comboBonusTotal > 0 && el('p.faint.mt', { text: `Combo bonus contributed ${s.comboBonusTotal} raw points.` }),
        ]),
        el('div.card', {}, [
          el('h3', { text: 'How to improve' }),
          el('div.tips-list', {}, (s.tips ?? []).map((t) => el('div.tip-item', { text: t }))),
          (s.improvementAreas ?? []).length > 0 && el('div.mt', {}, [
            el('div.faint.mb', { text: 'Weakest hazard categories this round:' }),
            el('div.row', { style: { flexWrap: 'wrap' } },
              s.improvementAreas.map((a) =>
                el('span.stat-pill', {
                  text: `${HAZARD_CATEGORIES[a.category]?.label ?? a.category} (${a.count} missed)`,
                }))),
          ]),
        ]),
      ]),

      achNodes.length > 0 && el('div.card.mt', {}, [
        el('h3', { text: '🏅 New achievements' }),
        el('div.ach-grid', {}, achNodes),
      ]),

      el('div.grid.grid-2.mt', {}, [
        el('div.card', {}, [
          el('h3', { text: `✓ Hazards you found (${s.correct})` }),
          foundRows.length ? el('div.hazard-list', {}, foundRows) : el('p.faint', { text: 'None found this round.' }),
        ]),
        el('div.card', {}, [
          el('h3', { text: `✗ Hazards you missed (${missedRows.length})` }),
          missedRows.length ? el('div.hazard-list', {}, missedRows) : el('p.faint', { text: 'Nothing missed. Excellent.' }),
        ]),
      ]),

      el('div.row.mt', { style: { flexWrap: 'wrap' } }, [
        el('button.btn.btn-primary', { text: '↻ Retry this round', on: { click: () => ctx.actions.retry() } }),
        !isTrain && el('button.btn', { text: 'Change difficulty', on: { click: () => ctx.go('difficulty', { environment: s.environment }) } }),
        isTrain && el('button.btn', { text: '🎯 Go to Test Mode', on: { click: () => ctx.go('difficulty', { environment: s.environment }) } }),
        el('button.btn', { text: 'Other environments', on: { click: () => ctx.go(isTrain ? 'train-select' : 'test-select') } }),
        el('button.btn.btn-ghost', { text: 'Main menu', on: { click: () => ctx.go('menu') } }),
      ]),
    ]),
  ]);
}

/* ================================================================== *
 * Profile
 * ================================================================== */
export function profileScreen(ctx) {
  const p = ctx.profile;
  const st = p.data.stats;
  const a = AVATARS[p.avatar] ?? AVATARS.male;

  const nameInput = el('input', { type: 'text', value: p.name, maxLength: 32, id: 'pf-name' });
  let avatar = p.avatar;
  const avOpts = Object.entries(AVATARS).map(([key, av]) =>
    el(`button.avatar-opt${key === avatar ? '.selected' : ''}`, {
      type: 'button',
      on: {
        click: (e) => {
          avatar = key;
          for (const n of e.currentTarget.parentElement.children) n.classList.remove('selected');
          e.currentTarget.classList.add('selected');
        },
      },
    }, [el('span.face', { text: av.face }), el('span.label', { text: av.label }), el('span.sub', { text: av.sub })]),
  );

  const stat = (v, k) => el('div.stat-box', {}, [el('div.v', { text: v }), el('div.k', { text: k })]);

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [el('h2', { text: 'Profile' }), el('p', { text: 'Stored locally on this device.' })]),
      el('div.grid.grid-2', {}, [
        el('div.card.stack', {}, [
          el('h3', { text: 'Trainee details' }),
          el('div', {}, [el('label', { for: 'pf-name', text: 'Name' }), nameInput]),
          el('div', {}, [el('label', { text: 'Avatar' }), el('div.avatar-grid', {}, avOpts)]),
          el('button.btn.btn-primary.btn-block', {
            text: 'Save changes',
            on: {
              click: () => {
                p.signIn({ name: nameInput.value.trim() || 'Trainee', avatar, provider: p.data.authProvider });
                ctx.actions.toast('Profile saved', 'ok');
                ctx.go('profile');
              },
            },
          }),
          el('div.faint', { text: `Signed in via: ${p.data.authProvider}${p.data.email ? ` (${p.data.email})` : ''}` }),
        ]),
        el('div.card', {}, [
          el('h3', { text: 'Lifetime statistics' }),
          el('div.stat-grid', {}, [
            stat(String(st.bestScore), 'Best score'),
            stat(String(st.sessions), 'Sessions'),
            stat(String(st.hazardsFound), 'Hazards found'),
            stat(String(st.wrongFlags), 'Wrong flags'),
            stat(`x${st.bestCombo}`, 'Best combo'),
            stat(secs(st.fastestAverage), 'Best avg time'),
          ]),
          el('div.mt', {}, [
            el('div.avatar-chip', { text: a.face, style: { width: '60px', height: '60px', fontSize: '1.9rem' } }),
          ]),
        ]),
      ]),
      backBar(ctx),
    ]),
  ]);
}

/* ================================================================== *
 * Progress
 * ================================================================== */
export function progressScreen(ctx) {
  const p = ctx.profile;

  const rows = ENVIRONMENTS.map((e) => {
    const m = e.meta;
    const pr = p.envProgress(m.id);
    return el('tr', {}, [
      el('td', {}, [el('strong', { text: m.name })]),
      el('td', { class: pr.train ? 'done' : 'todo', text: pr.train ? '✓ Complete' : '— Not done' }),
      ...DIFFICULTY_ORDER.map((d) =>
        el('td.num', {
          class: (pr[d] ?? 0) > 0 ? 'done' : 'todo',
          text: (pr[d] ?? 0) > 0 ? String(pr[d]) : '—',
        }),
      ),
    ]);
  });

  const achs = ACHIEVEMENTS.map((a) => {
    const has = p.hasAchievement(a.id);
    return el(`div.ach.${has ? 'unlocked' : 'locked'}`, {}, [
      el('span.ic', { text: has ? a.icon : '🔒' }),
      el('div', {}, [el('div.t', { text: a.label }), el('div.d', { text: a.desc })]),
    ]);
  });

  const history = p.data.history.slice(0, 12).map((h) => {
    const env = ENVIRONMENTS.find((e) => e.meta.id === h.environment);
    return el('tr', {}, [
      el('td', { text: new Date(h.at).toLocaleDateString() }),
      el('td', { text: env?.meta.name ?? h.environment ?? '—' }),
      el('td', { text: `${h.mode} · ${h.difficulty ?? ''}` }),
      el('td.num', { text: `${h.correct}/${h.total}` }),
      el('td.num', { text: String(h.score) }),
    ]);
  });

  return el('div.screen', {}, [
    el('div.screen-inner.wide', {}, [
      el('div.section-head', {}, [
        el('h2', { text: 'Progress' }),
        el('p', { text: `Overall completion ${Math.round(p.completion(ENVIRONMENTS.map((e) => e.meta.id)) * 100)}%` }),
      ]),
      el('div.card', {}, [
        el('h3', { text: 'Best score by site and difficulty' }),
        el('table.prog-table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: 'Environment' }), el('th', { text: 'Training' }),
            ...DIFFICULTY_ORDER.map((d) => el('th', { text: DIFFICULTIES[d].label, style: { textAlign: 'right' } })),
          ])]),
          el('tbody', {}, rows),
        ]),
        el('p.faint.mt', { text: `Rank thresholds: ${RANKS.filter((r) => Number.isFinite(r.min)).map((r) => `${r.label} ${r.min}+`).join(' · ')}` }),
      ]),
      el('div.card.mt', {}, [el('h3', { text: 'Achievements' }), el('div.ach-grid', {}, achs)]),
      history.length > 0 && el('div.card.mt', {}, [
        el('h3', { text: 'Recent sessions' }),
        el('table.prog-table', {}, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: 'Date' }), el('th', { text: 'Site' }), el('th', { text: 'Mode' }),
            el('th', { text: 'Found', style: { textAlign: 'right' } }),
            el('th', { text: 'Score', style: { textAlign: 'right' } }),
          ])]),
          el('tbody', {}, history),
        ]),
      ]),
      backBar(ctx),
    ]),
  ]);
}

/* ================================================================== *
 * Hazard guide
 * ================================================================== */
export function guideScreen(ctx) {
  const byCat = {};
  for (const h of HAZARDS) (byCat[h.category] ??= []).push(h);

  const sections = Object.entries(byCat).map(([cat, list]) => {
    const c = HAZARD_CATEGORIES[cat];
    return el('div.card.mt', {}, [
      el('h3', {}, [
        el('span', { text: c?.label ?? cat, style: { color: c?.color ?? 'inherit' } }),
        ' ',
        el('span.faint', { text: `(${list.length})` }),
      ]),
      el('div.stack', {}, list.map((h) =>
        el('div.hazard-row', {}, [
          el('span.mark', { text: h.severity === 'major' ? '🔴' : '🟡' }),
          el('div', { style: { flex: '1' } }, [
            el('div.hz-name', {}, [h.name, ' ', el(`span.tag.tag-${h.severity}`, { text: h.severity })]),
            el('div.hz-tip', { text: h.description }),
            el('div.hz-tip', { style: { color: 'var(--info)' }, text: `Control: ${h.safetyTip}` }),
            el('div.hz-tip', { style: { color: 'var(--text-faint)' }, text: h.regulation }),
          ]),
        ]),
      )),
    ]);
  });

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [
        el('h2', { text: 'Hazard guide' }),
        el('p', { text: `${HAZARDS.length} hazard types you will meet in the warehouse, and the control for each.` }),
      ]),
      ...sections,
      backBar(ctx),
    ]),
  ]);
}

/* ================================================================== *
 * Settings
 * ================================================================== */
export function settingsScreen(ctx) {
  const p = ctx.profile;
  const s = p.settings;

  const toggle = (key, label, desc) => {
    const input = el('input', { type: 'checkbox', checked: !!s[key], id: `set-${key}` });
    input.addEventListener('change', () => ctx.actions.setSetting(key, input.checked));
    return el('div.row.between', { style: { padding: '0.6rem 0', borderBottom: '1px solid var(--border)' } }, [
      el('div', {}, [
        el('div', { text: label, style: { fontWeight: '700' } }),
        el('div.faint', { text: desc }),
      ]),
      input,
    ]);
  };

  const vol = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(s.volume * 100)), id: 'set-vol' });
  vol.addEventListener('input', () => ctx.actions.setSetting('volume', Number(vol.value) / 100));

  return el('div.screen', {}, [
    el('div.screen-inner.narrow', {}, [
      el('div.section-head', {}, [el('h2', { text: 'Settings' })]),
      el('div.card.stack', {}, [
        toggle('audio', 'Sound', 'Ambience, alarms and feedback cues.'),
        el('div', {}, [el('label', { for: 'set-vol', text: 'Volume' }), vol]),
        toggle('reducedMotion', 'Reduce motion', 'Disables head bob and softens animations.'),
        toggle('showFps', 'Show performance overlay', 'Displays FPS and draw calls in-game.'),
        toggle('invertY', 'Invert vertical look', 'Flip the up/down mouse axis.'),
      ]),
      el('div.card.stack.mt', {}, [
        el('h3', { text: 'Data' }),
        el('p.faint', { text: 'Progress is stored in this browser. Clearing it cannot be undone.' }),
        el('button.btn.btn-danger.btn-block', {
          text: 'Reset all progress',
          on: {
            click: () => {
              if (confirm('Reset all scores, progress and achievements? This cannot be undone.')) {
                p.resetProgress();
                ctx.actions.toast('Progress reset', 'ok');
                ctx.go('menu');
              }
            },
          },
        }),
        el('button.btn.btn-ghost.btn-block', {
          text: 'Sign out',
          on: { click: () => ctx.actions.signOut() },
        }),
      ]),
      backBar(ctx),
    ]),
  ]);
}

export { AVATARS };
