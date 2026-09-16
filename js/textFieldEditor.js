/**
 * Text Field Overlay Editor
 * Implements Pointer Events for dragging and resizing the certificate text box.
 * Coordinates are tracked and stored as percentages of the template dimensions.
 */

export class TextFieldEditor {
  /**
   * @param {HTMLElement} containerEl - The wrapper element containing canvas and overlay
   * @param {object} initialCoords - { xPct, yPct, wPct, hPct }
   * @param {object} initialStyle - { font, autoFit }
   * @param {Function} onChangeCallback 
   */
  constructor(containerEl, initialCoords, initialStyle, onChangeCallback) {
    this.container = containerEl;
    this.coords = {
      xPct: initialCoords.xPct ?? 20,
      yPct: initialCoords.yPct ?? 45,
      wPct: initialCoords.wPct ?? 60,
      hPct: initialCoords.hPct ?? 16
    };
    this.style = {
      font: initialStyle.font || 'Dancing Script',
      autoFit: initialStyle.autoFit !== false
    };
    this.onChange = onChangeCallback;
    this.activeAction = null; // 'drag' or handle name e.g. 'se', 'nw'
    this.startPointer = { x: 0, y: 0 };
    this.startCoords = { ...this.coords };

    this.initDOM();
    this.bindEvents();
    this.updatePosition();
  }

  initDOM() {
    // Remove any existing overlay
    const oldOverlay = this.container.querySelector('.text-box-overlay');
    if (oldOverlay) oldOverlay.remove();

    this.overlay = document.createElement('div');
    this.overlay.className = 'text-box-overlay';
    this.overlay.setAttribute('tabindex', '0');
    this.overlay.setAttribute('role', 'region');
    this.overlay.setAttribute('aria-label', 'Recipient Name Text Box');

    this.overlay.innerHTML = `
      <div class="box-floating-label">
        <span class="label-text">${this.style.font} · ${this.style.autoFit ? 'auto' : 'fixed'}</span>
      </div>
      
      <!-- Resize Handles (4 Corners + 4 Edges) -->
      <div class="resize-handle handle-nw" data-handle="nw"></div>
      <div class="resize-handle handle-n" data-handle="n"></div>
      <div class="resize-handle handle-ne" data-handle="ne"></div>
      <div class="resize-handle handle-e" data-handle="e"></div>
      <div class="resize-handle handle-se" data-handle="se"></div>
      <div class="resize-handle handle-s" data-handle="s"></div>
      <div class="resize-handle handle-sw" data-handle="sw"></div>
      <div class="resize-handle handle-w" data-handle="w"></div>
    `;

    this.container.appendChild(this.overlay);
    this.labelEl = this.overlay.querySelector('.label-text');
  }

  updateLabel(font, autoFit) {
    if (font !== undefined) this.style.font = font;
    if (autoFit !== undefined) this.style.autoFit = autoFit;
    if (this.labelEl) {
      this.labelEl.textContent = `${this.style.font} · ${this.style.autoFit ? 'auto' : 'fixed'}`;
    }
  }

  updatePosition() {
    if (!this.overlay) return;
    this.overlay.style.left = `${this.coords.xPct}%`;
    this.overlay.style.top = `${this.coords.yPct}%`;
    this.overlay.style.width = `${this.coords.wPct}%`;
    this.overlay.style.height = `${this.coords.hPct}%`;
  }

  setCoords(coords) {
    Object.assign(this.coords, coords);
    this.updatePosition();
  }

  getCoords() {
    return { ...this.coords };
  }

  bindEvents() {
    // Pointer down on box or handles
    this.overlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const handle = e.target.closest('.resize-handle');
      if (handle) {
        this.activeAction = handle.dataset.handle;
      } else {
        this.activeAction = 'drag';
      }

      this.startPointer = { x: e.clientX, y: e.clientY };
      this.startCoords = { ...this.coords };
      this.overlay.classList.add('is-interacting');

      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for browsers that do not support pointer capture on certain elements
      }

      const onPointerMove = (moveEvt) => {
        if (!this.activeAction) return;
        this.handlePointerMove(moveEvt);
      };

      const onPointerUp = (upEvt) => {
        if (!this.activeAction) return;
        try {
          e.target.releasePointerCapture(upEvt.pointerId);
        } catch {}
        this.activeAction = null;
        this.overlay.classList.remove('is-interacting');
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        this.notifyChange();
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });

    // Keyboard nudging for accessibility (arrow keys)
    this.overlay.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 2 : 0.5;
      let handled = false;

      if (e.key === 'ArrowLeft') {
        this.coords.xPct = Math.max(0, this.coords.xPct - step);
        handled = true;
      } else if (e.key === 'ArrowRight') {
        this.coords.xPct = Math.min(100 - this.coords.wPct, this.coords.xPct + step);
        handled = true;
      } else if (e.key === 'ArrowUp') {
        this.coords.yPct = Math.max(0, this.coords.yPct - step);
        handled = true;
      } else if (e.key === 'ArrowDown') {
        this.coords.yPct = Math.min(100 - this.coords.hPct, this.coords.yPct + step);
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        this.updatePosition();
        this.notifyChange();
      }
    });
  }

  handlePointerMove(e) {
    const containerRect = this.container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    // Convert pixel deltas to container percentage deltas
    const deltaXPct = ((e.clientX - this.startPointer.x) / containerRect.width) * 100;
    const deltaYPct = ((e.clientY - this.startPointer.y) / containerRect.height) * 100;

    const minW = 6;  // Minimum 6% width
    const minH = 3;  // Minimum 3% height

    if (this.activeAction === 'drag') {
      let newX = this.startCoords.xPct + deltaXPct;
      let newY = this.startCoords.yPct + deltaYPct;

      // Constrain within bounds
      newX = Math.max(0, Math.min(100 - this.coords.wPct, newX));
      newY = Math.max(0, Math.min(100 - this.coords.hPct, newY));

      this.coords.xPct = Number(newX.toFixed(2));
      this.coords.yPct = Number(newY.toFixed(2));
    } else {
      // Handle resizing based on active handle
      const h = this.activeAction;
      let { xPct, yPct, wPct, hPct } = this.startCoords;

      if (h.includes('e')) {
        wPct = Math.max(minW, Math.min(100 - xPct, wPct + deltaXPct));
      }
      if (h.includes('s')) {
        hPct = Math.max(minH, Math.min(100 - yPct, hPct + deltaYPct));
      }
      if (h.includes('w')) {
        const potentialW = wPct - deltaXPct;
        if (potentialW >= minW && xPct + deltaXPct >= 0) {
          xPct += deltaXPct;
          wPct = potentialW;
        }
      }
      if (h.includes('n')) {
        const potentialH = hPct - deltaYPct;
        if (potentialH >= minH && yPct + deltaYPct >= 0) {
          yPct += deltaYPct;
          hPct = potentialH;
        }
      }

      this.coords.xPct = Number(Math.max(0, xPct).toFixed(2));
      this.coords.yPct = Number(Math.max(0, yPct).toFixed(2));
      this.coords.wPct = Number(Math.min(100 - this.coords.xPct, wPct).toFixed(2));
      this.coords.hPct = Number(Math.min(100 - this.coords.yPct, hPct).toFixed(2));
    }

    this.updatePosition();
    this.notifyChange();
  }

  notifyChange() {
    if (typeof this.onChange === 'function') {
      this.onChange({ ...this.coords });
    }
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
