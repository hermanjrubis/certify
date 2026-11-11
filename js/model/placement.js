/**
 * Placement and viewport math for certificate layers and stage contain-fit.
 */

/**
 * Computes the largest CSS dimensions {cssW, cssH} that fit within stageW × stageH,
 * preserving the aspect ratio tplW / tplH, without upscaling past the template's native dimensions.
 */
export function computeFit(stageW, stageH, tplW, tplH) {
  if (!tplW || !tplH || stageW <= 0 || stageH <= 0) {
    return { cssW: 0, cssH: 0 };
  }

  const maxW = Math.min(stageW, tplW);
  const maxH = Math.min(stageH, tplH);
  const aspect = tplW / tplH;

  // Try fitting to max width first
  let cssW = maxW;
  let cssH = Math.round(cssW / aspect);

  // If height overflows max height, fit to max height instead
  if (cssH > maxH) {
    cssH = maxH;
    cssW = Math.round(cssH * aspect);
  }

  return { cssW, cssH };
}

/**
 * Finds the first free slot from preferred positions whose bounding box overlaps
 * every existing layer by less than 15% of the new box's area.
 * Cascades by +3% x/y if all preferred spots are occupied.
 */
export function findFreeSlot(layers = [], size = { wPct: 50, hPct: 7 }, preferred = []) {
  if (!preferred || preferred.length === 0) {
    return { xPct: 20, yPct: 50 };
  }

  const slotArea = size.wPct * size.hPct;

  function isSpotFree(x, y) {
    const sX1 = x;
    const sX2 = x + size.wPct;
    const sY1 = y;
    const sY2 = y + size.hPct;

    for (const layer of layers) {
      const lX1 = layer.xPct;
      const lX2 = layer.xPct + layer.wPct;
      const lY1 = layer.yPct;
      const lY2 = layer.yPct + layer.hPct;

      const overlapW = Math.max(0, Math.min(sX2, lX2) - Math.max(sX1, lX1));
      const overlapH = Math.max(0, Math.min(sY2, lY2) - Math.max(sY1, lY1));
      const overlapArea = overlapW * overlapH;

      if (slotArea > 0 && (overlapArea / slotArea) >= 0.15) {
        return false;
      }
    }
    return true;
  }

  // 1. Try preferred spots in order
  for (const spot of preferred) {
    if (isSpotFree(spot.xPct, spot.yPct)) {
      return { xPct: spot.xPct, yPct: spot.yPct };
    }
  }

  // 2. Cascade from first preferred spot by +3% x/y until free or leaving template
  let curX = preferred[0].xPct;
  let curY = preferred[0].yPct;

  while (curX + size.wPct <= 100 && curY + size.hPct <= 100) {
    curX += 3;
    curY += 3;
    if (curX + size.wPct <= 100 && curY + size.hPct <= 100 && isSpotFree(curX, curY)) {
      return { xPct: curX, yPct: curY };
    }
  }

  // Fallback to first preferred spot
  return { xPct: preferred[0].xPct, yPct: preferred[0].yPct };
}
