/**
 * Font loader module for on-demand loading of full fonts and subset previews.
 */

import { fontCssUrl, getFont } from './fonts/catalog.js';

const loadedFullFonts = new Set();
const loadedPreviewFonts = new Set();

export async function loadFontFamily(family) {
  if (typeof document === 'undefined') return;
  const font = getFont(family);
  const fam = font.family;

  if (!loadedFullFonts.has(fam)) {
    loadedFullFonts.add(fam);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontCssUrl(fam);
    document.head.appendChild(link);
  }

  if (document.fonts) {
    try {
      await document.fonts.load(`${font.weight} 48px "${fam}"`);
    } catch {
      // Never reject
    }
  }
}

export function loadFontPreview(family, text) {
  if (typeof document === 'undefined') return;
  const font = getFont(family);
  const fam = font.family;

  // Rule: skip it if loadFontFamily(family) already ran, and never add a preview link after the full one
  if (loadedFullFonts.has(fam)) return;
  if (loadedPreviewFonts.has(fam)) return;

  loadedPreviewFonts.add(fam);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontCssUrl(fam, text);
  document.head.appendChild(link);
}

export async function ensureFonts(families = []) {
  await Promise.allSettled(families.map(loadFontFamily));
}
