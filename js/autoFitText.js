/**
 * Auto-fit Text Sizing Engine
 * Fits text within a given bounding box on a 2D canvas context.
 * Implements binary search for font size calculation and 2-line wrap fallback for long names.
 */

/**
 * Calculates the optimal font size and lines for a given name inside a target box.
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text - The recipient name
 * @param {number} boxW - Target box width in canvas pixels
 * @param {number} boxH - Target box height in canvas pixels
 * @param {string} fontFamily - Google font family name
 * @param {object} options
 * @param {boolean} [options.autoFit=true]
 * @param {number} [options.minFontSizePx=14]
 * @param {number} [options.maxFontSizePx]
 * @returns {{ fontSize: number, lines: string[], lineHeight: number }}
 */
export function calculateAutoFitText(ctx, text, boxW, boxH, fontFamily, options = {}) {
  const {
    autoFit = true,
    minFontSizePx = 14,
    maxFontSizePx = null
  } = options;

  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { fontSize: minFontSizePx, lines: [''], lineHeight: minFontSizePx * 1.2 };
  }

  // Calculate maximum font size: user-specified preferred size or 85% of box height
  const defaultMax = Math.max(minFontSizePx, Math.floor(boxH * 0.85));
  const maxFont = maxFontSizePx ? Math.max(minFontSizePx, maxFontSizePx) : defaultMax;
  const minFont = Math.max(10, Math.min(minFontSizePx, maxFont));

  if (!autoFit) {
    return {
      fontSize: maxFont,
      lines: [trimmed],
      lineHeight: maxFont * 1.2
    };
  }

  // Padding inside box (leave 3% margin on left and right)
  const paddingX = Math.max(4, boxW * 0.03);
  const allowedWidth = Math.max(10, boxW - paddingX * 2);
  const allowedHeight = Math.max(10, boxH * 0.90);

  // Helper to test if a single-line string fits at a given font size
  function fitsSingleLine(fontSize, str) {
    ctx.font = `${fontSize}px "${fontFamily}", serif, sans-serif`;
    const metrics = ctx.measureText(str);
    return metrics.width <= allowedWidth && (fontSize * 1.15) <= allowedHeight;
  }

  // 1. Try single-line binary search between minFont and maxFont
  let low = minFont;
  let high = maxFont;
  let bestSingleFontSize = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fitsSingleLine(mid, trimmed)) {
      bestSingleFontSize = mid;
      low = mid + 1; // Try larger
    } else {
      high = mid - 1; // Must be smaller
    }
  }

  // If single line fits comfortably at or above minFont, return it
  if (bestSingleFontSize >= minFont) {
    return {
      fontSize: bestSingleFontSize,
      lines: [trimmed],
      lineHeight: bestSingleFontSize * 1.2
    };
  }

  // 2. If it does not fit on one line at minFont, check if multi-word wrap is possible
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    // Find best split point near the middle of the string
    let bestSplitIndex = 1;
    let minDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const line1 = words.slice(0, i).join(' ');
      const line2 = words.slice(i).join(' ');
      const diff = Math.abs(line1.length - line2.length);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplitIndex = i;
      }
    }

    const line1 = words.slice(0, bestSplitIndex).join(' ');
    const line2 = words.slice(bestSplitIndex).join(' ');

    // Test 2-line fit
    function fitsTwoLines(fontSize) {
      ctx.font = `${fontSize}px "${fontFamily}", serif, sans-serif`;
      const w1 = ctx.measureText(line1).width;
      const w2 = ctx.measureText(line2).width;
      const totalH = fontSize * 1.22 * 2;
      return Math.max(w1, w2) <= allowedWidth && totalH <= allowedHeight;
    }

    let low2 = 10;
    let high2 = Math.max(12, Math.floor(maxFont * 0.75));
    let bestTwoLineSize = -1;

    while (low2 <= high2) {
      const mid = Math.floor((low2 + high2) / 2);
      if (fitsTwoLines(mid)) {
        bestTwoLineSize = mid;
        low2 = mid + 1;
      } else {
        high2 = mid - 1;
      }
    }

    if (bestTwoLineSize >= 10) {
      return {
        fontSize: bestTwoLineSize,
        lines: [line1, line2],
        lineHeight: bestTwoLineSize * 1.22
      };
    }
  }

  // 3. Absolute safety fallback: binary search single line down to 8px so text never clips
  let safeLow = 8;
  let safeHigh = minFont;
  let safeSize = 8;
  while (safeLow <= safeHigh) {
    const mid = Math.floor((safeLow + safeHigh) / 2);
    if (fitsSingleLine(mid, trimmed)) {
      safeSize = mid;
      safeLow = mid + 1;
    } else {
      safeHigh = mid - 1;
    }
  }

  return {
    fontSize: safeSize,
    lines: [trimmed],
    lineHeight: safeSize * 1.2
  };
}
