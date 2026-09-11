/**
 * OfflinePanel.js
 * "Play without internet": the Download and Install buttons, and an honest
 * line about what state this copy of the game is in.
 */
import { el } from './dom.js';
import { offline, canDownload, promptInstall } from '../services/offline.js';

/** The file size, fetched once, for the label on the Download button. */
let sizeLabel = null;
function fetchSize(update) {
  if (sizeLabel !== null || !canDownload()) return;
  sizeLabel = '';
  fetch(offline.downloadUrl, { method: 'HEAD' })
    .then((r) => {
      const n = Number(r.headers.get('content-length'));
      if (r.ok && n > 0) { sizeLabel = `${Math.round(n / 1024)} kB`; update(); }
    })
    .catch(() => {});
}

function status() {
  if (offline.isFileBuild) {
    return { icon: '✅', text: 'You are playing the downloaded offline file. No internet needed — your progress is saved in this browser.' };
  }
  if (!offline.online) {
    return { icon: '📴', text: 'You are offline. The game still works — it was saved on this device the last time you visited.' };
  }
  if (offline.isInstalled) {
    return { icon: '✅', text: 'Installed as an app. It opens and plays with no internet.' };
  }
  if (offline.cachedForOffline) {
    return { icon: '✅', text: 'This page is saved on this device, so it will also open without internet.' };
  }
  return null;
}

function downloadButton(update, { big = false } = {}) {
  if (!canDownload()) return null;
  fetchSize(update);
  return el(`a.btn${big ? '.btn-primary' : ''}.offline-dl`, {
    href: offline.downloadUrl,
    download: offline.downloadName,
    title: 'Saves the whole game as one file. Open it any time, with no internet.',
  }, [`⬇ Download game${sizeLabel ? ` (${sizeLabel})` : ''}`]);
}

function installButton(rerender) {
  if (!offline.canInstall || offline.isInstalled || offline.isFileBuild) return null;
  return el('button.btn.offline-install', {
    type: 'button',
    on: {
      click: async () => {
        await promptInstall();
        rerender();
      },
    },
  }, ['📲 Install app']);
}

/** Compact strip for the bottom of the main menu. */
export function offlineStrip(ctx) {
  const holder = el('div.offline-strip');
  const render = () => {
    const st = status();
    holder.replaceChildren(
      el('div.os-text', {}, [
        el('div.os-k', { text: 'Play without internet' }),
        el('div.os-d', {
          text: st?.text ?? 'Download the game as one file, or install it as an app — both work offline.',
        }),
      ]),
      el('div.row', {}, [downloadButton(render), installButton(render)]),
    );
  };
  render();
  ctx.offlineUnsub?.();
  ctx.offlineUnsub = ctx.onOfflineChange?.(render);
  return holder;
}

/** The full explanation, for Settings → Account & data. */
export function offlineCard(ctx) {
  const holder = el('div.card.mt');
  const render = () => {
    const st = status();
    holder.replaceChildren(
      el('h3', { text: '📥 Play without internet' }),
      st && el('div.auth-note', { text: `${st.icon} ${st.text}` }),
      el('div.offline-ways', {}, [
        el('div.ow', {}, [
          el('strong', { text: '1. Download the game' }),
          el('p.set-desc', {
            text: 'The whole game in one HTML file. Save it to a laptop or a USB stick, then double-click it — it runs in any browser with no internet. Progress is kept in that browser. Passkey sign-in needs the online version; name sign-in and everything else work.',
          }),
          canDownload()
            ? downloadButton(render, { big: true })
            : el('span.set-badge', { text: offline.isFileBuild ? 'You already have it' : 'Available on the published site' }),
        ]),
        el('div.ow', {}, [
          el('strong', { text: '2. Install as an app' }),
          el('p.set-desc', {
            text: 'Adds Beat The Hazard to your desktop or home screen. After one visit it opens and plays with no internet, full screen, and keeps the same profile as the website. Chrome, Edge and Android offer this directly; on iPhone and iPad use Share → Add to Home Screen.',
          }),
          installButton(render) ??
            el('span.set-badge', {
              text: offline.isInstalled ? 'Installed' : offline.isFileBuild ? 'Not needed for the file' : 'Use your browser’s Install or Add to Home Screen',
            }),
        ]),
      ]),
    );
  };
  render();
  return holder;
}
