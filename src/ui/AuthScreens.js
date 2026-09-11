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
import { setAuthConfig, getStoredAuthConfig, isFromBuild } from '../services/auth/providers.js';

import { AVATARS, AVATAR_ORDER, avatarNode, normaliseAvatar } from './avatars.js';

/**
 * The avatar picker, shared by the login and profile screens. A large
 * preview shows who you are; the grid below shows all five. Returns the node
 * and a getter for the current choice.
 */
export function avatarPicker(initial, { onChange } = {}) {
  let chosen = normaliseAvatar(initial);
  const preview = el('div.avatar-preview');
  const renderPreview = () => {
    const a = AVATARS[chosen];
    mount(preview,
      avatarNode(chosen, { size: 92 }),
      el('div', {}, [
        el('div.ap-k', { text: 'You are' }),
        el('div.ap-name', { text: a.name }),
        el('div.ap-role', { text: a.role }),
        el('div.ap-blurb', { text: a.blurb }),
      ]),
    );
  };

  const grid = el('div.avatar-grid', { role: 'group', 'aria-label': 'Choose your avatar' });
  for (const id of AVATAR_ORDER) {
    const a = AVATARS[id];
    const b = el(`button.avatar-opt${id === chosen ? '.selected' : ''}`, {
      type: 'button',
      'aria-pressed': String(id === chosen),
      'aria-label': `${a.name}, ${a.role}`,
      title: `${a.name} — ${a.role}`,
    }, [
      avatarNode(id, { size: 58, badge: false }),
      el('span.label', { text: a.name }),
      el('span.sub', { text: a.role }),
    ]);
    b.addEventListener('click', () => {
      chosen = id;
      for (const n of grid.children) {
        n.classList.toggle('selected', n === b);
        n.setAttribute('aria-pressed', String(n === b));
      }
      renderPreview();
      onChange?.(id);
    });
    grid.append(b);
  }
  renderPreview();

  return { node: el('div.avatar-picker', {}, [preview, grid]), get value() { return chosen; } };
}

/* ================================================================== *
 * Login
 * ================================================================== */

/**
 * @param {object} ctx  { profile, auth, actions, go }
 * @param {object} caps result of AuthManager.capabilities()
 */
export function loginScreen(ctx, caps) {
  const p = ctx.profile;
  const back = caps.remembered;          // who signed out last on this device
  const err = el('div.auth-error', { role: 'alert' });
  const showErr = (m) => { err.textContent = m; err.classList.toggle('show', !!m); };

  /* ---- name + avatar (the default path) ---- */
  const nameInput = el('input', {
    type: 'text', placeholder: 'e.g. Sunita Shrestha', maxLength: 32,
    value: p.name || back?.name || '', autocomplete: 'name', id: 'trainee-name',
  });
  const picker = avatarPicker(p.name ? p.avatar : (back?.avatar ?? p.avatar));

  const submitName = async () => {
    const name = nameInput.value.trim();
    if (name.length < 2) {
      showErr('Please enter a name of at least 2 characters.');
      nameInput.focus();
      return;
    }
    showErr('');
    try { await ctx.actions.signInWithName({ name, avatar: picker.value }); }
    catch (e) { showErr(e.message); }
  };
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitName(); });

  /* ---- passkey ---- */
  const passkeyBlock = () => {
    const pk = caps.passkey;
    if (pk.enrolled && pk.available) {
      const who = back?.name;
      return el('button.auth-btn.auth-passkey', {
        type: 'button',
        on: {
          click: async () => {
            showErr('');
            try { await ctx.actions.signInWithPasskey(); }
            catch (e) { showErr(e.message); }
          },
        },
      }, [
        back
          ? avatarNode(back.avatar, { size: 40, badge: false, className: 'auth-avatar' })
          : el('span.auth-icon', { text: '🔐' }),
        el('span', {}, [
          el('span.auth-label', { text: who ? `Sign in as ${who} with your passkey` : 'Sign in with a passkey' }),
          el('span.auth-sub', { text: 'Fingerprint, face or device PIN — nothing to type' }),
        ]),
      ]);
    }
    if (!pk.available) {
      return el('div.auth-unavailable', {}, [
        el('span.auth-icon', { text: '🔐' }),
        el('span', {}, [
          el('span.auth-label', { text: 'Passkeys unavailable here' }),
          el('span.auth-sub', { text: pk.reason }),
        ]),
      ]);
    }
    return el('button.auth-btn.auth-passkey', {
      type: 'button',
      on: {
        click: async () => {
          showErr('');
          const name = nameInput.value.trim() || p.name || back?.name || 'Trainee';
          try { await ctx.actions.createPasskeyAndSignIn({ name, avatar: picker.value }); }
          catch (e) { showErr(e.message); }
        },
      },
    }, [
      el('span.auth-icon', { text: '🔐' }),
      el('span', {}, [
        el('span.auth-label', { text: 'Set up a passkey' }),
        el('span.auth-sub', {
          text: pk.platform
            ? 'Use your fingerprint, face or device PIN — takes a few seconds'
            : 'Use your phone or a security key — takes a few seconds',
        }),
      ]),
    ]);
  };

  /* ---- social ---- */
  // An unconfigured provider used to be a greyed-out button that did nothing,
  // and the only place to configure it was behind a sign-in. Now it opens
  // its setup form right here on the login screen.
  const setupHost = el('div.provider-setup-host');
  let openId = null;
  const socialButtons = caps.providers.map((prov) => {
    if (!prov.configured) {
      return el('button.auth-btn.auth-social.needs-setup', {
        type: 'button',
        title: prov.setupHint,
        on: {
          click: () => {
            showErr('');
            openId = openId === prov.id ? null : prov.id;
            mount(setupHost, openId ? providerQuickSetup(ctx, prov, () => ctx.go('login')) : null);
          },
        },
      }, [
        el('span.auth-icon', { text: prov.icon }),
        el('span', { style: { flex: '1' } }, [
          el('span.auth-label', { text: prov.label }),
          el('span.auth-sub', { text: prov.reason }),
        ]),
        el('span.auth-setup', { text: 'Set up' }),
      ]);
    }
    return el('button.auth-btn.auth-social', {
      type: 'button',
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

  return el('div.screen', {}, [
    el('div.screen-inner.narrow', {}, [
      el('div.brand', {}, [
        el('h1', { text: 'BEAT THE HAZARD' }),
        el('p', { text: 'Warehouse Forklift & Pedestrian Safety Training' }),
        el('div.flagline', {}, ['🇳🇵', 'Himalaya Logistics · Birgunj Distribution Centre']),
      ]),

      el('div.card.stack', {}, [
        el('div.section-head', {}, [
          el('h2', { text: back ? `Welcome back, ${back.name}` : 'Start training' }),
          el('p', { text: 'Your name and progress are stored on this device only.' }),
        ]),

        caps.totp?.enrolled && el('div.auth-note.small', {
          text: '🔢 This profile is protected by an authenticator app. After you sign in you will be asked for the 6-digit code.',
        }),

        passkeyBlock(),

        caps.providers.length > 0 && el('div.auth-divider', {}, [el('span', { text: 'or continue with' })]),
        ...socialButtons,
        setupHost,

        el('div.auth-divider', {}, [el('span', { text: 'or just use a name' })]),

        el('div', {}, [el('label', { for: 'trainee-name', text: 'Your name' }), nameInput]),
        el('div', {}, [el('label', { text: 'Choose your avatar' }), picker.node]),
        err,
        el('button.btn.btn-primary.btn-lg.btn-block', {
          type: 'button', text: 'Enter the warehouse', on: { click: submitName },
        }),
        el('button.btn.btn-sm.btn-ghost.btn-block', {
          type: 'button',
          text: 'Continue as guest',
          on: {
            click: async () => {
              showErr('');
              try { await ctx.actions.signInWithName({ name: 'Guest', avatar: picker.value }); }
              catch (e) { showErr(e.message); }
            },
          },
        }),
      ]),

      el('p.faint.center.mt', {
        text: 'This is a training simulation. Hazards shown are staged for teaching purposes.',
      }),
    ]),
  ]);
}

/**
 * Inline setup for one provider, opened from its button on the login screen.
 * Only public identifiers are ever asked for. GitHub also needs the URL of a
 * server-side exchange, and the form says so rather than pretending otherwise.
 */
function providerQuickSetup(ctx, prov, onSaved) {
  const stored = getStoredAuthConfig();
  const spec = {
    google: {
      fields: [['googleClientId', 'Google Client ID', 'xxxxxxxx.apps.googleusercontent.com']],
      link: 'https://console.cloud.google.com/apis/credentials',
      steps: 'Google Cloud Console → Credentials → Create OAuth client ID → Web application. Add the origin below under “Authorised JavaScript origins”. No secret is needed.',
    },
    facebook: {
      fields: [['facebookAppId', 'Facebook App ID', '1234567890123456']],
      link: 'https://developers.facebook.com/apps',
      steps: 'Create an app → add “Facebook Login” → add the origin below as a valid domain.',
    },
    github: {
      fields: [
        ['githubClientId', 'GitHub Client ID', 'Iv1.xxxxxxxxxxxx'],
        ['githubTokenEndpoint', 'Token exchange endpoint (your server)', 'https://your-worker.workers.dev/github'],
      ],
      link: 'https://github.com/settings/developers',
      steps: 'GitHub cannot finish sign-in in a browser alone — the exchange needs the client secret. Register an OAuth App, deploy the one-function endpoint in docs/AUTHENTICATION.md, and paste both here.',
    },
  }[prov.id];
  if (!spec) return null;

  const inputs = spec.fields.map(([key, label, ph]) => {
    const input = el('input', {
      type: 'text', value: stored[key] ?? '', placeholder: ph,
      id: `qs-${key}`, autocomplete: 'off', spellcheck: false,
    });
    return { key, input, node: el('div', {}, [el('label', { for: `qs-${key}`, text: label }), input]) };
  });

  const title = prov.label.replace('Continue with ', '');
  return el('div.card.provider-quick', {}, [
    el('div.row.between', {}, [
      el('strong', { text: `Set up ${title}` }),
      el('a', { href: spec.link, target: '_blank', rel: 'noopener noreferrer', text: 'Open console ↗' }),
    ]),
    el('p.set-desc', { text: spec.steps }),
    el('div.auth-note.small', {}, [
      'Origin to register: ',
      el('code', { text: window.location.origin, style: { userSelect: 'all' } }),
    ]),
    ...inputs.map((i) => i.node),
    el('div.row', {}, [
      el('button.btn.btn-primary.btn-sm', {
        type: 'button',
        text: 'Save & enable',
        on: {
          click: async () => {
            const patch = {};
            for (const i of inputs) patch[i.key] = i.input.value;
            setAuthConfig(patch);
            await ctx.actions.refreshAuthCaps();
            ctx.actions.toast(`${title} settings saved`, 'ok');
            onSaved();
          },
        },
      }),
    ]),
  ]);
}

/* ================================================================== *
 * Second factor prompt
 * ================================================================== */

export function totpChallengeScreen(ctx, { onSuccess, onCancel, canUsePasskey = false, pending = null }) {
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
        pending && el('div.row', { style: { justifyContent: 'center' } }, [avatarNode(pending.avatar, { size: 64, badge: false })]),
        el('h2', { text: pending ? `${pending.name}, enter your 6-digit code` : 'Enter your 6-digit code' }),
        el('p.muted', { text: 'Open your authenticator app and type the current code for Beat The Hazard.' }),
        input,
        err,
        el('button.btn.btn-primary.btn-block', { text: 'Verify', on: { click: submit } }),
        canUsePasskey && el('button.btn.btn-block', {
          text: '🔐 Use my passkey instead',
          on: {
            click: async () => {
              try { await ctx.actions.signInWithPasskey(); }
              catch (e) { err.textContent = e.message; err.classList.add('show'); }
            },
          },
        }),
        el('button.btn.btn-ghost.btn-sm', {
          text: pending ? '← Back' : 'Sign out',
          on: { click: () => (onCancel ? onCancel() : ctx.actions.signOut()) },
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

  /* ---- social provider setup ---- */
  rows.push(providerSetupPanel(ctx, caps, rerender));

  return rows;
}

/**
 * Let the user switch on Google / Facebook / GitHub without editing .env or
 * redeploying. A Client ID is a public identifier by design, so it is safe to
 * paste into the app and keep in localStorage; no secret is ever entered here.
 */
function providerSetupPanel(ctx, caps, rerender) {
  const stored = getStoredAuthConfig();

  const field = (key, label, placeholder, help, link) => {
    const input = el('input', {
      type: 'text', value: stored[key] ?? '', placeholder,
      id: `cfg-${key}`, autocomplete: 'off', spellcheck: false,
    });
    const fromBuild = isFromBuild(key);
    return {
      key,
      input,
      node: el('div', { style: { marginTop: '0.9rem' } }, [
        el('label', {
          for: `cfg-${key}`, text: label,
          style: { textTransform: 'none', letterSpacing: 'normal', fontSize: '0.82rem', color: 'var(--text)' },
        }),
        el('div.set-desc', { style: { marginBottom: '0.4rem' } }, [
          help,
          link ? ' ' : '',
          link ? el('a', {
            href: link, target: '_blank', rel: 'noopener noreferrer',
            text: 'Open console ↗',
            style: { color: 'var(--accent)', fontWeight: '700' },
          }) : '',
        ]),
        input,
        fromBuild ? el('div.set-desc', { text: 'Currently supplied by .env at build time.' }) : '',
      ]),
    };
  };

  const fields = [
    field('googleClientId', 'Google Client ID',
      'xxxxxxxx.apps.googleusercontent.com',
      'Credentials → Create OAuth client ID → Web application. Add this site under "Authorised JavaScript origins". No secret needed.',
      'https://console.cloud.google.com/apis/credentials'),
    field('facebookAppId', 'Facebook App ID',
      '1234567890123456',
      'Create an app → add "Facebook Login" → add this site to Valid OAuth Redirect URIs.',
      'https://developers.facebook.com/apps'),
    field('githubClientId', 'GitHub Client ID',
      'Iv1.xxxxxxxxxxxx',
      'Register an OAuth App. On its own this is not enough — GitHub also needs the endpoint below.',
      'https://github.com/settings/developers'),
    field('githubTokenEndpoint', 'GitHub token endpoint (server)',
      'https://your-worker.workers.dev/github',
      'GitHub cannot finish sign-in in a browser: the exchange needs the client secret and its endpoint sends no CORS headers. Deploy the small function in docs/AUTHENTICATION.md and paste its URL here.',
      null),
  ];

  const origin = el('code', {
    text: window.location.origin,
    style: { color: 'var(--accent)', userSelect: 'all', wordBreak: 'break-all' },
  });

  return el('div.card.mt', {}, [
    el('h3', { text: '🌐 Social sign-in' }),
    el('p.set-desc', {
      text: 'Turn on the buttons on the login screen. These are public identifiers, ' +
        'so they are safe to paste here — you are never asked for a secret.',
    }),
    el('div.auth-note.small', {}, [
      'When a provider asks for an authorised origin or redirect URL, use: ', origin,
    ]),
    ...fields.map((f) => f.node),
    el('div.row.mt', {}, [
      el('button.btn.btn-primary', {
        text: 'Save & enable',
        on: {
          click: async () => {
            const patch = {};
            for (const f of fields) patch[f.key] = f.input.value;
            setAuthConfig(patch);
            await ctx.actions.refreshAuthCaps();
            ctx.actions.toast('Sign-in providers updated', 'ok');
            rerender();
          },
        },
      }),
      el('button.btn.btn-ghost', {
        text: 'Clear all',
        on: {
          click: async () => {
            if (!confirm('Remove the saved sign-in provider settings?')) return;
            setAuthConfig({ googleClientId: '', facebookAppId: '', githubClientId: '', githubTokenEndpoint: '' });
            await ctx.actions.refreshAuthCaps();
            rerender();
          },
        },
      }),
    ]),
  ]);
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
