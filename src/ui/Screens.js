/**
 * Screens.js
 * Every full-screen menu, rendered as plain DOM.
 *
 * Each renderer takes (ctx) where ctx exposes { profile, go, actions, ... }
 * and returns an HTMLElement. Screens never touch the 3D scene directly.
 */
import { el, secs, pct } from './dom.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, ACHIEVEMENTS, RANKS, TEST } from '../data/config.js';
import { HAZARDS, HAZARD_CATEGORIES } from '../data/hazards.js';
import { ENVIRONMENTS } from '../environment/registry.js';
import { avatarPicker } from './AuthScreens.js';
import { offlineStrip } from './OfflinePanel.js';
import { AVATARS, getAvatar, avatarNode } from './avatars.js';
import { Timer } from '../gameplay/Timer.js';

/** The signed-in trainee: portrait, name and role, as one block. */
function whoAmI(p, { size = 56 } = {}) {
  const a = getAvatar(p.avatar);
  return el('div.who', {}, [
    avatarNode(a.id, { size, className: 'who-avatar' }),
    el('div', {}, [
      el('div.who-name', { text: p.name || 'Trainee' }),
      el('div.who-role', { text: `${a.name} · ${a.role}` }),
    ]),
  ]);
}

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
 * Main menu
 * ================================================================== */
export function menuScreen(ctx) {
  const p = ctx.profile;
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
        el('button.who-btn', { type: 'button', title: 'Change your avatar', on: { click: () => ctx.go('profile') } }, [
          whoAmI(p, { size: 60 }),
        ]),
        el('div.faint', { text: `Best score ${p.data.stats.bestScore} · ${p.data.achievements.length}/${ACHIEVEMENTS.length} achievements` }),
        el('div.row', {}, [
          el('span.stat-pill', { text: `${Math.round(completion * 100)}% complete` }),
          el('button.btn.btn-sm', { text: 'Profile', on: { click: () => ctx.go('profile') } }),
        ]),
      ]),
      brand(),
      resumeBanner(ctx),
      el('div.menu-grid', {}, [
        tile('🎓', 'Train Mode', 'Optional. No clock — a guide points you to every hazard and tells you where it is.', 'train-select', true),
        tile('🎯', 'Test Mode', `${Math.round(TEST.timeLimitSeconds / 60)} minutes. No guide and no locations — find the hazards yourself. Scored and ranked.`, 'test-select', true),
        tile('🏭', 'Environments', 'Three warehouses: general storage, dispatch bay and high-bay annexe.', 'environments'),
        tile('📊', 'Progress', 'Scores, ranks, achievements and your session history.', 'progress'),
        tile('📖', 'Hazard Guide', 'Reference for all 15 hazard types and their controls.', 'guide'),
        tile('⚙️', 'Settings', 'Audio, motion, accessibility and data.', 'settings'),
      ]),
      offlineStrip(ctx),
      el('p.faint.center.mt', { text: 'Desktop: mouse + keyboard or a controller. Tablet/phone: on-screen sticks.' }),
    ]),
  ]);
}

/** "Resume training" when a training round was interrupted. */
function resumeBanner(ctx) {
  const snap = ctx.actions.checkpoint?.();
  if (!snap) return null;
  const env = ENVIRONMENTS.find((e) => e.meta.id === snap.environment);
  const mins = Math.max(1, Math.round((Date.now() - snap.savedAt) / 60000));
  return el('div.resume-banner', {}, [
    el('div', {}, [
      el('div.rb-k', { text: 'Training in progress' }),
      el('div.rb-t', { text: `${env?.meta.name ?? 'Warehouse'} — ${snap.found.length} of ${snap.total} found` }),
      el('div.rb-d', { text: `Saved ${mins} minute${mins === 1 ? '' : 's'} ago.` }),
    ]),
    el('div.row', {}, [
      el('button.btn.btn-primary', { type: 'button', text: 'Resume', on: { click: () => ctx.actions.resumeTraining() } }),
      el('button.btn.btn-ghost.btn-sm', {
        type: 'button', text: 'Discard',
        on: { click: () => { ctx.actions.discardCheckpoint(); ctx.go('menu'); } },
      }),
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
          else if (p.settings.defaultDifficulty && p.settings.defaultDifficulty !== 'ask') {
            ctx.actions.startTest(m.id, p.settings.defaultDifficulty);
          } else ctx.go('difficulty', { environment: m.id });
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
            ? 'No clock. A guide arrow and the hazard’s location lead you to each one. Training is optional — you can go straight to Test Mode.'
            : `${Math.round(TEST.timeLimitSeconds / 60)} minutes on the clock. No guide and no locations — you are scored on what you find, how fast, and how few wrong calls you make.`,
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

    const isDefault = p.settings.defaultDifficulty === id;
    return el(`button.select-card.diff-${id}${locked ? '.locked' : ''}`, {
      disabled: locked,
      title: reason,
      on: { click: () => !locked && ctx.actions.startTest(environment, id) },
    }, [
      el('span.name', {}, [d.label, isDefault ? el('span.tag.tag-minor', { text: 'your default', style: { marginLeft: '0.5rem' } }) : null]),
      el('span.desc', { text: d.blurb }),
      el('div.meta', {}, [
        el('span.stat-pill', { text: `${Timer.format(TEST.timeLimitSeconds)} time limit` }),
        el('span.stat-pill', { text: `Fast bonus under ${Math.round(d.secondsPerHazard * 0.5)}s` }),
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
        el('p', { text: `Every test is ${Math.round(TEST.timeLimitSeconds / 60)} minutes. Difficulty changes how fast you must be to earn the bonus, the lighting, the number of decoys and whether hazards move.` }),
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
  // Locations are a Train Mode aid. A test result names what you missed but
  // does not give away where it was.
  const showWhere = isTrain;

  const foundRows = s.finds.map((f) => {
    const h = HAZARDS.find((x) => x.id === f.id);
    return el('div.hazard-row.found', {}, [
      el('span.mark', { text: '✓' }),
      el('div', { style: { flex: '1' } }, [
        el('div.hz-name', { text: h?.name ?? f.id }),
        showWhere && s.foundLocations?.[f.id] && el('div.hz-where', {}, ['📍 ', s.foundLocations[f.id]]),
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
        showWhere && h.where && el('div.hz-where', {}, ['📍 ', h.where]),
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
        el('div.result-who', {}, [whoAmI(ctx.profile, { size: 72 })]),
        el('div.faint', { text: `${isTrain ? 'Training' : 'Test'} complete · ${env?.meta.name ?? ''}${isTrain ? '' : ` · ${s.difficulty}`}` }),
        el('div.result-score', { text: String(s.score) }),
        el('div.result-rank', {
          text: s.rank.label,
          style: { background: `${s.rank.color}22`, color: s.rank.color, border: `1px solid ${s.rank.color}66` },
        }),
        el('div.result-sub', {
          text: s.reason === 'timeout'
            ? `The ${Math.round(TEST.timeLimitSeconds / 60)}-minute clock ran out.`
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

  const nameInput = el('input', { type: 'text', value: p.name, maxLength: 32, id: 'pf-name' });
  const picker = avatarPicker(p.avatar);

  const stat = (v, k) => el('div.stat-box', {}, [el('div.v', { text: v }), el('div.k', { text: k })]);

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [el('h2', { text: 'Profile' }), el('p', { text: 'Stored locally on this device.' })]),
      el('div.grid.grid-2', {}, [
        el('div.card.stack', {}, [
          el('h3', { text: 'Trainee details' }),
          el('div', {}, [el('label', { for: 'pf-name', text: 'Name' }), nameInput]),
          el('div', {}, [el('label', { text: 'Your avatar' }), picker.node]),
          el('button.btn.btn-primary.btn-block', {
            text: 'Save changes',
            on: {
              click: () => {
                p.signIn({
                  name: nameInput.value.trim() || 'Trainee',
                  avatar: picker.value,
                  provider: p.data.authProvider,
                  email: p.data.email,
                });
                ctx.actions.toast('Profile saved', 'ok');
                ctx.go('profile');
              },
            },
          }),
          el('div.faint', { text: `Signed in via: ${p.data.authProvider}${p.data.email ? ` (${p.data.email})` : ''}` }),
        ]),
        el('div.card', {}, [
          el('div.profile-hero', {}, [whoAmI(p, { size: 96 })]),
          el('h3', { text: 'Lifetime statistics' }),
          el('div.stat-grid', {}, [
            stat(String(st.bestScore), 'Best score'),
            stat(String(st.sessions), 'Sessions'),
            stat(String(st.hazardsFound), 'Hazards found'),
            stat(String(st.wrongFlags), 'Wrong flags'),
            stat(`x${st.bestCombo}`, 'Best combo'),
            stat(secs(st.fastestAverage), 'Best avg time'),
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

export { AVATARS };
