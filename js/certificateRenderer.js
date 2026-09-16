/**
 * Certificate Renderer Module
 * Handles drawing templates and auto-fitted text onto HTML5 Canvas elements
 * at either preview resolution or full native export resolution.
 */

import { calculateAutoFitText } from './autoFitText.js';

/**
 * Draws a certificate for a recipient onto a provided Canvas 2D context.
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {HTMLImageElement|ImageBitmap} templateImg 
 * @param {object} textField - Config { xPct, yPct, wPct, hPct, font, color, align, autoFit, minFontSizePx, maxFontSizePx }
 * @param {string} name - Recipient name
 * @param {number} targetWidth - Canvas width in pixels
 * @param {number} targetHeight - Canvas height in pixels
 * @param {number} [nativeHeight] - Original template height for scaling font bounds
 */
export function renderCertificate(ctx, templateImg, textField, name, targetWidth, targetHeight, nativeHeight = null) {
  // Clear and render template image
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(templateImg, 0, 0, targetWidth, targetHeight);

  if (!name || !name.trim()) return;

  // Calculate box dimensions at the current target resolution
  const boxX = (textField.xPct / 100) * targetWidth;
  const boxY = (textField.yPct / 100) * targetHeight;
  const boxW = (textField.wPct / 100) * targetWidth;
  const boxH = (textField.hPct / 100) * targetHeight;

  // Resolution scale factor relative to native template
  const scale = nativeHeight ? (targetHeight / nativeHeight) : 1;
  const minFont = Math.max(8, Math.round((textField.minFontSizePx || 12) * scale));

  // Compute native box height and default max font (80% of box height)
  const boxNativeH = nativeHeight ? ((textField.hPct / 100) * nativeHeight) : boxH;
  const defaultMaxPx = Math.round(boxNativeH * 0.8);
  const userMaxPx = textField.maxFontSizePx || defaultMaxPx;
  const maxFont = Math.max(minFont, Math.round(userMaxPx * scale));

  // Calculate fitted font size and lines
  const fit = calculateAutoFitText(ctx, name, boxW, boxH, textField.font, {
    autoFit: textField.autoFit !== false,
    minFontSizePx: minFont,
    maxFontSizePx: maxFont
  });

  // Typography settings
  ctx.save();
  ctx.font = `${fit.fontSize}px "${textField.font}", serif, cursive, sans-serif`;
  ctx.fillStyle = textField.color || '#1F2A1B';
  ctx.textBaseline = 'middle';

  // Horizontal position based on alignment
  let textX;
  const hPadding = boxW * 0.03;
  if (textField.align === 'left') {
    ctx.textAlign = 'left';
    textX = boxX + hPadding;
  } else if (textField.align === 'right') {
    ctx.textAlign = 'right';
    textX = boxX + boxW - hPadding;
  } else {
    ctx.textAlign = 'center';
    textX = boxX + boxW / 2;
  }

  // Draw lines vertically centered in the bounding box
  if (fit.lines.length === 1) {
    const textY = boxY + boxH / 2;
    ctx.fillText(fit.lines[0], textX, textY);
  } else if (fit.lines.length > 1) {
    const totalH = fit.lines.length * fit.lineHeight;
    const startY = boxY + (boxH - totalH) / 2 + (fit.lineHeight / 2);
    fit.lines.forEach((line, index) => {
      ctx.fillText(line, textX, startY + index * fit.lineHeight);
    });
  }

  ctx.restore();
}

/**
 * Creates a standalone preview canvas element for thumbnail display.
 * 
 * @param {HTMLImageElement} templateImg 
 * @param {object} textField 
 * @param {string} name 
 * @param {number} [maxPreviewWidth=420] 
 * @returns {HTMLCanvasElement}
 */
export function createPreviewCanvas(templateImg, textField, name, maxPreviewWidth = 420) {
  const canvas = document.createElement('canvas');
  const aspect = templateImg.naturalWidth / templateImg.naturalHeight;
  const width = Math.min(maxPreviewWidth, templateImg.naturalWidth);
  const height = Math.round(width / aspect);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  renderCertificate(ctx, templateImg, textField, name, width, height, templateImg.naturalHeight);
  return canvas;
}
