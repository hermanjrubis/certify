/**
 * Multi-layer selection, drag, resize, and keyboard navigation overlay.
 */

export class LayerOverlay {
  /**
   * @param {HTMLElement} viewportEl - The canvas container / viewport element
   * @param {object} callbacks - { onSelect(id|null), onChange(id, patch|null, { commit: boolean }) }
   */
  constructor(viewportEl, { onSelect, onChange }) {
    this.viewportEl = viewportEl;
    this.onSelect = onSelect;
    this.onChange = onChange;

    this.layers = [];
    this.selectedId = null;

    this.activeAction = null; // 'drag', 'nw', 'ne', 'se', 'sw'
    this.activeLayerId = null;
    this.startPointer = { x: 0, y: 0 };
    this.startCoords = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.root = document.createElement('div');
    this.root.className = 'layer-overlay-root';
    this.viewportEl.style.position = 'relative';
    this.viewportEl.appendChild(this.root);

    // Make viewport focusable for keyboard navigation if not already
    if (!this.viewportEl.hasAttribute('tabindex')) {
      this.viewportEl.setAttribute('tabindex', '0');
    }
  }

  render(layers = [], selectedId = null) {
    this.layers = layers;
    this.selectedId = selectedId;
    this.root.innerHTML = '';

    for (const layer of layers) {
      const isSelected = layer.id === selectedId;
      const isBoundText = layer.type === 'text' && /\{[^}]+\}/.test(layer.text);

      const box = document.createElement('div');
      box.className = `layer-box ${isSelected ? 'selected' : ''} ${!isSelected && isBoundText ? 'bound-text' : ''}`;
      box.dataset.id = layer.id;
      box.style.left = `${layer.xPct}%`;
      box.style.top = `${layer.yPct}%`;
      box.style.width = `${layer.wPct}%`;
      box.style.height = `${layer.hPct}%`;

      if (isSelected) {
        box.innerHTML = `
          <div class="layer-handle handle-nw" data-handle="nw" aria-label="Resize North-West"></div>
          <div class="layer-handle handle-ne" data-handle="ne" aria-label="Resize North-East"></div>
          <div class="layer-handle handle-se" data-handle="se" aria-label="Resize South-East"></div>
          <div class="layer-handle handle-sw" data-handle="sw" aria-label="Resize South-West"></div>
        `;
      }

      this.root.appendChild(box);
    }
  }

  bindEvents() {
    this.handlePointerDown = (e) => {
      const handle = e.target.closest('.layer-handle');
      const box = e.target.closest('.layer-box');

      if (!box && !handle) {
        // Click on empty canvas
        if (this.onSelect) this.onSelect(null);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const targetBox = box || handle.closest('.layer-box');
      const layerId = targetBox.dataset.id;
      const layer = this.layers.find(l => l.id === layerId);
      if (!layer) return;

      if (this.selectedId !== layerId) {
        if (this.onSelect) this.onSelect(layerId);
      }

      this.activeLayerId = layerId;
      this.activeAction = handle ? handle.dataset.handle : 'drag';
      this.startPointer = { x: e.clientX, y: e.clientY };
      this.startCoords = {
        xPct: layer.xPct,
        yPct: layer.yPct,
        wPct: layer.wPct,
        hPct: layer.hPct,
        type: layer.type,
        keepAspect: layer.keepAspect !== false
      };

      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {}

      const onPointerMove = (moveEvt) => {
        if (!this.activeAction) return;
        this.handlePointerMove(moveEvt);
      };

      const onPointerUp = (upEvt) => {
        if (!this.activeAction) return;
        try {
          e.target.releasePointerCapture(upEvt.pointerId);
        } catch {}

        const finalPatch = this.currentPatch;
        const activeId = this.activeLayerId;

        this.activeAction = null;
        this.activeLayerId = null;
        this.currentPatch = null;

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        if (this.onChange && activeId) {
          this.onChange(activeId, finalPatch || {}, { commit: true });
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    this.root.addEventListener('pointerdown', this.handlePointerDown);

    // Click outside layers inside viewport
    this.handleViewportClick = (e) => {
      if (!e.target.closest('.layer-box')) {
        if (this.onSelect) this.onSelect(null);
      }
    };
    this.viewportEl.addEventListener('click', this.handleViewportClick);

    // Keyboard nudging & deletion
    this.handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      if (!this.selectedId) return;
      const layer = this.layers.find(l => l.id === this.selectedId);
      if (!layer) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (this.onChange) {
          this.onChange(this.selectedId, null, { commit: true });
        }
        return;
      }

      const step = e.shiftKey ? 2 : 0.5;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      const newX = Math.max(0, Math.min(100 - layer.wPct, layer.xPct + dx));
      const newY = Math.max(0, Math.min(100 - layer.hPct, layer.yPct + dy));

      const patch = {
        xPct: Number(newX.toFixed(2)),
        yPct: Number(newY.toFixed(2))
      };

      if (this.onChange) {
        this.onChange(this.selectedId, patch, { commit: true });
      }
    };

    this.viewportEl.addEventListener('keydown', this.handleKeyDown);
  }

  handlePointerMove(e) {
    const rect = this.viewportEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || !this.startCoords) return;

    const deltaXPct = ((e.clientX - this.startPointer.x) / rect.width) * 100;
    const deltaYPct = ((e.clientY - this.startPointer.y) / rect.height) * 100;

    const minW = 2; // Min 2% width
    const minH = 1; // Min 1% height

    let patch = {};

    if (this.activeAction === 'drag') {
      let newX = this.startCoords.xPct + deltaXPct;
      let newY = this.startCoords.yPct + deltaYPct;

      newX = Math.max(0, Math.min(100 - this.startCoords.wPct, newX));
      newY = Math.max(0, Math.min(100 - this.startCoords.hPct, newY));

      patch = {
        xPct: Number(newX.toFixed(2)),
        yPct: Number(newY.toFixed(2))
      };
    } else {
      const handle = this.activeAction;
      let { xPct, yPct, wPct, hPct, type, keepAspect } = this.startCoords;
      const aspect = (wPct / hPct) || 1;

      if (type === 'image' && keepAspect) {
        if (handle === 'se') {
          let candidateW = Math.max(minW, Math.min(100 - xPct, wPct + deltaXPct));
          let candidateH = candidateW / aspect;
          if (yPct + candidateH > 100) {
            candidateH = 100 - yPct;
            candidateW = candidateH * aspect;
          }
          wPct = candidateW;
          hPct = candidateH;
        } else if (handle === 'sw') {
          let candidateW = Math.max(minW, Math.min(xPct + wPct, wPct - deltaXPct));
          let candidateH = candidateW / aspect;
          if (yPct + candidateH > 100) {
            candidateH = 100 - yPct;
            candidateW = candidateH * aspect;
          }
          xPct = (this.startCoords.xPct + this.startCoords.wPct) - candidateW;
          wPct = candidateW;
          hPct = candidateH;
        } else if (handle === 'ne') {
          let candidateW = Math.max(minW, Math.min(100 - xPct, wPct + deltaXPct));
          let candidateH = candidateW / aspect;
          if (this.startCoords.yPct + this.startCoords.hPct - candidateH < 0) {
            candidateH = this.startCoords.yPct + this.startCoords.hPct;
            candidateW = candidateH * aspect;
          }
          yPct = (this.startCoords.yPct + this.startCoords.hPct) - candidateH;
          wPct = candidateW;
          hPct = candidateH;
        } else if (handle === 'nw') {
          let candidateW = Math.max(minW, Math.min(xPct + wPct, wPct - deltaXPct));
          let candidateH = candidateW / aspect;
          if (this.startCoords.yPct + this.startCoords.hPct - candidateH < 0) {
            candidateH = this.startCoords.yPct + this.startCoords.hPct;
            candidateW = candidateH * aspect;
          }
          xPct = (this.startCoords.xPct + this.startCoords.wPct) - candidateW;
          yPct = (this.startCoords.yPct + this.startCoords.hPct) - candidateH;
          wPct = candidateW;
          hPct = candidateH;
        }
      } else {
        if (handle.includes('e')) {
          wPct = Math.max(minW, Math.min(100 - xPct, wPct + deltaXPct));
        }
        if (handle.includes('s')) {
          hPct = Math.max(minH, Math.min(100 - yPct, hPct + deltaYPct));
        }
        if (handle.includes('w')) {
          const potentialW = wPct - deltaXPct;
          if (potentialW >= minW && xPct + deltaXPct >= 0) {
            xPct += deltaXPct;
            wPct = potentialW;
          }
        }
        if (handle.includes('n')) {
          const potentialH = hPct - deltaYPct;
          if (potentialH >= minH && yPct + deltaYPct >= 0) {
            yPct += deltaYPct;
            hPct = potentialH;
          }
        }
      }

      patch = {
        xPct: Number(Math.max(0, xPct).toFixed(2)),
        yPct: Number(Math.max(0, yPct).toFixed(2)),
        wPct: Number(Math.min(100 - Math.max(0, xPct), wPct).toFixed(2)),
        hPct: Number(Math.min(100 - Math.max(0, yPct), hPct).toFixed(2))
      };
    }

    this.currentPatch = patch;

    // Apply directly to DOM for 60fps responsiveness
    const activeBox = this.root.querySelector(`.layer-box[data-id="${this.activeLayerId}"]`);
    if (activeBox) {
      if (patch.xPct !== undefined) activeBox.style.left = `${patch.xPct}%`;
      if (patch.yPct !== undefined) activeBox.style.top = `${patch.yPct}%`;
      if (patch.wPct !== undefined) activeBox.style.width = `${patch.wPct}%`;
      if (patch.hPct !== undefined) activeBox.style.height = `${patch.hPct}%`;
    }

    if (this.onChange && this.activeLayerId) {
      this.onChange(this.activeLayerId, patch, { commit: false });
    }
  }

  destroy() {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    if (this.viewportEl) {
      this.viewportEl.removeEventListener('click', this.handleViewportClick);
      this.viewportEl.removeEventListener('keydown', this.handleKeyDown);
    }
  }
}
