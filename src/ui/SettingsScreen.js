/**
 * SettingsScreen.js
 * The tabbed Settings screen: Video, Audio, Controls, Gameplay,
 * Accessibility, Account & data.
 *
 * Rendered from SCHEMA in data/settings.js, so every row on screen is a
 * setting that is saved, validated and applied. Things the browser controls
 * (V-Sync, ray tracing) are shown as information with the reason, never as a
 * switch that does nothing.
 */
import { el, mount } from './dom.js';
import {
  SCHEMA, TABS, ACTIONS, keyLabel, rebind, tabDefaults, detectPreset,
  pixelRatioFor, effectiveResolution, DEFAULT_KEYBINDS,
} from '../data/settings.js';
import { RENDER } from '../data/config.js';
import { AudioManager } from '../audio/AudioManager.js';
import { securityPanel } from './AuthScreens.js';
import { offlineCard } from './OfflinePanel.js';

let lastTab = 'video';

export function settingsScreen(ctx, params = {}) {
  const tab = params.tab ?? lastTab;
  lastTab = tab;
  const fromPause = !!params.fromPause;
  const p = ctx.profile;

  const body = el('div.set-body');
  const rerender = (keepScroll = true) => {
    const y = body.scrollTop;
    mount(body, ...renderTab(ctx, tab, rerender));
    if (keepScroll) body.scrollTop = y;
  };

  const tabs = el('div.set-tabs', { role: 'tablist' }, TABS.map((t) =>
    el(`button.set-tab${t.id === tab ? '.active' : ''}`, {
      type: 'button', role: 'tab', 'aria-selected': String(t.id === tab),
      on: { click: () => ctx.go('settings', { tab: t.id, fromPause }) },
    }, [el('span.set-tab-ic', { text: t.icon }), el('span', { text: t.label })]),
  ));

  const back = () => (fromPause ? ctx.actions.closeSettingsToPause() : ctx.go('menu'));

  const node = el('div.screen.settings-screen', {}, [
    el('div.screen-inner.wide', {}, [
      el('div.set-header', {}, [
        el('div.section-head', {}, [
          el('h2', { text: 'Settings' }),
          el('p', { text: fromPause ? 'The round is paused. Changes apply as soon as you make them.' : 'Changes apply at once and are saved to this device.' }),
        ]),
        el('button.btn.btn-ghost', { type: 'button', text: fromPause ? '← Back to pause menu' : '← Back', on: { click: back } }),
      ]),
      tabs,
      body,
      el('div.set-footer', {}, [
        tab !== 'account' && el('button.btn.btn-ghost.btn-sm', {
          type: 'button',
          text: `Reset ${TABS.find((t) => t.id === tab)?.label} to defaults`,
          on: {
            click: () => {
              if (!confirm(`Reset every ${TABS.find((t) => t.id === tab)?.label} setting to its default?`)) return;
              ctx.actions.setSettings(tabDefaults(tab));
              ctx.actions.toast('Settings reset', 'ok');
              rerender(false);
            },
          },
        }),
        el('button.btn.btn-primary', { type: 'button', text: 'Done', on: { click: back } }),
      ]),
    ]),
  ]);

  rerender(false);
  return node;
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

function renderTab(ctx, tab, rerender) {
  if (tab === 'account') return accountTab(ctx, rerender);

  const fields = SCHEMA.filter((f) => f.tab === tab);
  const groups = [];
  for (const f of fields) {
    let g = groups.find((x) => x.name === f.group);
    if (!g) groups.push((g = { name: f.group, fields: [] }));
    g.fields.push(f);
  }

  const out = [];
  if (tab === 'video') out.push(videoStatus(ctx));
  if (tab === 'controls') out.push(controllerStatus(ctx));

  for (const g of groups) {
    out.push(el('div.card.set-group', {}, [
      el('h3', { text: g.name }),
      ...g.fields.map((f) => row(ctx, f, rerender)),
    ]));
  }

  if (tab === 'controls') out.push(controllerLayout());
  return out;
}

/** One setting. */
function row(ctx, f, rerender) {
  const s = ctx.profile.settings;
  const set = (v) => {
    ctx.actions.setSetting(f.key, v);
    // Preset and advanced values move together, so redraw the tab.
    if (f.tab === 'video' || f.key === 'reducedMotion') rerender();
  };

  let control;
  switch (f.type) {
    case 'toggle': {
      const input = el('input', { type: 'checkbox', checked: !!s[f.key], id: `set-${f.key}` });
      input.addEventListener('change', () => set(input.checked));
      control = el('label.switch', { for: `set-${f.key}` }, [input, el('span.switch-track')]);
      break;
    }
    case 'range': {
      const val = el('span.set-val', { text: f.format ? f.format(s[f.key]) : String(s[f.key]) });
      const input = el('input', {
        type: 'range', min: String(f.min), max: String(f.max), step: String(f.step),
        value: String(s[f.key]), id: `set-${f.key}`, 'aria-label': f.label,
      });
      input.addEventListener('input', () => {
        const v = Number(input.value);
        val.textContent = f.format ? f.format(v) : String(v);
        ctx.actions.setSetting(f.key, v);
      });
      control = el('div.set-slider', {}, [input, val]);
      break;
    }
    case 'select':
      control = select(f, s[f.key], set);
      break;
    case 'info':
      control = el('span.set-badge', { text: 'Browser-controlled' });
      break;
    case 'device':
      control = deviceControl(ctx, s[f.key]);
      break;
    case 'keybinds':
      return keybindTable(ctx, rerender);
    default:
      control = null;
  }

  // Settings that "Reduce all motion" overrides are shown as such.
  const overridden = s.reducedMotion && (f.key === 'headBob' || f.key === 'cameraShake');

  return el(`div.set-row${f.type === 'info' ? '.info' : ''}${overridden ? '.overridden' : ''}`, {}, [
    el('div.set-text', {}, [
      el('label.set-label', { for: `set-${f.key}`, text: f.label }),
      f.desc && el('div.set-desc', { text: f.desc }),
      f.browser && el('div.set-desc.browser', { text: f.browser }),
      overridden && el('div.set-desc.browser', { text: 'Off while “Reduce all motion” is on.' }),
      f.key === 'antialias' && ctx.graphics?.restartNeeded && restartNote(),
      f.key === 'renderScale' && resolutionNote(s[f.key]),
    ]),
    control,
  ]);
}

/** Segmented buttons for short option lists, a dropdown for long ones. */
function select(f, current, onChange) {
  const short = f.options.length <= 5 && f.options.every((o) => o.label.length <= 14);
  if (short) {
    return el('div.seg', { role: 'radiogroup', 'aria-label': f.label }, f.options.map((o) =>
      el(`button.seg-btn${String(current) === o.value ? '.on' : ''}`, {
        type: 'button', role: 'radio', 'aria-checked': String(String(current) === o.value),
        text: o.label,
        on: { click: () => onChange(o.value) },
      })));
  }
  const sel = el('select', { id: `set-${f.key}` }, f.options.map((o) =>
    el('option', { value: o.value, text: o.label, selected: String(current) === o.value })));
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

function restartNote() {
  return el('div.set-restart', {}, [
    el('span', { text: 'MSAA is part of the graphics context, so this takes effect after a restart.' }),
    el('button.btn.btn-sm', { type: 'button', text: 'Restart now', on: { click: () => location.reload() } }),
  ]);
}

function resolutionNote(scale) {
  const pr = pixelRatioFor(scale, window.devicePixelRatio, RENDER.maxPixelRatio);
  const { width, height } = effectiveResolution(window.innerWidth, window.innerHeight, pr);
  return el('div.set-desc.res', {
    text: `Drawing at ${width} × ${height}${scale === 'auto' ? ' (can drop if the frame rate falls)' : ''}.`,
  });
}

/* ------------------------------------------------------------------ *
 * Video status strip
 * ------------------------------------------------------------------ */

function videoStatus(ctx) {
  const g = ctx.graphics;
  const e = ctx.engine;
  const s = ctx.profile.settings;
  const preset = detectPreset(s);
  const gl = e?.renderer?.getContext?.();
  let gpu = '';
  try {
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  } catch { /* hidden by the browser */ }
  return el('div.set-status', {}, [
    stat('Preset', preset === 'custom' ? 'Custom' : preset[0].toUpperCase() + preset.slice(1)),
    stat('Frame rate', e ? `${Math.round(e.fps)} fps` : '—'),
    stat('Anti-aliasing', g?.msaaActive ? 'MSAA 4× active' : s.antialias === 'fxaa' ? 'FXAA' : 'Off'),
    stat('Max anisotropy', e ? String(e.renderer.capabilities.getMaxAnisotropy()) : '—'),
    gpu && stat('Graphics', gpu.replace(/ANGLE \(|\)$/g, '').split(',').slice(0, 2).join(',').slice(0, 48)),
  ]);
}

function stat(k, v) {
  return el('div.set-stat', {}, [el('span.k', { text: k }), el('span.v', { text: v })]);
}

/* ------------------------------------------------------------------ *
 * Audio output device
 * ------------------------------------------------------------------ */

function deviceControl(ctx, current) {
  if (!AudioManager.canChooseOutput) {
    return el('span.set-badge', { text: 'System default', title: 'This browser cannot route game audio to a chosen device. Change the output in your system sound settings.' });
  }
  const sel = el('select', { id: 'set-outputDevice' }, [el('option', { value: 'default', text: 'System default' })]);
  const note = el('div.set-desc');
  AudioManager.listOutputs().then((list) => {
    for (const d of list) sel.append(el('option', { value: d.id, text: d.label, selected: d.id === current }));
    if (!list.length) {
      note.textContent = 'Your browser only names the system default until a site has microphone permission, which this game never asks for. Switch outputs in your system sound settings.';
    }
  });
  sel.addEventListener('change', () => ctx.actions.setSetting('outputDevice', sel.value));
  return el('div.set-device', {}, [sel, note]);
}

/* ------------------------------------------------------------------ *
 * Key bindings
 * ------------------------------------------------------------------ */

function keybindTable(ctx, rerender) {
  const binds = ctx.profile.settings.keybinds;
  const msg = el('div.set-desc.kb-msg', { role: 'status' });

  const capture = (btn, action, slot) => {
    const prevText = btn.textContent;
    btn.textContent = 'Press a key…';
    btn.classList.add('listening');
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      if (e.code === 'Escape') { btn.textContent = prevText; btn.classList.remove('listening'); return; }
      // Backspace / Delete clears the alternative slot.
      const code = (e.code === 'Backspace' || e.code === 'Delete') && slot === 1 ? null : e.code;
      const r = rebind(ctx.profile.settings.keybinds, action, slot, code);
      if (r.error) {
        msg.textContent = r.error;
        btn.textContent = prevText;
        btn.classList.remove('listening');
        return;
      }
      ctx.actions.setSetting('keybinds', r.keybinds);
      rerender();
      if (r.displaced) {
        const a = ACTIONS.find((x) => x.id === r.displaced.action);
        ctx.actions.toast(`${keyLabel(code)} was on “${a.label}” — it has been moved.`, 'ok');
      }
    };
    const onBlur = () => { cleanup(); btn.textContent = prevText; btn.classList.remove('listening'); };
    const cleanup = () => {
      window.removeEventListener('keydown', onKey, true);
      btn.removeEventListener('blur', onBlur);
    };
    window.addEventListener('keydown', onKey, true);
    btn.addEventListener('blur', onBlur);
  };

  const rows = ACTIONS.map((a) => el('div.kb-row', {}, [
    el('span.kb-action', { text: a.label }),
    ...[0, 1].map((slot) => {
      const code = binds[a.id]?.[slot];
      const b = el(`button.kb-key${code ? '' : '.empty'}`, {
        type: 'button',
        text: code ? keyLabel(code) : (slot ? '+ add' : '—'),
        'aria-label': `${a.label}, ${slot ? 'alternative' : 'primary'} key: ${code ? keyLabel(code) : 'none'}. Press to change.`,
      });
      b.addEventListener('click', () => capture(b, a.id, slot));
      return b;
    }),
  ]));

  return el('div.kb', {}, [
    el('div.kb-row.kb-head', {}, [el('span', { text: 'Action' }), el('span', { text: 'Key' }), el('span', { text: 'Alternative' })]),
    ...rows,
    el('div.kb-row.kb-fixed', {}, [el('span.kb-action', { text: 'Pause (always)' }), el('span.kb-key.fixed', { text: 'Esc' }), el('span')]),
    msg,
    el('div.set-desc', { text: 'Click a key, then press the new one. Esc cancels. Backspace clears an alternative. A key can only do one thing — binding it moves it off anything else.' }),
    el('button.btn.btn-sm.btn-ghost', {
      type: 'button', text: 'Reset key bindings',
      on: { click: () => { ctx.actions.setSetting('keybinds', structuredClone(DEFAULT_KEYBINDS)); rerender(); } },
    }),
  ]);
}

function controllerStatus(ctx) {
  const pad = ctx.player?.gamepad;
  return el('div.set-status', {}, [
    stat('Controller', pad ? pad.id.replace(/\(.*?\)/g, '').trim().slice(0, 42) || 'Connected' : 'None connected'),
    stat('Mouse', 'Pointer lock, or click-and-drag where the browser refuses it'),
  ]);
}

function controllerLayout() {
  const map = [
    ['Left stick', 'Move'], ['Right stick', 'Look'], ['A', 'Flag a hazard'],
    ['LB or L3', 'Run (hold)'], ['B or R3', 'Crouch (hold)'], ['Start', 'Pause / resume'], ['Y', 'Switch camera view'],
  ];
  return el('div.card.set-group', {}, [
    el('h3', { text: 'Controller layout' }),
    el('p.set-desc', { text: 'Any standard controller works — plug it in or pair it, then press a button. Look sensitivity, invert-Y and aim assist apply to it too.' }),
    el('div.pad-map', {}, map.map(([b, a]) => el('div.pad-row', {}, [el('span.kb-key.fixed', { text: b }), el('span', { text: a })]))),
  ]);
}

/* ------------------------------------------------------------------ *
 * Account & data
 * ------------------------------------------------------------------ */

function accountTab(ctx, rerender) {
  const p = ctx.profile;
  return [
    offlineCard(ctx),
    ...(ctx.auth ? securityPanel(ctx, ctx.authCaps ?? { passkey: { available: false, reason: '' } }, rerender) : []),
    el('div.card.stack.mt', {}, [
      el('h3', { text: '💾 Data' }),
      el('p.faint', { text: 'Progress is stored in this browser. Clearing it cannot be undone. Passkeys and two-factor are kept.' }),
      el('button.btn.btn-danger.btn-block', {
        type: 'button', text: 'Reset all progress',
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
      el('button.btn.btn-ghost.btn-block', { type: 'button', text: 'Sign out', on: { click: () => ctx.actions.signOut() } }),
    ]),
  ];
}
