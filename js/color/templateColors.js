import { rgbToHex, hexToRgb, relativeLuminance, contrastRatio } from './colorMath.js';

/**
 * 18 curated default certificate colors in 3 groups of 6.
 */
export const DEFAULT_COLORS = [
  // Neutrals:
  '#000000', '#1F2A1B', '#545454', '#A6A6A6', '#D9D9D9', '#FFFFFF',
  // Certificate inks:
  '#0B1F4B', '#1E3A6B', '#2E5C24', '#3A8531', '#6B2737', '#8B1E1E',
  // Metallic & warm:
  '#B8860B', '#D4AF37', '#C8A24A', '#9B783E', '#6F4E37', '#E8DCC0'
];

export const DEFAULT_SWATCHES = DEFAULT_COLORS.map(hex => ({ hex, label: hex }));

/**
 * Samples an average RGB color within box { x, y, width, height } from imageData.
 * Uses a 24×24 grid of sample points.
 */
export function sampleAverageColor(imageData, box) {
  if (!imageData || !imageData.data || !box || box.width <= 0 || box.height <= 0) {
    return '#FFFFFF';
  }

  const { width: imgW, height: imgH, data } = imageData;
  const gridX = 24;
  const gridY = 24;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let gy = 0; gy < gridY; gy++) {
    const yRatio = (gy + 0.5) / gridY;
    const py = Math.max(0, Math.min(imgH - 1, Math.floor(box.y + yRatio * box.height)));

    for (let gx = 0; gx < gridX; gx++) {
      const xRatio = (gx + 0.5) / gridX;
      const px = Math.max(0, Math.min(imgW - 1, Math.floor(box.x + xRatio * box.width)));

      const idx = (py * imgW + px) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return '#FFFFFF';
  return rgbToHex(totalR / count, totalG / count, totalB / count);
}

function getRgbDistance(r1, g1, b1, r2, g2, b2) {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/**
 * Extracts contrast-aware, de-duplicated colors from a certificate template image.
 * Returns up to maxColors (default 6) hex strings.
 */
export function extractTemplateColors(imgElement, maxColors = 6) {
  if (!imgElement || typeof document === 'undefined') {
    return ['#2E5C24', '#9B783E', '#1E3A5F', '#5C1D24', '#1F2A1B', '#D4AF37'].slice(0, maxColors);
  }

  try {
    const canvas = document.createElement('canvas');
    const width = 140;
    const natW = imgElement.naturalWidth || 2000;
    const natH = imgElement.naturalHeight || 1414;
    const height = Math.max(20, Math.round(width / (natW / natH)));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height).data;

    const bgBuckets = {};
    const candidateBuckets = {};

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = imgData[i + 3];
        if (a < 128) continue;

        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];

        // Quantize to 24-step buckets
        const qr = Math.round(r / 24) * 24;
        const qg = Math.round(g / 24) * 24;
        const qb = Math.round(b / 24) * 24;
        const key = `${qr},${qg},${qb}`;

        const inCenter = (x > width * 0.2 && x < width * 0.8 && y > height * 0.25 && y < height * 0.75);
        bgBuckets[key] = (bgBuckets[key] || 0) + (inCenter ? 2 : 1);

        if (!candidateBuckets[key]) {
          candidateBuckets[key] = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
        }
        candidateBuckets[key].rSum += r;
        candidateBuckets[key].gSum += g;
        candidateBuckets[key].bSum += b;
        candidateBuckets[key].count++;
      }
    }

    let maxBgCount = 0;
    let bgKey = '255,255,255';
    for (const [key, count] of Object.entries(bgBuckets)) {
      if (count > maxBgCount) {
        maxBgCount = count;
        bgKey = key;
      }
    }

    const [bgr, bgg, bgb] = bgKey.split(',').map(Number);
    const bgHex = rgbToHex(bgr, bgg, bgb);
    const bgLum = relativeLuminance(bgHex);
    const isDarkBg = bgLum < 0.25;

    const scoredCandidates = [];

    for (const data of Object.values(candidateBuckets)) {
      if (data.count < 3) continue;

      const r = Math.round(data.rSum / data.count);
      const g = Math.round(data.gSum / data.count);
      const b = Math.round(data.bSum / data.count);
      const hex = rgbToHex(r, g, b);

      const contrast = contrastRatio(hex, bgHex);
      if (contrast < 2.5) continue;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = (maxC - minC) / 255;

      let accentBoost = 1.0;
      if (isDarkBg) {
        if (r > 160 && g > 120 && b < 130) {
          accentBoost = 2.4;
        } else if (chroma > 0.25) {
          accentBoost = 1.8;
        }
      } else {
        if (chroma > 0.2) {
          accentBoost = 1.6;
        }
      }

      const score = Math.pow(contrast, 1.4) * (1 + 2.5 * chroma) * accentBoost * Math.log10(data.count + 2);
      scoredCandidates.push({ r, g, b, contrast, chroma, score, hex });
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    const selected = [];
    for (const cand of scoredCandidates) {
      const isTooClose = selected.some(s => getRgbDistance(cand.r, cand.g, cand.b, s.r, s.g, s.b) < 45);
      if (!isTooClose) {
        selected.push(cand);
      }
      if (selected.length >= maxColors) break;
    }

    // Ensure at least one light and one dark color if candidates have them
    const hasLight = selected.some(s => relativeLuminance(s.hex) > 0.4);
    const hasDark = selected.some(s => relativeLuminance(s.hex) < 0.25);

    if (!hasLight && selected.length < maxColors) {
      const lightCand = scoredCandidates.find(c => relativeLuminance(c.hex) > 0.4 && !selected.some(s => getRgbDistance(c.r, c.g, c.b, s.r, s.g, s.b) < 35));
      if (lightCand) selected.push(lightCand);
    }

    if (!hasDark && selected.length < maxColors) {
      const darkCand = scoredCandidates.find(c => relativeLuminance(c.hex) < 0.25 && !selected.some(s => getRgbDistance(c.r, c.g, c.b, s.r, s.g, s.b) < 35));
      if (darkCand) selected.push(darkCand);
    }

    // Fallbacks if fewer than maxColors found
    if (selected.length < maxColors) {
      const fallbacks = isDarkBg
        ? ['#E5C07B', '#F7F0E3', '#D4AF37', '#DCEAD6', '#C99700', '#FFFFFF']
        : ['#1F2A1B', '#2E5C24', '#9B783E', '#1E3A5F', '#682D36', '#0B1F4B'];

      for (const fbHex of fallbacks) {
        const { r: fbr, g: fbg, b: fbb } = hexToRgb(fbHex);
        const isTooClose = selected.some(s => getRgbDistance(fbr, fbg, fbb, s.r, s.g, s.b) < 45);
        if (!isTooClose) {
          selected.push({ hex: fbHex, r: fbr, g: fbg, b: fbb });
        }
        if (selected.length >= maxColors) break;
      }
    }

    return selected.slice(0, maxColors).map(s => s.hex);
  } catch (err) {
    console.warn('Could not extract colors from template:', err);
    return ['#2E5C24', '#9B783E', '#1E3A5F', '#5C1D24', '#1F2A1B', '#D4AF37'].slice(0, maxColors);
  }
}
