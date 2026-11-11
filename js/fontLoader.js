/**
 * Font loader module.
 */

export async function ensureFonts(families = []) {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.allSettled(families.map(f => document.fonts.load(`48px "${f}"`)));
}
