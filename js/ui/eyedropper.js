import { rgbToHex } from '../color/colorMath.js';

const templateDataCache = new WeakMap();

/**
 * Full-resolution loupe eyedropper for picking colors directly from the template image.
 * Ignores overlay layers and text, sampling strictly from the source template image.
 */
export function startTemplateEyedropper({ stageEl, viewportEl, templateImg, onPick, onCancel }) {
  if (!templateImg || !viewportEl) {
    if (onCancel) onCancel();
    return () => {};
  }

  const natW = templateImg.naturalWidth || 2000;
  const natH = templateImg.naturalHeight || 1414;

  let cached = templateDataCache.get(templateImg);
  if (!cached || cached.width !== natW || cached.height !== natH) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = natW;
    offCanvas.height = natH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(templateImg, 0, 0);
    const data = offCtx.getImageData(0, 0, natW, natH).data;
    cached = { data, width: natW, height: natH };
    templateDataCache.set(templateImg, cached);
  }
  const imgData = cached.data;

  // 1. Create Top Banner
  const banner = document.createElement('div');
  banner.className = 'eyedropper-banner';
  banner.textContent = 'Click anywhere on your template to pick a color · Esc to cancel';
  const stage = stageEl || viewportEl.parentElement || document.body;
  stage.appendChild(banner);

  // 2. Create Loupe
  const loupe = document.createElement('div');
  loupe.className = 'eyedropper-loupe';
  loupe.style.display = 'none';
  loupe.innerHTML = `
    <div class="loupe-ring">
      <canvas width="11" height="11" class="loupe-canvas"></canvas>
      <div class="loupe-reticle"></div>
    </div>
    <div class="loupe-hex-badge">#FFFFFF</div>
  `;
  document.body.appendChild(loupe);

  const loupeCanvas = loupe.querySelector('.loupe-canvas');
  const loupeCtx = loupeCanvas.getContext('2d');
  const loupeHex = loupe.querySelector('.loupe-hex-badge');

  viewportEl.style.cursor = 'crosshair';

  let currentHex = '#FFFFFF';
  let isStopped = false;
  let touchActive = false;

  function sampleAtClientPos(clientX, clientY) {
    const rect = viewportEl.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      loupe.style.display = 'none';
      return null;
    }

    loupe.style.display = 'flex';

    const fracX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fracY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const tplX = Math.floor(fracX * natW);
    const tplY = Math.floor(fracY * natH);

    // Center pixel color
    const centerIdx = (tplY * natW + tplX) * 4;
    const r = imgData[centerIdx];
    const g = imgData[centerIdx + 1];
    const b = imgData[centerIdx + 2];
    currentHex = rgbToHex(r, g, b);
    loupeHex.textContent = currentHex;

    // Draw 11x11 grid around (tplX, tplY)
    const gridData = loupeCtx.createImageData(11, 11);
    for (let dy = -5; dy <= 5; dy++) {
      const sy = Math.max(0, Math.min(natH - 1, tplY + dy));
      for (let dx = -5; dx <= 5; dx++) {
        const sx = Math.max(0, Math.min(natW - 1, tplX + dx));
        const srcIdx = (sy * natW + sx) * 4;
        const targetIdx = ((dy + 5) * 11 + (dx + 5)) * 4;
        gridData.data[targetIdx] = imgData[srcIdx];
        gridData.data[targetIdx + 1] = imgData[srcIdx + 1];
        gridData.data[targetIdx + 2] = imgData[srcIdx + 2];
        gridData.data[targetIdx + 3] = 255;
      }
    }
    loupeCtx.putImageData(gridData, 0, 0);

    return currentHex;
  }

  function positionLoupe(clientX, clientY, isTouch = false) {
    const loupeW = 112;
    const loupeH = 140;

    let posX = clientX - loupeW / 2;
    let posY = isTouch ? (clientY - 96 - loupeH / 2) : (clientY - loupeH - 12);

    if (posY < 10) {
      posY = clientY + 24;
    }
    posX = Math.max(10, Math.min(window.innerWidth - loupeW - 10, posX));

    loupe.style.left = `${posX}px`;
    loupe.style.top = `${posY}px`;
  }

  function handlePointerMove(e) {
    if (isStopped) return;
    const isTouch = e.pointerType === 'touch' || touchActive;
    sampleAtClientPos(e.clientX, e.clientY);
    positionLoupe(e.clientX, e.clientY, isTouch);
  }

  function handlePointerDown(e) {
    if (isStopped) return;
    const isTouch = e.pointerType === 'touch';
    if (isTouch) {
      touchActive = true;
      sampleAtClientPos(e.clientX, e.clientY);
      positionLoupe(e.clientX, e.clientY, true);
      return;
    }

    // Mouse click
    const rect = viewportEl.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      stop();
      if (onCancel) onCancel();
      return;
    }
    const hex = sampleAtClientPos(e.clientX, e.clientY);
    if (hex) {
      stop();
      if (onPick) onPick(hex);
    }
  }

  function handlePointerUp(e) {
    if (isStopped) return;
    if (e.pointerType === 'touch' || touchActive) {
      touchActive = false;
      const rect = viewportEl.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        stop();
        if (onCancel) onCancel();
        return;
      }
      const hex = sampleAtClientPos(e.clientX, e.clientY);
      if (hex) {
        stop();
        if (onPick) onPick(hex);
      } else {
        stop();
        if (onCancel) onCancel();
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      stop();
      if (onCancel) onCancel();
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    stop();
    if (onCancel) onCancel();
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('contextmenu', handleContextMenu);

  function stop() {
    if (isStopped) return;
    isStopped = true;
    viewportEl.style.cursor = '';
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('contextmenu', handleContextMenu);
    if (banner.parentNode) banner.parentNode.removeChild(banner);
    if (loupe.parentNode) loupe.parentNode.removeChild(loupe);
  }

  return stop;
}
