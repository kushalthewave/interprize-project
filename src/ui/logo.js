/**
 * logo.js
 * The Beat The Hazard badge by The Code Crafters.
 *
 * Imported as an asset so Vite fingerprints it for the web build and inlines
 * it into the single offline file.
 */
import logoUrl from '../assets/logo.webp';

export { logoUrl };

/**
 * @param {{size?:number, className?:string}} [o]  size in CSS pixels
 */
export function logo({ size = 120, className = '' } = {}) {
  const img = document.createElement('img');
  img.src = logoUrl;
  img.alt = 'Beat The Hazard — The Code Crafters';
  img.width = size;
  img.height = size;
  img.decoding = 'async';
  img.draggable = false;
  img.className = `logo${className ? ` ${className}` : ''}`;
  return img;
}
