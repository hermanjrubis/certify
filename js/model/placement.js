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
