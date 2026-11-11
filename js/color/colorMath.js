/**
 * Pure color math utilities: hex normalization, RGB/HSV conversions,
 * WCAG relative luminance, contrast ratio calculation, and ink picking.
 */

export function normalizeHex(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return '#' + trimmed.split('').map(c => c + c).join('').toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return '#' + trimmed.toUpperCase();
  }
  return null;
}

export function hexToRgb(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return { r: 0, g: 0, b: 0 };
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  return { r, g, b };
}

export function rgbToHex(r, g, b) {
  const clamp = (val) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (val) => clamp(val).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r, g, b) {
  const rNorm = Math.max(0, Math.min(255, r)) / 255;
  const gNorm = Math.max(0, Math.min(255, g)) / 255;
  const bNorm = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  if (d === 0) {
    h = 0;
  } else if (max === rNorm) {
    h = ((gNorm - bNorm) / d) % 6;
  } else if (max === gNorm) {
    h = (bNorm - rNorm) / d + 2;
  } else {
    h = (rNorm - gNorm) / d + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

export function hsvToRgb(h, s, v) {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.max(0, Math.min(1, s));
  const normV = Math.max(0, Math.min(1, v));

  const c = normV * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normV - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (normH < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (normH < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (normH < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (normH < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (normH < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const sRgb = [r, g, b].map(val => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRgb[0] + 0.7152 * sRgb[1] + 0.0722 * sRgb[2];
}

export function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const max = Math.max(lumA, lumB);
  const min = Math.min(lumA, lumB);
  return (max + 0.05) / (min + 0.05);
}

export function pickReadableInk(bgHex, candidates = []) {
  const normBg = normalizeHex(bgHex) || '#FFFFFF';

  for (const candidate of candidates) {
    const normCand = normalizeHex(candidate);
    if (normCand && contrastRatio(normBg, normCand) >= 4.5) {
      return normCand;
    }
  }

  // Fallback: choose between white and dark green/charcoal whichever has higher contrast
  const whiteRatio = contrastRatio(normBg, '#FFFFFF');
  const darkRatio = contrastRatio(normBg, '#1F2A1B');
  return whiteRatio >= darkRatio ? '#FFFFFF' : '#1F2A1B';
}

