/**
 * Certificate Renderer Module
 * Renders multiple layers (text, image, shape) and template onto Canvas 2D context.
 */

import { calculateAutoFitText } from './autoFitText.js';
import { resolveText } from './model/recipients.js';
import { getFont } from './fonts/catalog.js';

function resolvePlaceholderText(text) {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (_match, key) => {
    const trimmed = key.trim();
    if (/name/i.test(trimmed)) {
      return 'Recipient Name';
    }
    return trimmed;
  });
}

/**
 * Draws a certificate for a row onto the provided Canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} param1 - { templateImg, layers, images }
 * @param {object|null} row - Recipient data object or null
 * @param {object} param3 - { width, height }
 * @returns {Array<{ layerId: string, fontSize: number, maxFont: number, lines: string[], worthALook: boolean }>}
 */
export function renderCertificate(ctx, { templateImg = null, layers = [], images = null }, row = null, { width, height }) {
  ctx.clearRect(0, 0, width, height);

  if (templateImg) {
    ctx.drawImage(templateImg, 0, 0, width, height);
  }

  const reports = [];

  for (const layer of layers) {
    if (!layer) continue;

    const boxX = (layer.xPct / 100) * width;
    const boxY = (layer.yPct / 100) * height;
    const boxW = (layer.wPct / 100) * width;
    const boxH = (layer.hPct / 100) * height;

    if (layer.type === 'text') {
      const resolved = row === null ? resolvePlaceholderText(layer.text) : resolveText(layer.text, row);
      if (!resolved || !resolved.trim()) continue;

      const fontEntry = getFont(layer.font);
      const fontWeight = fontEntry.weight || 400;

      const maxFont = Math.max(10, Math.round((layer.sizePct ?? 0.75) * boxH));
      const minFont = Math.max(8, Math.round(10 * (height / 1000)));

      const fit = calculateAutoFitText(ctx, resolved, boxW, boxH, fontEntry.family, {
        autoFit: layer.autoFit !== false,
        minFontSizePx: minFont,
        maxFontSizePx: maxFont,
        fontWeight
      });

      const worthALook = fit.lines.length > 1 || fit.fontSize < 0.7 * maxFont;
      reports.push({
        layerId: layer.id,
        fontSize: fit.fontSize,
        maxFont,
        lines: fit.lines,
        worthALook
      });

      ctx.save();
      ctx.font = `${fontWeight} ${fit.fontSize}px "${fontEntry.family}", serif`;
      ctx.fillStyle = layer.color || '#1F2A1B';
      ctx.textBaseline = 'middle';

      const hPadding = Math.max(4, boxW * 0.03);
      let textX;
      if (layer.align === 'left') {
        ctx.textAlign = 'left';
        textX = boxX + hPadding;
      } else if (layer.align === 'right') {
        ctx.textAlign = 'right';
        textX = boxX + boxW - hPadding;
      } else {
        ctx.textAlign = 'center';
        textX = boxX + boxW / 2;
      }

      if (fit.lines.length === 1) {
        ctx.fillText(fit.lines[0], textX, boxY + boxH / 2);
      } else if (fit.lines.length > 1) {
        const totalH = fit.lines.length * fit.lineHeight;
        const startY = boxY + (boxH - totalH) / 2 + (fit.lineHeight / 2);
        fit.lines.forEach((line, idx) => {
          ctx.fillText(line, textX, startY + idx * fit.lineHeight);
        });
      }
      ctx.restore();
    } else if (layer.type === 'shape') {
      ctx.save();
      const strokeWidthPx = Math.max(1, ((layer.strokeWidthPct ?? 0.3) / 100) * height);
      ctx.lineWidth = strokeWidthPx;
      ctx.strokeStyle = layer.stroke || '#C8A24A';
      ctx.fillStyle = layer.fill || 'transparent';

      if (layer.shape === 'line') {
        ctx.beginPath();
        const midY = boxY + boxH / 2;
        ctx.moveTo(boxX, midY);
        ctx.lineTo(boxX + boxW, midY);
        ctx.stroke();
      } else if (layer.shape === 'rect') {
        if (layer.fill && layer.fill !== 'transparent') {
          ctx.fillRect(boxX, boxY, boxW, boxH);
        }
        if (layer.stroke && layer.stroke !== 'transparent') {
          ctx.strokeRect(boxX, boxY, boxW, boxH);
        }
      } else if (layer.shape === 'ellipse') {
        ctx.beginPath();
        const rx = Math.max(0, boxW / 2);
        const ry = Math.max(0, boxH / 2);
        ctx.ellipse(boxX + rx, boxY + ry, rx, ry, 0, 0, Math.PI * 2);
        if (layer.fill && layer.fill !== 'transparent') {
          ctx.fill();
        }
        if (layer.stroke && layer.stroke !== 'transparent') {
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (layer.type === 'image') {
      const img = images ? (images.get ? images.get(layer.id) : images[layer.id]) : null;
      if (img) {
        ctx.save();
        ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
        ctx.drawImage(img, boxX, boxY, boxW, boxH);
        ctx.restore();
      }
    }
  }

  return reports;
}

/**
 * Creates a standalone preview canvas element for thumbnail display.
 *
 * @param {object} project
 * @param {Map|object} images
 * @param {object|null} row
 * @param {number} [maxWidth=420]
 * @returns {{ canvas: HTMLCanvasElement|null, report: Array }}
 */
export function createPreviewCanvas(project, images, row, maxWidth = 420) {
  const origW = project?.template?.width || 2000;
  const origH = project?.template?.height || 1414;
  const aspect = origW / origH;
  const width = Math.min(maxWidth, origW);
  const height = Math.round(width / aspect);

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (canvas) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas ? canvas.getContext('2d') : null;
  const templateImg = images ? (images.get ? (images.get('template') || images.get(project?.template?.id)) : (images.template || images[project?.template?.id])) : null;
  const report = ctx ? renderCertificate(ctx, { templateImg, layers: project.layers, images }, row, { width, height }) : [];

  return { canvas, report };
}
