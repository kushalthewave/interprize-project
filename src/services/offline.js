/**
 * offline.js
 * Two ways to play with no internet, and the state the UI needs to offer them.
 *
 *   1. Download — the whole game as one HTML file (beat-the-hazard.html).
 *      Save it anywhere, double-click it, and it runs with no network at all.
 *      Works in every browser. Passkeys are the one thing that needs a secure
 *      https page, so they are unavailable from a file on disk.
 *
 *   2. Install app — the online version, installed through the browser's own
 *      "Install" prompt. A service worker keeps a copy of every game file, so
 *      after one visit it opens and plays offline, full screen, from the
 *      desktop or home screen, and keeps the same profile as the website.
 *      Chrome, Edge and Android support this directly; Safari via "Add to
 *      Home Screen".
 */

const listeners = new Set();
let deferredPrompt = null;

export const offline = {
  /** Running from the downloaded single file (on disk or served). */
  isFileBuild: false,
  /** Opened from disk, not from a web server. */
  isFromDisk: false,
  /** Running as an installed app. */
  isInstalled: false,
  /** The browser has offered an install prompt we can show. */
  canInstall: false,
  /** Every game file is cached, so this page will open with no internet. */
  cachedForOffline: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  /** Where the downloadable file lives, relative to the game. */
  downloadUrl: './beat-the-hazard.html',
  downloadName: 'beat-the-hazard.html',
};

function emit() {
  for (const fn of listeners) {
    try { fn(offline); } catch { /* a broken listener must not break the rest */ }
  }
}

/** Be told when any of the offline state changes. Returns an unsubscribe. */
export function onOfflineChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Can the "Download" button be offered here? Not from inside the downloaded
 * file (you already have it), and not from the dev server (it does not build
 * the file).
 */
export function canDownload() {
  return !offline.isFileBuild && !offline.isFromDisk && !!import.meta.env?.PROD;
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
  deferredPrompt = null;
  offline.canInstall = false;
  emit();
  return outcome;
}

/**
 * Detect how the game is running, register the service worker where that is
 * allowed, and listen for the browser's install offer.
 */
export function initOffline({ onOnlineChange } = {}) {
  if (typeof window === 'undefined') return offline;

  offline.isFromDisk = location.protocol === 'file:';
  offline.isFileBuild = offline.isFromDisk ||
    document.querySelector('meta[name="bth-build"]')?.getAttribute('content') === 'offline-single-file';
  // Installed means "not an ordinary browser tab": standalone, fullscreen,
  // minimal-ui and window-controls-overlay all count, and so does iOS's flag.
  const inTab = matchMedia?.('(display-mode: browser)').matches;
  offline.isInstalled = inTab === false || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the browser's prompt so the menu can show it when the player asks.
    e.preventDefault();
    deferredPrompt = e;
    offline.canInstall = true;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    offline.isInstalled = true;
    offline.canInstall = false;
    deferredPrompt = null;
    emit();
  });
  window.addEventListener('online', () => { offline.online = true; emit(); onOnlineChange?.(true); });
  window.addEventListener('offline', () => { offline.online = false; emit(); onOnlineChange?.(false); });

  // A service worker needs a secure page served over http(s). The downloaded
  // file does not need one — it already contains everything.
  const swAllowed = 'serviceWorker' in navigator && window.isSecureContext &&
    !offline.isFromDisk && !offline.isFileBuild && !!import.meta.env?.PROD;
  if (swAllowed) {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => {
        const ready = () => { offline.cachedForOffline = true; emit(); };
        if (reg.active) ready();
        navigator.serviceWorker.ready.then(ready).catch(() => {});
      })
      .catch((err) => console.warn('[offline] service worker not registered:', err));
  }

  emit();
  return offline;
}
