/**
 * The settings model: defaults, validation, presets, key rebinding,
 * migration from older profiles, and the frame-cap / resolution maths.
 */
import { describe, it, expect } from 'vitest';
import {
  SCHEMA, TABS, ACTIONS, DEFAULTS, DEFAULT_KEYBINDS, RESERVED_KEYS,
  defaultSettings, sanitise, migrateSettings, tabDefaults,
  presetPatch, detectPreset, PRESETS, PRESET_ORDER,
  rebind, actionForKey, unboundActions, keyLabel,
  pixelRatioFor, effectiveResolution, shouldRenderFrame,
} from '../src/data/settings.js';

describe('Settings - schema', () => {
  it('puts every setting on a tab that exists', () => {
    const tabs = TABS.map((t) => t.id);
    for (const f of SCHEMA) expect(tabs).toContain(f.tab);
  });

  it('has unique keys', () => {
    const keys = SCHEMA.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every select a default that is one of its options', () => {
    for (const f of SCHEMA.filter((x) => x.type === 'select')) {
      expect(f.options.map((o) => o.value)).toContain(f.default);
    }
  });

  it('gives every range a default inside its bounds', () => {
    for (const f of SCHEMA.filter((x) => x.type === 'range')) {
      expect(f.default).toBeGreaterThanOrEqual(f.min);
      expect(f.default).toBeLessThanOrEqual(f.max);
    }
  });

  it('marks the things a browser controls as information, with a reason', () => {
    for (const key of ['vsync', 'rayTracing']) {
      const f = SCHEMA.find((x) => x.key === key);
      expect(f.type).toBe('info');
      expect(f.browser.length).toBeGreaterThan(20);
    }
  });

  it('covers every section that was asked for', () => {
    const keys = SCHEMA.map((f) => f.key);
    for (const k of [
      'renderScale', 'displayMode', 'vsync', 'fpsCap', 'fov', 'quality',
      'textureQuality', 'shadowQuality', 'antialias', 'lighting', 'rayTracing',
      'motionBlur', 'lensFlare', 'depthOfField',
      'volume', 'musicVolume', 'voiceVolume', 'sfxVolume', 'outputDevice',
      'keybinds', 'lookSensitivity', 'invertY', 'aimAssist',
      'defaultDifficulty', 'crosshairStyle', 'crosshairSize', 'crosshairColour', 'showHints', 'autosave',
      'subtitles', 'soundCaptions', 'colourblind', 'uiScale', 'hudScale', 'headBob', 'cameraShake',
      'cameraView', 'avatarIntro',
    ]) expect(keys).toContain(k);
  });
});

describe('Settings - defaults and validation', () => {
  it('keeps info rows out of the stored settings', () => {
    expect('vsync' in DEFAULTS).toBe(false);
    expect('rayTracing' in DEFAULTS).toBe(false);
  });

  it('returns a fresh copy each time, so callers cannot corrupt the defaults', () => {
    const a = defaultSettings();
    a.keybinds.flag[0] = 'KeyQ';
    expect(defaultSettings().keybinds.flag[0]).toBe('KeyE');
  });

  it('matches the High preset out of the box', () => {
    expect(detectPreset(DEFAULTS)).toBe('high');
    expect(DEFAULTS.quality).toBe('high');
  });

  it('clamps ranges', () => {
    expect(sanitise('fov', 500)).toBe(100);
    expect(sanitise('fov', 10)).toBe(60);
    expect(sanitise('volume', 'abc')).toBe(0.7);
  });

  it('rejects unknown select values', () => {
    expect(sanitise('shadowQuality', 'extreme')).toBe('high');
    expect(sanitise('colourblind', 'protanopia')).toBe('protanopia');
  });

  it('rejects non-boolean toggles', () => {
    expect(sanitise('motionBlur', 'yes')).toBe(false);
  });
});

describe('Settings - migration', () => {
  it('fills a brand-new profile with every default', () => {
    expect(migrateSettings({})).toEqual(defaultSettings());
  });

  it('keeps the values an older profile already had', () => {
    const m = migrateSettings({ audio: false, volume: 0.3, invertY: true, lookSensitivity: 2 });
    expect(m).toMatchObject({ audio: false, volume: 0.3, invertY: true, lookSensitivity: 2 });
    expect(m.musicVolume).toBe(0.35);
  });

  it('turns head bob off for someone who had asked for reduced motion before it existed', () => {
    expect(migrateSettings({ reducedMotion: true }).headBob).toBe(false);
    expect(migrateSettings({ reducedMotion: true, headBob: true }).headBob).toBe(true);
  });

  it('drops keys that are not settings', () => {
    expect('evil' in migrateSettings({ evil: 1 })).toBe(false);
  });

  it('repairs a key-binding table with an action left unbound', () => {
    const m = migrateSettings({ keybinds: { ...DEFAULT_KEYBINDS, flag: [null, null] } });
    expect(m.keybinds.flag).toEqual(DEFAULT_KEYBINDS.flag);
  });

  it('strips reserved keys out of stored bindings', () => {
    const m = migrateSettings({ keybinds: { ...DEFAULT_KEYBINDS, pause: ['Escape', 'KeyP'] } });
    expect(m.keybinds.pause).toEqual(['KeyP', null]);
  });

  it('labels the quality as Custom when the stored values match no preset', () => {
    expect(migrateSettings({ shadowQuality: 'off', textureQuality: 'ultra' }).quality).toBe('custom');
  });
});

describe('Settings - presets', () => {
  it('every preset is recognised as itself', () => {
    for (const name of PRESET_ORDER) {
      expect(detectPreset({ ...DEFAULTS, ...presetPatch(name) })).toBe(name);
    }
  });

  it('never switches post-processing on', () => {
    for (const name of PRESET_ORDER) {
      const p = PRESETS[name];
      expect(p.motionBlur).toBeUndefined();
      expect(p.depthOfField).toBeUndefined();
      expect(p.lensFlare).toBeUndefined();
    }
  });

  it('changing one advanced value makes it Custom', () => {
    expect(detectPreset({ ...DEFAULTS, shadowQuality: 'low' })).toBe('custom');
  });

  it('gets cheaper from Ultra down to Low', () => {
    expect(PRESETS.low.shadowQuality).toBe('off');
    expect(PRESETS.ultra.shadowQuality).toBe('ultra');
    expect(PRESETS.low.antialias).toBe('off');
  });
});

describe('Settings - key rebinding', () => {
  const kb = () => defaultSettings().keybinds;

  it('binds a new key', () => {
    const { keybinds, displaced, error } = rebind(kb(), 'flag', 0, 'KeyF');
    expect(error).toBeNull();
    expect(displaced).toBeNull();
    expect(keybinds.flag[0]).toBe('KeyF');
    expect(actionForKey(keybinds, 'KeyF')).toBe('flag');
  });

  it('takes a key away from the action that had it, and says which', () => {
    const { keybinds, displaced } = rebind(kb(), 'flag', 0, 'KeyW');
    expect(keybinds.flag[0]).toBe('KeyW');
    expect(keybinds.forward).not.toContain('KeyW');
    expect(displaced).toEqual({ action: 'forward', slot: 0 });
    // One key, one action.
    expect(actionForKey(keybinds, 'KeyW')).toBe('flag');
  });

  it('promotes the alternative key so the displaced action still works', () => {
    const { keybinds } = rebind(kb(), 'flag', 0, 'KeyW');
    expect(keybinds.forward).toEqual(['ArrowUp', null]);
    expect(actionForKey(keybinds, 'ArrowUp')).toBe('forward');
  });

  it('refuses keys the browser keeps for itself', () => {
    for (const code of RESERVED_KEYS) {
      const r = rebind(kb(), 'flag', 0, code);
      expect(r.error).toMatch(/reserved/);
      expect(r.keybinds.flag[0]).toBe('KeyE');
    }
  });

  it('can clear the alternative slot', () => {
    const { keybinds } = rebind(kb(), 'forward', 1, null);
    expect(keybinds.forward).toEqual(['KeyW', null]);
  });

  it('never leaves the primary empty while the alternative is set', () => {
    const { keybinds } = rebind(kb(), 'forward', 0, null);
    expect(keybinds.forward).toEqual(['ArrowUp', null]);
  });

  it('reports actions left with no key at all', () => {
    const b = kb();
    b.pause = [null, null];
    expect(unboundActions(b)).toEqual(['pause']);
    expect(unboundActions(kb())).toEqual([]);
  });

  it('does not mutate the table it was given', () => {
    const b = kb();
    rebind(b, 'flag', 0, 'KeyW');
    expect(b.forward[0]).toBe('KeyW');
  });

  it('gives a profile saved before the view key existed the V key', () => {
    const old = kb();
    delete old.view;
    expect(sanitise('keybinds', old).view).toEqual(['KeyV', null]);
  });

  it('does not take V for the view key when the trainee already uses it', () => {
    const old = kb();
    delete old.view;
    old.flag = ['KeyV', null];
    const out = sanitise('keybinds', old);
    expect(out.flag).toEqual(['KeyV', null]);
    expect(out.view).toEqual([null, null]);
  });

  it('shows the avatar in third person by default', () => {
    expect(DEFAULTS.cameraView).toBe('third');
    expect(DEFAULTS.avatarIntro).toBe(true);
    expect(sanitise('cameraView', 'sideways')).toBe('third');
    expect(sanitise('cameraView', 'first')).toBe('first');
  });

  it('has a default for every action', () => {
    for (const a of ACTIONS) expect(DEFAULT_KEYBINDS[a.id][0]).toBeTruthy();
  });

  it('names keys the way a player would', () => {
    expect(keyLabel('KeyE')).toBe('E');
    expect(keyLabel('ShiftLeft')).toBe('Left Shift');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Digit4')).toBe('4');
    expect(keyLabel(null)).toBe('—');
  });
});

describe('Settings - resolution and frame cap maths', () => {
  it('follows the display on Auto', () => {
    expect(pixelRatioFor('auto', 2, 2)).toBe(2);
    expect(pixelRatioFor('auto', 3, 2)).toBe(2);
  });

  it('scales from the native resolution', () => {
    expect(pixelRatioFor('0.5', 2, 2)).toBe(1);
    expect(pixelRatioFor('1', 1, 2)).toBe(1);
    expect(pixelRatioFor('1.5', 1, 2)).toBe(1.5);
  });

  it('never renders below half a pixel per CSS pixel', () => {
    expect(pixelRatioFor('0.5', 1, 2)).toBe(0.5);
  });

  it('reports the resolution a ratio produces', () => {
    expect(effectiveResolution(1920, 1080, 0.75)).toEqual({ width: 1440, height: 810 });
  });

  it('draws every frame with no cap', () => {
    expect(shouldRenderFrame(1000, 999.9, 0)).toBe(true);
  });

  it('skips frames that arrive too soon under a cap', () => {
    expect(shouldRenderFrame(1010, 1000, 30)).toBe(false);
    expect(shouldRenderFrame(1034, 1000, 30)).toBe(true);
  });

  it('does not halve a 60 Hz display under a 60 fps cap because of jitter', () => {
    // A 60 Hz frame can arrive at 16.4 ms rather than 16.67 ms.
    expect(shouldRenderFrame(1016.4, 1000, 60)).toBe(true);
  });
});

describe('Settings - per-tab reset', () => {
  it('resets only the settings on that tab', () => {
    const d = tabDefaults('audio');
    expect(Object.keys(d).sort()).toEqual(['audio', 'musicVolume', 'outputDevice', 'sfxVolume', 'voiceVolume', 'volume']);
  });
});
