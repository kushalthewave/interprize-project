/**
 * data/settings.js
 * Every player setting: its default, its allowed values, and the pure logic
 * around it (quality presets, key rebinding, migration from older profiles).
 *
 * One source of truth. The Settings screen renders from SCHEMA, Profile fills
 * defaults from DEFAULTS, and main.applySettings() pushes the values into the
 * systems that consume them — so a setting cannot appear in the menu without
 * also being saved, validated and applied.
 *
 * Nothing in here touches the DOM, so all of it is unit-tested.
 */

/* ------------------------------------------------------------------ *
 * Key bindings
 * ------------------------------------------------------------------ */

/** Rebindable actions, in the order the Controls tab lists them. */
export const ACTIONS = [
  { id: 'forward', label: 'Move forward' },
  { id: 'back', label: 'Move back' },
  { id: 'left', label: 'Strafe left' },
  { id: 'right', label: 'Strafe right' },
  { id: 'run', label: 'Run (hold)' },
  { id: 'crouch', label: 'Crouch (hold)' },
  { id: 'flag', label: 'Flag a hazard' },
  { id: 'pause', label: 'Pause' },
  { id: 'view', label: 'Switch camera view' },
];

/** Two slots per action: a primary and an alternative. */
export const DEFAULT_KEYBINDS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  crouch: ['KeyC', 'ControlLeft'],
  flag: ['KeyE', null],
  pause: ['KeyP', null],
  view: ['KeyV', null],
};

/**
 * Keys that cannot be bound. Escape releases the mouse and opens the pause
 * menu in every browser, so it is always Pause and never anything else.
 */
export const RESERVED_KEYS = ['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'F5', 'F11', 'F12'];

/** A readable name for a KeyboardEvent.code. */
export function keyLabel(code) {
  if (!code) return '—';
  const named = {
    Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'Enter', Backspace: 'Backspace', CapsLock: 'Caps Lock',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
  };
  if (named[code]) return named[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

/** Which action (if any) a key code triggers. */
export function actionForKey(keybinds, code) {
  for (const [action, slots] of Object.entries(keybinds)) {
    if (slots.includes(code)) return action;
  }
  return null;
}

/**
 * Bind `code` to one slot of one action.
 *
 * A key can only do one thing. If it was already bound elsewhere it is taken
 * off that action, and the displaced binding is reported so the UI can say
 * so — silently leaving two actions on one key is how "my crouch key also
 * flags" bugs happen.
 *
 * @returns {{ keybinds: object, displaced: ?{action:string, slot:number}, error: ?string }}
 */
export function rebind(keybinds, action, slot, code) {
  if (!ACTIONS.some((a) => a.id === action)) return { keybinds, displaced: null, error: 'Unknown action.' };
  if (slot !== 0 && slot !== 1) return { keybinds, displaced: null, error: 'Unknown slot.' };
  if (code && RESERVED_KEYS.includes(code)) {
    return { keybinds, displaced: null, error: `${keyLabel(code)} is reserved by the browser.` };
  }

  const next = {};
  for (const [a, slots] of Object.entries(keybinds)) next[a] = [...slots];
  let displaced = null;

  if (code) {
    for (const [a, slots] of Object.entries(next)) {
      slots.forEach((c, i) => {
        if (c === code && !(a === action && i === slot)) {
          slots[i] = null;
          displaced = { action: a, slot: i };
        }
      });
    }
  }
  next[action][slot] = code || null;

  // Never leave a primary slot empty while the alternative is set — for the
  // action just changed AND for any action a key was taken from.
  promoteAll(next);
  return { keybinds: next, displaced, error: null };
}

function promoteAll(binds) {
  for (const a of Object.keys(binds)) {
    if (!binds[a][0] && binds[a][1]) binds[a] = [binds[a][1], null];
  }
  return binds;
}

/** Is every action reachable with at least one key? */
export function unboundActions(keybinds) {
  return ACTIONS.filter((a) => !(keybinds[a.id] ?? []).some(Boolean)).map((a) => a.id);
}

/* ------------------------------------------------------------------ *
 * Graphics presets
 * ------------------------------------------------------------------ */

/**
 * What each preset sets. Post-processing effects are deliberately not part
 * of any preset: motion blur and depth of field make hazards harder to see,
 * so they are a personal choice, never a side effect of choosing "Ultra".
 */
export const PRESETS = {
  low: { renderScale: '0.75', textureQuality: 'low', shadowQuality: 'off', antialias: 'off', lighting: 'low' },
  medium: { renderScale: 'auto', textureQuality: 'medium', shadowQuality: 'low', antialias: 'fxaa', lighting: 'medium' },
  high: { renderScale: 'auto', textureQuality: 'high', shadowQuality: 'high', antialias: 'msaa', lighting: 'high' },
  ultra: { renderScale: '1.5', textureQuality: 'ultra', shadowQuality: 'ultra', antialias: 'msaa', lighting: 'high' },
};
export const PRESET_ORDER = ['low', 'medium', 'high', 'ultra'];
const PRESET_KEYS = Object.keys(PRESETS.high);

/** The settings a preset would change, as a patch. */
export function presetPatch(name) {
  return PRESETS[name] ? { quality: name, ...PRESETS[name] } : {};
}

/** Which preset the current advanced values match, or 'custom'. */
export function detectPreset(s) {
  for (const name of PRESET_ORDER) {
    if (PRESET_KEYS.every((k) => String(s[k]) === String(PRESETS[name][k]))) return name;
  }
  return 'custom';
}

/** Is this key one of the values a preset controls? */
export function isPresetKey(key) {
  return PRESET_KEYS.includes(key);
}

/* ------------------------------------------------------------------ *
 * Render resolution
 * ------------------------------------------------------------------ */

/**
 * The pixel ratio to render at.
 * 'auto' follows the display and lets the engine lower it if the frame rate
 * drops; a number is a fixed percentage of the display's native resolution.
 */
export function pixelRatioFor(renderScale, devicePixelRatio = 1, maxRatio = 2) {
  const dpr = Math.max(1, devicePixelRatio || 1);
  if (renderScale === 'auto') return Math.min(dpr, maxRatio);
  const scale = Number(renderScale);
  if (!Number.isFinite(scale) || scale <= 0) return Math.min(dpr, maxRatio);
  return Math.max(0.5, Math.min(dpr * scale, maxRatio * 1.5));
}

/** The resolution that pixel ratio produces, for the label next to the setting. */
export function effectiveResolution(cssWidth, cssHeight, pixelRatio) {
  return { width: Math.round(cssWidth * pixelRatio), height: Math.round(cssHeight * pixelRatio) };
}

/* ------------------------------------------------------------------ *
 * Frame-rate cap
 * ------------------------------------------------------------------ */

/**
 * Should a frame be drawn now? `cap` 0 means "match the display".
 * A small tolerance stops a 60 Hz display skipping every other frame under a
 * 60 fps cap because a frame arrived a fraction of a millisecond early.
 */
export function shouldRenderFrame(nowMs, lastMs, cap) {
  if (!cap || cap <= 0) return true;
  const interval = 1000 / cap;
  return nowMs - lastMs >= interval - 1.5;
}

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

const opt = (value, label) => ({ value, label });

/**
 * type: 'toggle' | 'range' | 'select'
 * browser: a string when the platform decides this, not the game — the
 *          screen shows it as information instead of a control that lies.
 */
export const SCHEMA = [
  /* ── Video ─────────────────────────────────────────────────────── */
  { key: 'quality', tab: 'video', group: 'Quality', type: 'select', default: 'high',
    label: 'Graphics quality', desc: 'A quick preset. Changing any setting below it switches this to Custom.',
    options: [opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High'), opt('ultra', 'Ultra'), opt('custom', 'Custom')] },
  { key: 'renderScale', tab: 'video', group: 'Display', type: 'select', default: 'auto',
    label: 'Resolution', desc: 'How many pixels the 3D view is drawn at, relative to your screen. Auto lowers it by itself if the frame rate drops.',
    options: [opt('auto', 'Auto (adaptive)'), opt('0.5', '50%'), opt('0.75', '75%'), opt('1', '100% — native'), opt('1.5', '150% — supersampled')] },
  { key: 'displayMode', tab: 'video', group: 'Display', type: 'select', default: 'windowed',
    label: 'Display mode', desc: 'Fullscreen hides the browser around the game. Press Esc or F11 to leave it.',
    options: [opt('windowed', 'Windowed'), opt('fullscreen', 'Fullscreen')] },
  { key: 'vsync', tab: 'video', group: 'Display', type: 'info',
    label: 'V-Sync', browser: 'Always on. Browsers present every frame in step with your display, so there is no tearing to prevent and no way to turn it off. Use the frame-rate cap below to limit frames.' },
  { key: 'fpsCap', tab: 'video', group: 'Display', type: 'select', default: '0',
    label: 'Frame-rate cap', desc: 'Limits frames per second. Lower caps keep laptops cooler and quieter.',
    options: [opt('0', 'Match display'), opt('30', '30 fps'), opt('60', '60 fps'), opt('120', '120 fps'), opt('144', '144 fps')] },
  { key: 'fov', tab: 'video', group: 'Display', type: 'range', default: 72, min: 60, max: 100, step: 1,
    label: 'Field of view', desc: 'How much of the warehouse you can see at once.', format: (v) => `${v}°` },
  { key: 'showFps', tab: 'video', group: 'Display', type: 'toggle', default: false,
    label: 'Performance overlay', desc: 'Frame rate, draw calls and triangles in the corner while playing.' },

  { key: 'textureQuality', tab: 'video', group: 'Advanced', type: 'select', default: 'high',
    label: 'Texture quality', desc: 'How sharp floor markings and signage stay at a shallow angle (anisotropic filtering).',
    options: [opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High'), opt('ultra', 'Ultra')] },
  { key: 'shadowQuality', tab: 'video', group: 'Advanced', type: 'select', default: 'high',
    label: 'Shadow quality', desc: 'Shadow resolution and softness. Off is the biggest single speed-up.',
    options: [opt('off', 'Off'), opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High'), opt('ultra', 'Ultra')] },
  { key: 'antialias', tab: 'video', group: 'Advanced', type: 'select', default: 'msaa',
    label: 'Anti-aliasing', desc: 'Smooths jagged edges. MSAA is the sharpest and takes effect after a restart; FXAA applies at once.',
    options: [opt('off', 'Off'), opt('fxaa', 'FXAA'), opt('msaa', 'MSAA 4×')] },
  { key: 'lighting', tab: 'video', group: 'Advanced', type: 'select', default: 'high',
    label: 'Lighting quality', desc: 'How many of the high-bay lamps are real light sources.',
    options: [opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High')] },
  { key: 'rayTracing', tab: 'video', group: 'Advanced', type: 'info',
    label: 'Ray tracing', browser: 'Not available. WebGL, which every browser uses for 3D, has no ray-tracing hardware access.' },

  { key: 'motionBlur', tab: 'video', group: 'Post-processing', type: 'toggle', default: false,
    label: 'Motion blur', desc: 'Blends each frame into the next while you move. Makes hazards harder to spot.' },
  { key: 'lensFlare', tab: 'video', group: 'Post-processing', type: 'toggle', default: false,
    label: 'Lens flare', desc: 'Glare streaks when you look towards the ceiling lamps.' },
  { key: 'depthOfField', tab: 'video', group: 'Post-processing', type: 'toggle', default: false,
    label: 'Depth of field', desc: 'Focuses on what the crosshair is on and softens the rest. Makes hazards harder to spot.' },

  /* ── Audio ─────────────────────────────────────────────────────── */
  { key: 'audio', tab: 'audio', group: 'Volume', type: 'toggle', default: true,
    label: 'Sound', desc: 'Every sound in the game, on or off.' },
  { key: 'volume', tab: 'audio', group: 'Volume', type: 'range', default: 0.7, min: 0, max: 1, step: 0.01,
    label: 'Master volume', desc: 'The overall level of everything below.', format: pct },
  { key: 'musicVolume', tab: 'audio', group: 'Volume', type: 'range', default: 0.35, min: 0, max: 1, step: 0.01,
    label: 'Music volume', desc: 'The background music, and nothing else.', format: pct },
  { key: 'voiceVolume', tab: 'audio', group: 'Volume', type: 'range', default: 0.8, min: 0, max: 1, step: 0.01,
    label: 'Voice volume', desc: 'The spoken announcements: each hazard you find, time warnings, the result.', format: pct },
  { key: 'sfxVolume', tab: 'audio', group: 'Volume', type: 'range', default: 0.9, min: 0, max: 1, step: 0.01,
    label: 'Sound effects volume', desc: 'Forklift engines, reversing alarms, footsteps, falling cartons, the building hum and feedback chimes.', format: pct },
  { key: 'outputDevice', tab: 'audio', group: 'Output', type: 'device', default: 'default',
    label: 'Audio output device', desc: 'Speakers, headphones, or another output your browser can see.' },

  /* ── Controls ──────────────────────────────────────────────────── */
  { key: 'lookSensitivity', tab: 'controls', group: 'Look', type: 'range', default: 1, min: 0.25, max: 3, step: 0.05,
    label: 'Look sensitivity', desc: 'How fast the camera turns with the mouse or the right stick.', format: (v) => `${Number(v).toFixed(2)}×` },
  { key: 'invertY', tab: 'controls', group: 'Look', type: 'toggle', default: false,
    label: 'Invert Y-axis', desc: 'Push forward to look down.' },
  { key: 'aimAssist', tab: 'controls', group: 'Look', type: 'select', default: 'off',
    label: 'Aim assist', desc: 'Makes each hazard easier to land the crosshair on, and slows the camera slightly when it is over one. Works with mouse, touch and controller.',
    options: [opt('off', 'Off'), opt('low', 'Low'), opt('high', 'High')] },
  { key: 'cameraView', tab: 'controls', group: 'Camera', type: 'select', default: 'third',
    label: 'Camera view', desc: 'Third person shows your own avatar in the warehouse, from over the shoulder. First person sees through their eyes. Press V (or Y on a controller) during a round to switch.',
    options: [opt('third', 'Third person — see your avatar'), opt('first', 'First person')] },
  { key: 'avatarIntro', tab: 'controls', group: 'Camera', type: 'toggle', default: true,
    label: 'Show my avatar when a round starts', desc: 'The camera starts in front of your avatar so you see their face, then swings round behind them. Moving or looking skips it.' },
  { key: 'keybinds', tab: 'controls', group: 'Key bindings', type: 'keybinds', default: DEFAULT_KEYBINDS,
    label: 'Key bindings', desc: 'Click a key, then press the new one. Esc always pauses.' },

  /* ── Gameplay ──────────────────────────────────────────────────── */
  { key: 'defaultDifficulty', tab: 'gameplay', group: 'Rounds', type: 'select', default: 'ask',
    label: 'Default difficulty', desc: 'Test Mode starts straight into this difficulty. “Ask every time” shows the choice.',
    options: [opt('ask', 'Ask every time'), opt('simple', 'Simple'), opt('mid', 'Mid'), opt('hard', 'Hard')] },
  { key: 'timedTest', tab: 'gameplay', group: 'Rounds', type: 'toggle', default: true,
    label: 'Five-minute Test limit', desc: 'Turn off for untimed practice. Hazards are still scored.' },
  { key: 'showLocations', tab: 'gameplay', group: 'Rounds', type: 'toggle', default: true,
    label: 'Show hazard locations in Train Mode', desc: 'Test Mode never shows locations.' },
  { key: 'showHints', tab: 'gameplay', group: 'Rounds', type: 'toggle', default: true,
    label: 'Tutorials & hints', desc: 'The control reminder bar, the tips while loading, and the hint line in the training panel.' },
  { key: 'autosave', tab: 'gameplay', group: 'Rounds', type: 'select', default: '30',
    label: 'Auto-save', desc: 'Progress is always saved when a round ends. This also saves a training round while you play, so closing the tab does not lose it. Tests are never checkpointed — pausing a test by closing the tab would not be fair.',
    options: [opt('off', 'Only at the end of a round'), opt('30', 'Every 30 seconds'), opt('60', 'Every 60 seconds')] },

  { key: 'crosshairStyle', tab: 'gameplay', group: 'Crosshair', type: 'select', default: 'crossdot',
    label: 'Crosshair style', options: [opt('crossdot', 'Cross + dot'), opt('cross', 'Cross'), opt('dot', 'Dot'), opt('circle', 'Circle')] },
  { key: 'crosshairSize', tab: 'gameplay', group: 'Crosshair', type: 'range', default: 1, min: 0.6, max: 2, step: 0.1,
    label: 'Crosshair size', format: (v) => `${Math.round(v * 100)}%` },
  { key: 'crosshairColour', tab: 'gameplay', group: 'Crosshair', type: 'select', default: 'white',
    label: 'Crosshair colour', options: [opt('white', 'White'), opt('amber', 'Amber'), opt('green', 'Green'), opt('cyan', 'Cyan'), opt('magenta', 'Magenta')] },

  /* ── Accessibility ─────────────────────────────────────────────── */
  { key: 'subtitles', tab: 'access', group: 'Captions', type: 'toggle', default: true,
    label: 'Subtitles', desc: 'Every spoken announcement also appears as text.' },
  { key: 'soundCaptions', tab: 'access', group: 'Captions', type: 'toggle', default: false,
    label: 'Closed captions for sounds', desc: 'Important sounds as text — [Reversing alarm, close], [Carton falls], [Wrong flag].' },
  { key: 'captionSize', tab: 'access', group: 'Captions', type: 'select', default: 'medium',
    label: 'Caption size', options: [opt('small', 'Small'), opt('medium', 'Medium'), opt('large', 'Large')] },

  { key: 'colourblind', tab: 'access', group: 'Colour & size', type: 'select', default: 'none',
    label: 'Colour-blind mode', desc: 'Swaps the major / minor hazard colours and the right / wrong colours for ones you can tell apart. Severity is always written in words too.',
    options: [opt('none', 'Off'), opt('protanopia', 'Protanopia (red-weak)'), opt('deuteranopia', 'Deuteranopia (green-weak)'), opt('tritanopia', 'Tritanopia (blue-weak)')] },
  { key: 'uiScale', tab: 'access', group: 'Colour & size', type: 'range', default: 1, min: 0.8, max: 1.5, step: 0.05,
    label: 'Menu & text size', format: (v) => `${Math.round(v * 100)}%` },
  { key: 'hudScale', tab: 'access', group: 'Colour & size', type: 'range', default: 1, min: 0.75, max: 1.5, step: 0.05,
    label: 'HUD size', desc: 'The score, clock, guide and panels during a round.', format: (v) => `${Math.round(v * 100)}%` },

  { key: 'headBob', tab: 'access', group: 'Motion', type: 'toggle', default: true,
    label: 'Head bob', desc: 'The camera rises and falls as you walk.' },
  { key: 'cameraShake', tab: 'access', group: 'Motion', type: 'toggle', default: true,
    label: 'Camera shake', desc: 'A jolt when a carton lands near you.' },
  { key: 'reducedMotion', tab: 'access', group: 'Motion', type: 'toggle', default: false,
    label: 'Reduce all motion', desc: 'Turns off head bob, camera shake and menu animations together.' },
];

function pct(v) { return `${Math.round(v * 100)}%`; }

export const TABS = [
  { id: 'video', label: 'Video', icon: '🖥️' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'controls', label: 'Controls', icon: '🎮' },
  { id: 'gameplay', label: 'Gameplay', icon: '🎯' },
  { id: 'access', label: 'Accessibility', icon: '♿' },
  { id: 'account', label: 'Account & data', icon: '🔐' },
];

/** Every default in one object, deep-copied so callers cannot mutate it. */
export function defaultSettings() {
  const out = {};
  for (const f of SCHEMA) {
    if (f.type === 'info') continue;
    out[f.key] = f.key === 'keybinds' ? cloneBinds(DEFAULT_KEYBINDS) : f.default;
  }
  return out;
}

export const DEFAULTS = Object.freeze(defaultSettings());

function cloneBinds(b) {
  const out = {};
  for (const a of ACTIONS) out[a.id] = [...(b[a.id] ?? DEFAULT_KEYBINDS[a.id])];
  return out;
}

/**
 * Validate one value against the schema.
 * Returns the value if acceptable, otherwise the field's default.
 */
export function sanitise(key, value) {
  const f = SCHEMA.find((x) => x.key === key);
  if (!f || f.type === 'info') return undefined;
  switch (f.type) {
    case 'toggle':
      return typeof value === 'boolean' ? value : f.default;
    case 'range': {
      const n = Number(value);
      if (!Number.isFinite(n)) return f.default;
      return Math.min(f.max, Math.max(f.min, n));
    }
    case 'select': {
      const v = String(value);
      return f.options.some((o) => o.value === v) ? v : f.default;
    }
    case 'keybinds': {
      if (!value || typeof value !== 'object') return cloneBinds(DEFAULT_KEYBINDS);
      const out = {};
      for (const a of ACTIONS) {
        if (!Array.isArray(value[a.id])) continue;
        out[a.id] = [0, 1].map((i) => {
          const c = value[a.id][i];
          return typeof c === 'string' && c && !RESERVED_KEYS.includes(c) ? c : null;
        });
      }
      // An action added since the profile was saved gets its default keys,
      // minus any the trainee has already given to something else.
      const taken = new Set(Object.values(out).flat().filter(Boolean));
      for (const a of ACTIONS) {
        if (out[a.id]) continue;
        out[a.id] = DEFAULT_KEYBINDS[a.id].map((c) => (c && !taken.has(c) ? c : null));
      }
      promoteAll(out);
      // A profile with an action left completely unbound falls back to its
      // default — but never by taking a key that already does something else.
      for (const id of unboundActions(out)) {
        const used = new Set(Object.values(out).flat().filter(Boolean));
        out[id] = promoteAll({ x: DEFAULT_KEYBINDS[id].map((c) => (c && !used.has(c) ? c : null)) }).x;
      }
      return out;
    }
    case 'device':
      return typeof value === 'string' && value ? value : 'default';
    default:
      return f.default;
  }
}

/**
 * Bring a stored settings object up to the current schema: fill anything
 * missing with its default, repair anything invalid, and keep unknown keys
 * out. Safe to run on every load.
 */
export function migrateSettings(stored = {}) {
  const src = stored && typeof stored === 'object' ? stored : {};
  const out = {};
  for (const f of SCHEMA) {
    if (f.type === 'info') continue;
    out[f.key] = f.key in src ? sanitise(f.key, src[f.key]) : (f.key === 'keybinds' ? cloneBinds(DEFAULT_KEYBINDS) : f.default);
  }
  // Before "head bob" and "camera shake" existed, reducedMotion covered both.
  if (src.reducedMotion === true && !('headBob' in src)) out.headBob = false;
  // The quality label must describe the values actually stored.
  out.quality = detectPreset(out) === 'custom' ? 'custom' : detectPreset(out);
  return out;
}

/** Defaults for one tab, for the "Reset this tab" button. */
export function tabDefaults(tab) {
  const d = defaultSettings();
  const out = {};
  for (const f of SCHEMA) if (f.tab === tab && f.type !== 'info') out[f.key] = d[f.key];
  return out;
}
