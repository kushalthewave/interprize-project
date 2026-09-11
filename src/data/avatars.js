/**
 * data/avatars.js
 * The five trainee avatars — the warehouse safety team leads — as data.
 *
 * Kept apart from the drawing code (ui/avatars.js) so services and tests can
 * validate and migrate an avatar id without touching the DOM.
 */

/** @typedef {'curly'|'short'|'ponytail'|'hijab'} Hair */

export const AVATARS = {
  sarah: {
    id: 'sarah',
    name: 'Sarah',
    role: 'First Aider',
    blurb: 'First on scene. Carries the kit.',
    skin: '#7b4a2e',
    hair: /** @type {Hair} */ ('curly'),
    hairColour: '#24160f',
    hat: '#1e3a5f',
    hatShine: '#34557f',
    bg: ['#fed7aa', '#fb923c'],
    goggles: true,
    smile: 'teeth',
    prop: 'firstaid',
  },
  david: {
    id: 'david',
    name: 'David',
    role: 'Safety Inspector',
    blurb: 'Walks the floor with a checklist.',
    skin: '#a0683f',
    hair: 'short',
    hairColour: '#1f1a17',
    hat: '#f3f4f6',
    hatShine: '#ffffff',
    bg: ['#bbf7d0', '#4ade80'],
    goggles: true,
    beard: '#2a1d16',
    smile: 'soft',
    prop: 'clipboard',
  },
  maria: {
    id: 'maria',
    name: 'Maria',
    role: 'Emergency Response',
    blurb: 'Coordinates the response.',
    skin: '#c68a5e',
    hair: 'ponytail',
    hairColour: '#3b2416',
    hat: '#facc15',
    hatShine: '#fde047',
    bg: ['#bfdbfe', '#60a5fa'],
    goggles: false,
    earrings: true,
    smile: 'teeth',
    prop: 'firstaid',
  },
  james: {
    id: 'james',
    name: 'James',
    role: 'Fire Warden',
    blurb: 'Knows every exit and extinguisher.',
    skin: '#f1c7a0',
    hair: 'short',
    hairColour: '#7a4b2a',
    hat: '#dc2626',
    hatShine: '#ef4444',
    hatBadge: true,
    bg: ['#ddd6fe', '#a78bfa'],
    goggles: false,
    smile: 'soft',
    prop: 'extinguisher',
  },
  aisha: {
    id: 'aisha',
    name: 'Aisha',
    role: 'Radio & Comms Lead',
    blurb: 'Keeps the whole floor talking.',
    skin: '#d9a07a',
    hair: 'hijab',
    hairColour: '#1e2a4a',
    hat: '#facc15',
    hatShine: '#fde047',
    bg: ['#99f6e4', '#2dd4bf'],
    goggles: true,
    smile: 'soft',
    prop: 'radio',
  },
};

export const AVATAR_ORDER = ['sarah', 'david', 'maria', 'james', 'aisha'];
export const DEFAULT_AVATAR = 'sarah';

/**
 * Profiles saved before the five team leads existed stored 'male' / 'female'.
 * Map them rather than dropping the trainee back to a default they never chose.
 */
const LEGACY = { male: 'david', female: 'maria' };

export function normaliseAvatar(id) {
  // Own-property checks: a plain lookup would accept 'constructor' or
  // '__proto__', which exist on every object.
  if (typeof id !== 'string') return DEFAULT_AVATAR;
  if (Object.hasOwn(AVATARS, id)) return id;
  if (Object.hasOwn(LEGACY, id)) return LEGACY[id];
  return DEFAULT_AVATAR;
}

export function getAvatar(id) {
  return AVATARS[normaliseAvatar(id)];
}
