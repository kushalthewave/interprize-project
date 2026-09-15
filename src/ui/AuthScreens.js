/**
 * AuthScreens.js
 * Getting into the game: create an account, log in, the second-factor
 * prompt, and the security panel in Settings.
 *
 * The first-run path is deliberately short and in one direction:
 *
 *   Welcome → Create an account (name + email) → Account created
 *           → Choose your avatar → straight into the warehouse
 *
 * There is no guest route. Every method is labelled with what it actually
 * protects: with no server, an account lives on this device, and the screens
 * say so rather than implying more.
 */
import { el, mount } from './dom.js';
import { qrToCanvas } from '../services/auth/qr.js';
import { formatSecret } from '../services/auth/base32.js';
import { totp, secondsRemaining } from '../services/auth/totp.js';
import { NAME_MAX, EMAIL_MAX } from '../services/auth/validate.js';
import { icon } from './icons.js';
import { logo } from './logo.js';

import { AVATARS, AVATAR_ORDER, avatarNode, normaliseAvatar } from './avatars.js';

/**
 * The avatar picker, shared by the first-run and profile screens. A large
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
 * Shared pieces
 * ================================================================== */

/** Brand column beside the form, like a classic log-in page. */
function authShell(card) {
  return el('div.screen.auth-screen', {}, [
    el('div.auth-layout', {}, [
      el('div.auth-brand', {}, [
        logo({ size: 200, className: 'auth-logo' }),
        el('h1', { text: 'Beat The Hazard' }),
        el('p', { text: 'Warehouse forklift and pedestrian safety training. Spot the hazards before they become accidents.' }),
        el('div.team-line', { text: 'The Code Crafters · Built by Kushal Neupane' }),
      ]),
      el('div.auth-main', {}, [
        card,
        el('p.auth-foot', { text: 'Your account and progress are saved on this device.' }),
      ]),
    ]),
  ]);
}

/** A labelled input with its own error line, wired for screen readers. */
function field({ id, label, type = 'text', maxLength, autocomplete, placeholder = '', value = '', inputMode, autocapitalize }) {
  const input = el('input', {
    id, type, maxLength, autocomplete, placeholder, value,
    inputMode, autocapitalize,
    spellcheck: false,
    'aria-describedby': `${id}-err`,
  });
  input.spellcheck = false;
  const err = el('div.field-error', { id: `${id}-err`, role: 'alert' });
  const setError = (msg) => {
    err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.classList.toggle('invalid', !!msg);
  };
  input.addEventListener('input', () => setError(''));
  return { input, setError, node: el('div.field', {}, [el('label', { for: id, text: label }), input, err]) };
}

function formError() {
  const node = el('div.auth-error', { role: 'alert' });
  return {
    node,
    show(msg) { node.textContent = msg || ''; node.classList.toggle('show', !!msg); },
  };
}

/** Run an async handler once at a time, with the button showing it is busy. */
function guarded(button, fn) {
  return async (e) => {
    e?.preventDefault?.();
    if (button.disabled) return;
    button.disabled = true;
    try { await fn(); } finally { if (button.isConnected && !button.dataset.locked) button.disabled = false; }
  };
}

/* ================================================================== *
 * Welcome
 * ================================================================== */

export function welcomeScreen(ctx, caps = {}) {
  const acct = caps.account;
  return authShell(el('div.card.auth-card.stack', {}, [
    el('div.section-head', {}, [
      el('h2', { text: acct ? `Welcome back, ${acct.name}` : 'Welcome' }),
      el('p', { text: acct ? 'Log in to carry on where you left off.' : 'Create an account to start training.' }),
    ]),
    el('button.btn.btn-primary.btn-lg.btn-block', {
      type: 'button', text: 'Create an account',
      on: { click: () => ctx.go('signup') },
    }),
    el('div.auth-divider', {}, [el('span', { text: 'Already have an account?' })]),
    el('button.btn.btn-secondary.btn-lg.btn-block', {
      type: 'button', text: 'Log in',
      on: { click: () => ctx.go('login') },
    }),
  ]));
}

/* ================================================================== *
 * Create an account
 * ================================================================== */

/**
 * @param {object} ctx
 * @param {{completing?:boolean}} params  completing: a signed-in trainee from
 *   before accounts had an email, adding one. Nothing is deleted.
 */
export function signupScreen(ctx, { completing = false } = {}) {
  const p = ctx.profile;
  const name = field({
    id: 'su-name', label: 'Full name', maxLength: NAME_MAX, autocomplete: 'name',
    placeholder: 'e.g. Sunita Shrestha', value: completing ? p.name : '', autocapitalize: 'words',
  });
  const email = field({
    id: 'su-email', label: 'Email address', type: 'email', maxLength: EMAIL_MAX, autocomplete: 'email',
    placeholder: 'name@example.com', inputMode: 'email', autocapitalize: 'off',
  });
  const error = formError();
  const conflictHost = el('div.conflict-host');
  const submit = el('button.btn.btn-primary.btn-lg.btn-block', { type: 'submit', text: completing ? 'Save and continue' : 'Create account' });

  const create = async (plan, replace) => {
    try {
      await ctx.actions.createAccount(plan, { replace });
    } catch (e) {
      error.show(e.message);
    }
  };

  const onSubmit = guarded(submit, async () => {
    error.show('');
    mount(conflictHost);
    const plan = ctx.auth.planAccount({ name: name.input.value, email: email.input.value });
    if (!plan.ok) {
      (plan.field === 'name' ? name : email).setError(plan.error);
      (plan.field === 'name' ? name : email).input.focus();
      return;
    }
    // Show the cleaned-up values, so what is saved is what they see.
    name.input.value = plan.name;
    email.input.value = plan.email;

    if (plan.conflict === 'same-email') {
      mount(conflictHost, el('div.auth-note.stack', {}, [
        el('div', { text: 'An account with this email is already saved on this device.' }),
        el('button.btn.btn-secondary.btn-block', { type: 'button', text: 'Log in instead', on: { click: () => ctx.go('login', { email: plan.email }) } }),
      ]));
      return;
    }
    if (plan.conflict === 'replace') {
      mount(conflictHost, el('div.auth-warning.stack', { role: 'alert' }, [
        el('strong', { text: 'This device already has an account.' }),
        el('div', {
          text: `Creating a new account deletes ${plan.existing ? `the account for ${plan.existing}` : 'the saved account'}` +
            ' — its scores, achievements, passkeys and two-factor settings. This cannot be undone.',
        }),
        el('button.btn.btn-danger.btn-block', {
          type: 'button', text: 'Delete it and create my account',
          on: { click: (e) => { e.currentTarget.disabled = true; create(plan, true); } },
        }),
        el('button.btn.btn-ghost.btn-block', { type: 'button', text: 'Cancel', on: { click: () => mount(conflictHost) } }),
      ]));
      return;
    }
    await create(plan, false);
  });

  const form = el('form.stack', { noValidate: true, on: { submit: onSubmit } }, [
    name.node,
    email.node,
    error.node,
    conflictHost,
    submit,
  ]);

  return authShell(el('div.card.auth-card.stack', {}, [
    el('div.section-head', {}, [
      el('h2', { text: completing ? 'Finish your account' : 'Create an account' }),
      el('p', {
        text: completing
          ? 'Accounts now have an email address. Add yours to keep your progress.'
          : 'It only takes a moment.',
      }),
    ]),
    form,
    completing
      ? el('button.btn.btn-ghost.btn-block', { type: 'button', text: 'Sign out', on: { click: () => ctx.actions.signOut() } })
      : el('p.auth-switch', {}, [
          'Already have an account? ',
          el('button.link', { type: 'button', text: 'Log in', on: { click: () => ctx.go('login') } }),
        ]),
  ]));
}

/* ================================================================== *
 * Account created
 * ================================================================== */

export function signupDoneScreen(ctx, { name = '' } = {}) {
  return authShell(el('div.card.auth-card.stack.center', {}, [
    el('div.success-mark', {}, [icon('check', { size: 56 })]),
    el('h2', { text: 'Account created successfully' }),
    el('p.muted', { text: `Welcome to Beat The Hazard, ${name || ctx.profile.name}.` }),
    el('button.btn.btn-primary.btn-lg.btn-block', {
      type: 'button', text: 'Choose your avatar',
      on: { click: () => ctx.go('avatar-select') },
    }),
  ]));
}

/* ================================================================== *
 * Choose your avatar (first run)
 * ================================================================== */

export function avatarSelectScreen(ctx) {
  const picker = avatarPicker(ctx.profile.avatar);
  const start = el('button.btn.btn-primary.btn-lg.btn-block', { type: 'button', 'data-autofocus': '' }, [icon('play', { size: 18 }), 'Start playing']);
  start.addEventListener('click', guarded(start, async () => {
    ctx.profile.setAvatar(picker.value);
    await ctx.actions.startFirstRound();
  }));

  return el('div.screen', {}, [
    el('div.screen-inner.narrow-md', {}, [
      el('div.card.stack', {}, [
        el('div.section-head', {}, [
          el('h2', { text: 'Choose your avatar' }),
          el('p', { text: 'This is you in the warehouse. You can change it later in your profile.' }),
        ]),
        picker.node,
        start,
        el('button.btn.btn-ghost.btn-block', {
          type: 'button', text: 'Go to the main menu instead',
          on: { click: () => { ctx.profile.setAvatar(picker.value); ctx.go('menu'); } },
        }),
      ]),
    ]),
  ]);
}

/* ================================================================== *
 * Log in
 * ================================================================== */

/**
 * @param {object} ctx
 * @param {object} caps   AuthManager.capabilities()
 * @param {{email?:string}} [params]
 */
export function loginScreen(ctx, caps = {}, { email: prefill = '' } = {}) {
  const acct = caps.account;
  const email = field({
    id: 'li-email', label: 'Email address', type: 'email', maxLength: EMAIL_MAX, autocomplete: 'email',
    placeholder: 'name@example.com', inputMode: 'email', autocapitalize: 'off', value: prefill,
  });
  const error = formError();
  const submit = el('button.btn.btn-primary.btn-lg.btn-block', { type: 'submit', text: 'Log in' });

  // A locked form stays locked across reloads; re-enable it when the wait ends.
  let timer = null;
  const refreshLock = () => {
    const msg = ctx.auth.loginLock();
    submit.disabled = !!msg;
    if (msg) submit.dataset.locked = '1'; else delete submit.dataset.locked;
    email.input.disabled = !!msg;
    if (msg) {
      error.show(msg);
      clearTimeout(timer);
      timer = setTimeout(() => { if (submit.isConnected) refreshLock(); }, 1000);
    } else if (error.node.textContent.startsWith('Too many')) {
      error.show('');
    }
  };

  const onSubmit = guarded(submit, async () => {
    error.show('');
    try {
      await ctx.actions.logIn(email.input.value);
    } catch (e) {
      error.show(e.message);
      refreshLock();
      if (!email.input.disabled) email.input.focus();
    }
  });

  const passkey = caps.passkey?.enrolled && caps.passkey?.available
    ? el('button.btn.btn-secondary.btn-block', {
        type: 'button',
        on: {
          click: async () => {
            error.show('');
            try { await ctx.actions.signInWithPasskey(); } catch (e) { error.show(e.message); }
          },
        },
      }, [icon('key', { size: 18 }), 'Log in with a passkey'])
    : null;

  const card = el('div.card.auth-card.stack', {}, [
    el('div.section-head', {}, [
      el('h2', { text: 'Log in' }),
      el('p', { text: acct ? `Welcome back, ${acct.name}.` : 'Enter the email address you signed up with.' }),
    ]),
    acct && el('div.account-chip', {}, [
      avatarNode(acct.avatar, { size: 44, badge: false }),
      el('div', {}, [el('div.who-name', { text: acct.name }), el('div.who-role', { text: 'Saved on this device' })]),
    ]),
    el('form.stack', { noValidate: true, on: { submit: onSubmit } }, [email.node, error.node, submit]),
    passkey && el('div.auth-divider', {}, [el('span', { text: 'or' })]),
    passkey,
    el('p.auth-switch', {}, [
      'New here? ',
      el('button.link', { type: 'button', text: 'Create an account', on: { click: () => ctx.go('signup') } }),
    ]),
    el('button.btn.btn-ghost.btn-block', { type: 'button' }, [icon('back', { size: 16 }), 'Back']),
  ]);
  card.lastChild.addEventListener('click', () => ctx.go('welcome'));
  setTimeout(() => { refreshLock(); if (!email.input.disabled) email.input.focus(); }, 30);
  return authShell(card);
}

/* ================================================================== *
 * Second factor prompt
 * ================================================================== */

export function totpChallengeScreen(ctx, { onSuccess, onCancel, canUsePasskey = false, pending = null }) {
  const err = el('div.auth-error', { role: 'alert' });
  const showErr = (m) => { err.textContent = m || ''; err.classList.toggle('show', !!m); };
  const input = el('input', {
    type: 'text', inputMode: 'numeric', autocomplete: 'one-time-code',
    maxLength: 6, placeholder: '000000', id: 'totp-code', class: 'totp-input',
    'aria-label': '6-digit code',
  });
  const verify = el('button.btn.btn-primary.btn-block', { type: 'button', text: 'Verify' });

  let busy = false;
  let timer = null;
  const lockFor = (ms, message) => {
    input.disabled = true;
    verify.disabled = true;
    showErr(message);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!input.isConnected) return;
      input.disabled = false;
      verify.disabled = false;
      showErr('');
      input.focus();
    }, ms + 250);
  };

  const submit = async () => {
    if (busy || input.disabled) return;
    busy = true;
    try {
      const res = await ctx.auth.verifyTotpCode(input.value);
      if (res.ok) { onSuccess(); return; }
      input.value = '';
      if (res.locked) lockFor(res.waitMs, res.message);
      else { showErr(res.message); input.focus(); }
    } finally {
      busy = false;
    }
  };
  verify.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value.length === 6) submit();
  });

  setTimeout(() => {
    const lock = ctx.auth.totpThrottle?.status();
    if (lock?.locked) lockFor(lock.waitMs, 'Too many wrong codes. Wait a moment and try again.');
    else input.focus();
  }, 50);

  return authShell(el('div.card.auth-card.stack.center', {}, [
    el('div.success-mark.info', {}, [icon('shield', { size: 48 })]),
    pending && el('div.row', { style: { justifyContent: 'center' } }, [avatarNode(pending.avatar, { size: 64, badge: false })]),
    el('h2', { text: pending ? `${pending.name}, enter your 6-digit code` : 'Enter your 6-digit code' }),
    el('p.muted', { text: 'Open your authenticator app and type the current code for Beat The Hazard.' }),
    input,
    err,
    verify,
    canUsePasskey && el('button.btn.btn-secondary.btn-block', {
      type: 'button',
      on: {
        click: async () => {
          try { await ctx.actions.signInWithPasskey(); }
          catch (e) { showErr(e.message); }
        },
      },
    }, [icon('key', { size: 18 }), 'Use my passkey instead']),
    el('button.btn.btn-ghost.btn-sm', {
      type: 'button',
      text: pending ? 'Back' : 'Sign out',
      on: { click: () => (onCancel ? onCancel() : ctx.actions.signOut()) },
    }),
  ]));
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
      el('span.cred-icon', {}, [icon('key', { size: 20 })]),
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
    el('h3.with-ic', {}, [icon('key'), 'Passkeys']),
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
        el('h3.with-ic', {}, [icon('shield'), 'Two-factor authentication']),
        el('div.cred-row', {}, [
          el('span.cred-icon.ok', {}, [icon('check', { size: 20 })]),
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
        el('h3.with-ic', {}, [icon('shield'), 'Two-factor authentication']),
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
