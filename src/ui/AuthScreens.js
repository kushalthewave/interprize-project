/**
 * AuthScreens.js
 * The login screen and the security panel.
 *
 * Every method is labelled with what it actually protects. Where something is
 * a local device unlock rather than server-verified identity, it says so - a
 * training tool that overstates its own security is teaching the wrong lesson.
 */
import { el, mount } from './dom.js';
import { qrToCanvas } from '../services/auth/qr.js';
import { formatSecret } from '../services/auth/base32.js';
import { totp, secondsRemaining } from '../services/auth/totp.js';

const AVATARS = {
  male: { face: '🧑🏽‍🏭', label: 'Ramesh', sub: 'Daura-surwal inspired · dhaka topi' },
  female: { face: '👩🏽‍🏭', label: 'Sunita', sub: 'Kurti-surwal inspired · dupatta' },
};

/* ================================================================== *
 * Login
 * ================================================================== */

/**
 * @param {object} ctx  { profile, auth, actions, go }
 * @param {object} caps result of AuthManager.capabilities()
 */
export function loginScreen(ctx, caps) {
  const p = ctx.profile;
  const err = el('div.auth-error', { role: 'alert' });
  const showErr = (m) => { err.textContent = m; err.classList.toggle('show', !!m); };

  /* ---- name + avatar (the default path) ---- */
  const nameInput = el('input', {
    type: 'text', placeholder: 'e.g. Sunita Shrestha', maxLength: 32,
    value: p.name || '', autocomplete: 'name', id: 'trainee-name',
  });

  let avatar = p.avatar || 'male';
  const avatarOpts = Object.entries(AVATARS).map(([key, a]) =>
    el(`button.avatar-opt${key === avatar ? '.selected' : ''}`, {
      type: 'button', 'aria-pressed': key === avatar,
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

  const submitName = async () => {
    const name = nameInput.value.trim();
    if (name.length < 2) {
      showErr('Please enter a name of at least 2 characters.');
      nameInput.focus();
      return;
    }
    showErr('');
    await ctx.actions.signInWithName({ name, avatar });
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitName(); });

  /* ---- passkey ---- */
  const passkeyBlock = () => {
    const pk = caps.passkey;
    if (pk.enrolled && pk.available) {
      return el('button.auth-btn.auth-passkey', {
        on: {
          click: async () => {
            showErr('');
            try { await ctx.actions.signInWithPasskey(); }
            catch (e) { showErr(e.message); }
          },
        },
      }, [
        el('span.auth-icon', { text: '🔐' }),
        el('span', {}, [
          el('span.auth-label', { text: 'Sign in with a passkey' }),
          el('span.auth-sub', { text: 'Fingerprint, face or device PIN — nothing to type' }),
        ]),
      ]);
    }
    if (!pk.available) {
      return el('div.auth-unavailable', {}, [
        el('span.auth-icon', { text: '🔐' }),
        el('span', {}, [
          el('span.auth-label', { text: 'Passkeys unavailable' }),
          el('span.auth-sub', { text: pk.reason }),
        ]),
      ]);
    }
    return el('div.auth-unavailable', {}, [
      el('span.auth-icon', { text: '🔐' }),
      el('span', {}, [
        el('span.auth-label', { text: 'No passkey yet' }),
        el('span.auth-sub', { text: 'Sign in below, then add one from Settings → Security.' }),
      ]),
    ]);
  };

  /* ---- social ---- */
  const socialButtons = caps.providers.map((prov) => {
    if (!prov.configured) {
      return el('button.auth-btn.auth-social.disabled', {
        disabled: true, title: prov.setupHint,
      }, [
        el('span.auth-icon', { text: prov.icon }),
        el('span', {}, [
          el('span.auth-label', { text: prov.label }),
          el('span.auth-sub', { text: prov.reason }),
        ]),
      ]);
    }
    return el('button.auth-btn.auth-social', {
      style: { background: prov.colour, color: prov.textColour },
      on: {
        click: async () => {
          showErr('');
          try { await ctx.actions.signInWithProvider(prov.id); }
          catch (e) { showErr(e.message); }
        },
      },
    }, [
      el('span.auth-icon', { text: prov.icon }),
      el('span.auth-label', { text: prov.label }),
    ]);
  });

  const anySocialConfigured = caps.providers.some((p2) => p2.configured);

  return el('div.screen', {}, [
    el('div.screen-inner.narrow', {}, [
      el('div.brand', {}, [
        el('h1', { text: 'BEAT THE HAZARD' }),
        el('p', { text: 'Warehouse Forklift & Pedestrian Safety Training' }),
        el('div.flagline', {}, ['🇳🇵', 'Himalaya Logistics · Birgunj Distribution Centre']),
      ]),

      el('div.card.stack', {}, [
        el('div.section-head', {}, [
          el('h2', { text: 'Start training' }),
          el('p', { text: 'Your name and progress are stored on this device only.' }),
        ]),

        passkeyBlock(),

        ...(anySocialConfigured || caps.providers.length
          ? [el('div.auth-divider', {}, [el('span', { text: 'or continue with' })]), ...socialButtons]
          : []),

        el('div.auth-divider', {}, [el('span', { text: 'or just use a name' })]),

        el('div', {}, [el('label', { for: 'trainee-name', text: 'Your name' }), nameInput]),
        el('div', {}, [el('label', { text: 'Choose your avatar' }), el('div.avatar-grid', {}, avatarOpts)]),
        err,
        el('button.btn.btn-primary.btn-lg.btn-block', {
          text: 'Enter the warehouse', on: { click: submitName },
        }),
        el('button.btn.btn-sm.btn-ghost.btn-block', {
          text: 'Continue as guest',
          on: { click: () => ctx.actions.signInWithName({ name: 'Trainee', avatar }) },
        }),
      ]),

      el('p.faint.center.mt', {
        text: 'This is a training simulation. Hazards shown are staged for teaching purposes.',
      }),
    ]),
  ]);
}

/* ================================================================== *
 * Second factor prompt
 * ================================================================== */

export function totpChallengeScreen(ctx, { onSuccess }) {
  const err = el('div.auth-error', { role: 'alert' });
  const input = el('input', {
    type: 'text', inputMode: 'numeric', autocomplete: 'one-time-code',
    maxLength: 7, placeholder: '000000', id: 'totp-code', class: 'totp-input',
  });

  const submit = async () => {
    const ok = await ctx.auth.verifyTotpCode(input.value);
    if (ok) { onSuccess(); return; }
    err.textContent = 'That code is not right. Check the app and try again.';
    err.classList.add('show');
    input.value = '';
    input.focus();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value.length === 6) submit();
  });

  setTimeout(() => input.focus(), 50);

  return el('div.screen', {}, [
    el('div.screen-inner.narrow', {}, [
      el('div.card.stack.center', {}, [
        el('div', { text: '🔢', style: { fontSize: '2.4rem' } }),
        el('h2', { text: 'Enter your 6-digit code' }),
        el('p.muted', { text: 'Open your authenticator app and type the current code for Beat The Hazard.' }),
        input,
        err,
        el('button.btn.btn-primary.btn-block', { text: 'Verify', on: { click: submit } }),
        el('button.btn.btn-ghost.btn-sm', {
          text: 'Cancel', on: { click: () => ctx.actions.signOut() },
        }),
      ]),
    ]),
  ]);
}

/* ================================================================== *
 * Security panel (inside Settings)
 * ================================================================== */

export function securityPanel(ctx, caps, rerender) {
  const auth = ctx.auth;
  const rows = [];

  /* ---- passkeys ---- */
  const pk = caps.passkey;
  const passkeyRows = auth.security.passkeys.map((cred) =>
    el('div.cred-row', {}, [
      el('span.cred-icon', { text: '🔐' }),
      el('div', { style: { flex: '1' } }, [
        el('div.cred-name', { text: cred.deviceLabel || 'Passkey' }),
        el('div.cred-meta', {
          text: `Added ${new Date(cred.createdAt).toLocaleDateString()}` +
            (cred.lastUsedAt ? ` · last used ${new Date(cred.lastUsedAt).toLocaleDateString()}` : ''),
        }),
      ]),
      el('button.btn.btn-sm.btn-danger', {
        text: 'Remove',
        on: {
          click: () => {
            if (confirm('Remove this passkey? You can add it again at any time.')) {
              auth.removePasskey(cred.id);
              rerender();
            }
          },
        },
      }),
    ]),
  );

  rows.push(el('div.card', {}, [
    el('h3', { text: '🔐 Passkeys' }),
    el('p.set-desc', {
      text: 'Sign in with your fingerprint, face or device PIN instead of typing anything. ' +
        'The key never leaves this device.',
    }),
    ...passkeyRows,
    pk.available
      ? el('button.btn.btn-primary.btn-block.mt', {
          text: auth.hasPasskey ? 'Add another passkey' : 'Set up a passkey',
          on: {
            click: async () => {
              try { await auth.enrolPasskey(); rerender(); }
              catch (e) { ctx.actions.toast(e.message, 'error'); }
            },
          },
        })
      : el('div.auth-note.mt', { text: pk.reason }),
    el('div.auth-note.small.mt', {
      text: 'Note: with no server behind this game, a passkey unlocks the profile on this ' +
        'device. It is not a server-verified identity.',
    }),
  ]));

  /* ---- TOTP ---- */
  rows.push(auth.hasTotp
    ? el('div.card.mt', {}, [
        el('h3', { text: '🔢 Authenticator app' }),
        el('div.cred-row', {}, [
          el('span.cred-icon', { text: '✅' }),
          el('div', { style: { flex: '1' } }, [
            el('div.cred-name', { text: 'Two-factor is on' }),
            el('div.cred-meta', {
              text: `Connected ${new Date(auth.security.totp.enrolledAt).toLocaleDateString()}`,
            }),
          ]),
          el('button.btn.btn-sm.btn-danger', {
            text: 'Turn off',
            on: {
              click: () => {
                if (confirm('Turn off two-factor authentication?')) { auth.disableTotp(); rerender(); }
              },
            },
          }),
        ]),
      ])
    : el('div.card.mt', {}, [
        el('h3', { text: '🔢 Authenticator app' }),
        el('p.set-desc', {
          text: 'Add a 6-digit code from Google Authenticator, Authy, 1Password or any ' +
            'other TOTP app as a second step at sign-in.',
        }),
        el('button.btn.btn-primary.btn-block.mt', {
          text: 'Set up two-factor',
          on: { click: () => ctx.actions.beginTotpSetup() },
        }),
      ]));

  return rows;
}

/* ================================================================== *
 * TOTP enrolment dialog
 * ================================================================== */

export function totpSetupScreen(ctx, { secret, uri, onDone, onCancel }) {
  const err = el('div.auth-error', { role: 'alert' });

  // The QR is generated locally - nothing about the secret leaves the browser.
  let qrNode;
  try {
    qrNode = qrToCanvas(uri, { ec: 'M', scale: 5, margin: 3, dark: '#0b0f14', light: '#ffffff' });
    qrNode.className = 'totp-qr';
    qrNode.setAttribute('role', 'img');
    qrNode.setAttribute('aria-label', 'QR code for your authenticator app');
  } catch (e) {
    qrNode = el('div.auth-note', { text: `Could not draw the QR code: ${e.message}` });
  }

  const input = el('input', {
    type: 'text', inputMode: 'numeric', autocomplete: 'one-time-code',
    maxLength: 7, placeholder: '000000', class: 'totp-input',
  });

  const verify = async () => {
    const ok = await ctx.auth.confirmTotpEnrolment(secret, input.value);
    if (ok) { onDone(); return; }
    err.textContent = 'That code did not match. Check the app, then try the next code.';
    err.classList.add('show');
    input.value = '';
    input.focus();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value.length === 6) verify();
  });

  return el('div.screen', {}, [
    el('div.screen-inner', {}, [
      el('div.section-head', {}, [
        el('h2', { text: 'Connect your authenticator app' }),
        el('p', { text: 'Three steps. It takes about thirty seconds.' }),
      ]),

      el('div.grid.grid-2', {}, [
        el('div.card', {}, [
          el('h3', { text: '1. Scan this code' }),
          el('div.totp-qr-wrap', {}, [qrNode]),
          el('p.set-desc.center', { text: 'Google Authenticator, Authy, 1Password, Microsoft Authenticator — any of them.' }),
        ]),

        el('div.card', {}, [
          el('h3', { text: '2. Or type the key by hand' }),
          el('p.set-desc', { text: 'If you cannot scan, add an account manually and enter this key:' }),
          el('div.totp-secret', { text: formatSecret(secret) }),
          el('button.btn.btn-sm.btn-block', {
            text: 'Copy key',
            on: {
              click: async (e) => {
                try {
                  await navigator.clipboard.writeText(secret);
                  e.currentTarget.textContent = 'Copied ✓';
                  setTimeout(() => { e.currentTarget.textContent = 'Copy key'; }, 1600);
                } catch {
                  ctx.actions.toast('Could not copy — select the key and copy it manually.', 'error');
                }
              },
            },
          }),

          el('h3', { class: 'mt', text: '3. Enter the code it shows' }),
          input,
          err,
          el('div.row', {}, [
            el('button.btn.btn-primary', { text: 'Verify & turn on', on: { click: verify } }),
            el('button.btn.btn-ghost', { text: 'Cancel', on: { click: onCancel } }),
          ]),
        ]),
      ]),

      el('div.auth-note.mt', {
        text: 'Because this game has no server, the shared secret is stored in this browser. ' +
          'That makes two-factor here a genuine local safeguard and a working demonstration of ' +
          'the real algorithm — but not a server-enforced control.',
      }),
    ]),
  ]);
}

/**
 * A live preview of the current code, used on the setup screen so the trainee
 * can confirm their app agrees with us. Returns a stop() function.
 */
export function attachTotpPreview(node, secret) {
  let alive = true;
  const tick = async () => {
    if (!alive) return;
    try {
      const code = await totp(secret);
      const left = secondsRemaining();
      node.textContent = `${code.slice(0, 3)} ${code.slice(3)}  ·  ${left}s`;
    } catch { /* ignore */ }
    if (alive) setTimeout(tick, 1000);
  };
  tick();
  return () => { alive = false; };
}
