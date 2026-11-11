import { rgbToHex } from './colorMath.js';

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
