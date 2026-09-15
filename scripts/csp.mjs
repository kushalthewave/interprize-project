/**
 * csp.mjs
 * The Content-Security-Policy for the published game, and a Vite plugin that
 * adds it to the built index.html.
 *
 * The game loads nothing from anywhere else: every script, texture, sound and
 * image is part of the build. So the policy can say exactly that — scripts
 * only from this site, no plug-ins, no frames, no forms posting elsewhere —
 * and a script injected into the page some other way will not run.
 *
 * Styles allow 'unsafe-inline' because the interface sets element styles
 * (positions, progress bars) at runtime; styles cannot run code.
 *
 * Dev (`vite`) is left without a policy: the dev server injects its own
 * client and hot-reload socket, which a strict policy would block.
 */
import { createHash } from 'node:crypto';

/** @param {{scriptHashes?: string[]}} [o] extra 'sha256-…' sources for inline scripts */
export function contentSecurityPolicy({ scriptHashes = [] } = {}) {
  const scriptSrc = ["'self'", ...scriptHashes.map((h) => `'${h}'`)].join(' ');
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/** 'sha256-…' for an inline script's exact text. */
export function scriptHash(text) {
  return `sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}`;
}

export const META_REFERRER = '<meta name="referrer" content="no-referrer" />';

export function cspMeta(policy) {
  return `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
}

/** Vite plugin: add the policy to index.html in production builds only. */
export function csp() {
  return {
    name: 'bth-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
          throw new Error('[csp] index.html has an inline script; the policy would block it.');
        }
        return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${cspMeta(contentSecurityPolicy())}\n    ${META_REFERRER}`);
      },
    },
  };
}
