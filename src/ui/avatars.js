/**
 * avatars.js
 * The five trainee avatars — the warehouse safety team leads.
 *
 * Each one is drawn as an inline SVG portrait rather than loaded as an image:
 * the product ships no third-party art, the single-file offline build stays
 * self-contained, and the portraits stay sharp from a 32 px HUD chip to a
 * 160 px profile header. Every portrait shares one construction — hi-vis
 * jacket with reflective stripes, a first-aid badge, a hard hat — and differs
 * in the things that make a person recognisable: face, hair, hat colour and
 * the kit they carry for their role.
 */

import { AVATARS, AVATAR_ORDER, DEFAULT_AVATAR, normaliseAvatar, getAvatar } from '../data/avatars.js';

export { AVATARS, AVATAR_ORDER, DEFAULT_AVATAR, normaliseAvatar, getAvatar };

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

let uid = 0;

function hairBack(a) {
  const c = a.hairColour;
  switch (a.hair) {
    case 'curly':
      // Volume either side of the face, under the hat brim.
      return [
        [41, 60, 8], [38, 70, 8], [42, 80, 7], [48, 86, 5],
        [79, 60, 8], [82, 70, 8], [78, 80, 7], [72, 86, 5],
      ].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
    case 'ponytail':
      return `<ellipse cx="38" cy="78" rx="6.5" ry="12" fill="${c}" transform="rotate(14 38 78)"/>` +
        `<path d="M43 52 Q41 64 44 72 L47 72 Q46 62 48 54 Z" fill="${c}"/>` +
        `<path d="M77 52 Q79 64 76 72 L73 72 Q74 62 72 54 Z" fill="${c}"/>`;
    case 'hijab':
      // Wraps the head and falls over the neck and shoulders.
      return `<path d="M37 64 C37 44 47 38 60 38 C73 38 83 44 83 64 L86 96 C76 104 44 104 34 96 Z" fill="${c}"/>`;
    case 'short':
    default:
      return `<path d="M43 51 Q42 58 44 63 L47 63 Q46 57 47 52 Z" fill="${c}"/>` +
        `<path d="M77 51 Q78 58 76 63 L73 63 Q74 57 73 52 Z" fill="${c}"/>`;
  }
}

function face(a) {
  const hijab = a.hair === 'hijab';
  const ears = hijab ? '' :
    `<ellipse cx="43.2" cy="66" rx="3" ry="4.6" fill="${a.skin}"/>` +
    `<ellipse cx="76.8" cy="66" rx="3" ry="4.6" fill="${a.skin}"/>`;
  const earrings = a.earrings
    ? '<circle cx="43.2" cy="72" r="1.6" fill="#fbbf24"/><circle cx="76.8" cy="72" r="1.6" fill="#fbbf24"/>'
    : '';
  const beard = a.beard
    ? `<path d="M45 70 Q46 87 60 89 Q74 87 75 70 Q71 81 60 82 Q49 81 45 70 Z" fill="${a.beard}"/>` +
      `<path d="M53.5 74.5 Q60 71.5 66.5 74.5 Q60 76 53.5 74.5 Z" fill="${a.beard}"/>`
    : '';
  const mouth = a.smile === 'teeth'
    ? '<path d="M53 73.5 Q60 81.5 67 73.5 Z" fill="#fff" stroke="#6b2a2a" stroke-width="1.3" stroke-linejoin="round"/>'
    : `<path d="M54.5 ${a.beard ? 77 : 74.5} Q60 ${a.beard ? 80 : 78.5} 65.5 ${a.beard ? 77 : 74.5}" fill="none" stroke="#6b2a2a" stroke-width="1.7" stroke-linecap="round"/>`;
  const brows = `<path d="M50 59.5 Q53.5 57.5 57 59.5" fill="none" stroke="${a.hair === 'hijab' ? '#3a2a22' : a.hairColour}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M63 59.5 Q66.5 57.5 70 59.5" fill="none" stroke="${a.hair === 'hijab' ? '#3a2a22' : a.hairColour}" stroke-width="1.5" stroke-linecap="round"/>`;
  const eyes = '<ellipse cx="53.5" cy="64.5" rx="1.9" ry="2.1" fill="#1f2933"/>' +
    '<ellipse cx="66.5" cy="64.5" rx="1.9" ry="2.1" fill="#1f2933"/>';
  const nose = `<path d="M60 64 Q58.4 69.5 60.6 70.3" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="1.2" stroke-linecap="round"/>`;
  const cheeks = '<circle cx="50" cy="71" r="2.6" fill="#f87171" opacity=".18"/><circle cx="70" cy="71" r="2.6" fill="#f87171" opacity=".18"/>';

  // A hijab frames the face and wraps under the chin, so the neck is covered
  // and the fabric is drawn over the edge of the face rather than behind it —
  // otherwise it reads as long hair.
  const neck = hijab ? '' :
    `<rect x="53" y="78" width="14" height="12" rx="3" fill="${a.skin}"/>` +
    '<path d="M53 84 Q60 88 67 84 L67 88 Q60 91 53 88 Z" fill="rgba(0,0,0,.12)"/>';
  const wrap = hijab
    ? `<ellipse cx="60" cy="65.5" rx="18.2" ry="21.2" fill="none" stroke="${a.hairColour}" stroke-width="4.4"/>` +
      `<path d="M41 76 Q60 97 79 76 L84 94 Q60 103 36 94 Z" fill="${a.hairColour}"/>` +
      '<path d="M46 86 Q60 96 74 86" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.4"/>'
    : '';

  return neck + ears + earrings +
    `<ellipse cx="60" cy="65" rx="16.5" ry="19.5" fill="${a.skin}"/>` +
    cheeks + beard + brows + eyes + nose + mouth + wrap;
}

function goggles() {
  return '<path d="M43 61.5 L38 60.5" stroke="#374151" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M77 61.5 L82 60.5" stroke="#374151" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="43.5" y="58.5" width="33" height="11" rx="5.5" fill="rgba(214,236,250,.62)" stroke="#6b7280" stroke-width="1.4"/>' +
    '<path d="M58 69 Q60 66 62 69" fill="none" stroke="#6b7280" stroke-width="1.2"/>' +
    '<path d="M47 61.5 L52 61.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M64 61.5 L69 61.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>';
}

function hardHat(a) {
  const badge = a.hatBadge
    ? '<path d="M56.5 33 L63.5 33 L63.5 38.5 Q60 42.5 56.5 38.5 Z" fill="#fde68a" stroke="#b45309" stroke-width=".8"/>'
    : '';
  return `<path d="M40 53 C40 34 49 26 60 26 C71 26 80 34 80 53 Z" fill="${a.hat}"/>` +
    `<path d="M57.5 27 L62.5 27 L62.5 52 L57.5 52 Z" fill="${a.hatShine}" opacity=".85"/>` +
    '<path d="M45 34 Q48 30 52 29" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>' +
    `<path d="M33 54 Q60 47.5 87 54 L87 57.5 Q60 52 33 57.5 Z" fill="${a.hat}"/>` +
    '<path d="M33 57.5 Q60 52 87 57.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>' +
    badge;
}

function jacket() {
  return '<path d="M16 124 C18 99 36 88 60 88 C84 88 102 99 104 124 Z" fill="#f97316"/>' +
    '<path d="M60 88 C84 88 102 99 104 124 L60 124 Z" fill="#ea580c" opacity=".35"/>' +
    '<path d="M50 88 L60 100 L55 88 Z" fill="#c2410c"/>' +
    '<path d="M70 88 L60 100 L65 88 Z" fill="#c2410c"/>' +
    '<rect x="39" y="93" width="6" height="31" fill="#e5e7eb"/>' +
    '<rect x="75" y="93" width="6" height="31" fill="#e5e7eb"/>' +
    '<rect x="18" y="109" width="84" height="6" fill="#e5e7eb"/>' +
    '<rect x="39" y="93" width="6" height="31" fill="none" stroke="#9ca3af" stroke-width=".6"/>' +
    '<rect x="75" y="93" width="6" height="31" fill="none" stroke="#9ca3af" stroke-width=".6"/>' +
    '<path d="M60 99 L60 124" stroke="#1f2933" stroke-width="1.6"/>' +
    '<circle cx="71" cy="101" r="6" fill="#16a34a" stroke="#fff" stroke-width="1.3"/>' +
    '<rect x="69.8" y="97.4" width="2.4" height="7.2" rx=".5" fill="#fff"/>' +
    '<rect x="67.4" y="99.8" width="7.2" height="2.4" rx=".5" fill="#fff"/>';
}

function propIcon(kind) {
  switch (kind) {
    case 'firstaid':
      return '<path d="M-4 -8 Q-4 -11 0 -11 Q4 -11 4 -8" fill="none" stroke="#7f1d1d" stroke-width="1.8"/>' +
        '<rect x="-9" y="-8" width="18" height="15" rx="3" fill="#dc2626"/>' +
        '<rect x="-1.4" y="-5.5" width="2.8" height="10" rx=".6" fill="#fff"/>' +
        '<rect x="-5" y="-1.9" width="10" height="2.8" rx=".6" fill="#fff"/>';
    case 'clipboard':
      return '<rect x="-7.5" y="-10" width="15" height="19" rx="2" fill="#92400e"/>' +
        '<rect x="-5.8" y="-7.5" width="11.6" height="15" rx="1" fill="#fff"/>' +
        '<rect x="-3" y="-11.2" width="6" height="3.2" rx="1" fill="#6b7280"/>' +
        '<path d="M-4.2 -3.6 L-2.8 -2.2 L-0.6 -4.8" fill="none" stroke="#16a34a" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M-4.2 0.8 L-2.8 2.2 L-0.6 -0.4" fill="none" stroke="#16a34a" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M-4.2 5.2 L-2.8 6.6 L-0.6 4" fill="none" stroke="#16a34a" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M1 -3.6 H4.2 M1 0.8 H4.2 M1 5.2 H4.2" stroke="#9ca3af" stroke-width="1"/>';
    case 'extinguisher':
      return '<rect x="-4.5" y="-6" width="9" height="16" rx="3.5" fill="#dc2626"/>' +
        '<rect x="-2.2" y="-9.5" width="4.4" height="4" rx="1" fill="#1f2933"/>' +
        '<path d="M2 -8 Q8 -9 8 -3" fill="none" stroke="#1f2933" stroke-width="1.6" stroke-linecap="round"/>' +
        '<rect x="-3" y="-1" width="6" height="4" rx="1" fill="#fff"/>' +
        '<path d="M0 -0.3 Q-1.4 1 0 2.4 Q1.4 1 0 -0.3 Z" fill="#f97316"/>';
    case 'radio':
      return '<rect x="-5.5" y="-6" width="11" height="17" rx="2.5" fill="#1f2933"/>' +
        '<rect x="2" y="-13" width="2" height="8" rx="1" fill="#1f2933"/>' +
        '<rect x="-3.5" y="-3.5" width="7" height="4.5" rx="1" fill="#fde047"/>' +
        '<circle cx="-1.8" cy="4" r="1" fill="#6b7280"/><circle cx="1.8" cy="4" r="1" fill="#6b7280"/>' +
        '<circle cx="-1.8" cy="7" r="1" fill="#6b7280"/><circle cx="1.8" cy="7" r="1" fill="#6b7280"/>';
    default:
      return '';
  }
}

/**
 * The portrait as an SVG string.
 * @param {string} id          avatar id (legacy ids are accepted)
 * @param {object} [o]
 * @param {boolean} [o.badge]  show the role prop badge (off for tiny chips)
 * @param {string}  [o.title]  accessible label
 */
export function avatarSVG(id, { badge = true, title = null } = {}) {
  const a = getAvatar(id);
  const n = ++uid;
  const clip = `av-clip-${a.id}-${n}`;
  const grad = `av-grad-${a.id}-${n}`;
  const label = String(title ?? `${a.name}, ${a.role}`)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  const propBadge = badge
    ? `<g transform="translate(101 101)">` +
      '<circle r="15" fill="#fff" stroke="rgba(15,23,42,.10)" stroke-width="1"/>' +
      propIcon(a.prop) +
      '</g>'
    : '';

  return `<svg viewBox="0 0 124 124" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" class="avatar-svg">` +
    `<title>${label}</title>` +
    '<defs>' +
    `<linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.bg[0]}"/><stop offset="1" stop-color="${a.bg[1]}"/></linearGradient>` +
    `<clipPath id="${clip}"><circle cx="60" cy="60" r="52"/></clipPath>` +
    '</defs>' +
    `<circle cx="60" cy="60" r="55" fill="#fff"/>` +
    `<g clip-path="url(#${clip})">` +
    `<rect width="124" height="124" fill="url(#${grad})"/>` +
    hairBack(a) +
    jacket() +
    face(a) +
    (a.goggles ? goggles() : '') +
    hardHat(a) +
    '</g>' +
    propBadge +
    '</svg>';
}

/** An element wrapping the portrait, ready to insert. */
export function avatarNode(id, { size = 64, badge = true, className = '' } = {}) {
  const wrap = document.createElement('span');
  wrap.className = `avatar ${className}`.trim();
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.innerHTML = avatarSVG(id, { badge });
  return wrap;
}
