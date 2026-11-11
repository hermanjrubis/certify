import {
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb
} from '../color/colorMath.js';
import { DEFAULT_COLORS } from '../color/templateColors.js';

let activePicker = null;

export function openColorPicker(anchorEl, {
  value = '#1F2A1B',
  templateColors = [],
  onChange,
  onPickFromTemplate,
  onClose
} = {}) {
  if (activePicker) {
    activePicker.close();
  }

  const initialHex = normalizeHex(value) || '#1F2A1B';
  let currentHex = initialHex;

  const initialRgb = hexToRgb(initialHex);
  let { h, s, v } = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

  let mode = 'square';
  try {
    const saved = localStorage.getItem('certify.colorMode');
    if (saved === 'wheel' || saved === 'square') mode = saved;
  } catch {}

  function getRecentColors() {
    try {
      const raw = localStorage.getItem('certify.recentColors');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(normalizeHex).filter(Boolean).slice(0, 8);
      }
    } catch {}
    return [];
  }

  function addRecentColor(hex) {
    const norm = normalizeHex(hex);
    if (!norm) return;
    try {
      const recent = getRecentColors().filter(c => c !== norm);
      recent.unshift(norm);
      localStorage.setItem('certify.recentColors', JSON.stringify(recent.slice(0, 8)));
    } catch {}
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;
  let backdrop = null;
  if (isMobile) {
    backdrop = document.createElement('div');
    backdrop.className = 'color-picker-backdrop';
    document.body.appendChild(backdrop);
  }

  const popover = document.createElement('div');
  popover.className = `color-picker-popover ${isMobile ? 'mobile-sheet' : ''}`;
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'true');
  popover.setAttribute('aria-label', 'Color Picker');

  popover.innerHTML = `
    <div class="color-picker-header">
      <div class="segmented-control mode-segmented-control">
        <button type="button" class="segment-btn ${mode === 'square' ? 'active' : ''}" data-mode="square">Square</button>
        <button type="button" class="segment-btn ${mode === 'wheel' ? 'active' : ''}" data-mode="wheel">Wheel</button>
      </div>
      <button type="button" class="picker-close-btn" aria-label="Close picker">&times;</button>
    </div>

    <!-- Square Mode -->
    <div class="picker-mode-content picker-square-mode" style="${mode === 'square' ? '' : 'display: none;'}">
      <div class="sat-val-box" tabindex="0" role="slider" aria-label="Saturation and Brightness">
        <div class="sat-val-handle"></div>
      </div>
      <div class="hue-slider-track" tabindex="0" role="slider" aria-label="Hue">
        <div class="hue-slider-handle"></div>
      </div>
    </div>

    <!-- Wheel Mode -->
    <div class="picker-mode-content picker-wheel-mode" style="${mode === 'wheel' ? '' : 'display: none;'}">
      <div class="wheel-circle-box" tabindex="0" role="slider" aria-label="Color Wheel">
        <div class="wheel-handle"></div>
      </div>
      <div class="bright-slider-track" tabindex="0" role="slider" aria-label="Brightness">
        <div class="bright-slider-handle"></div>
      </div>
    </div>

    <!-- Hex and Actions Row -->
    <div class="picker-row hex-actions-row">
      <button type="button" class="btn-picker-tool" id="btn-picker-dropper" title="Pick from template" aria-label="Pick color from template">
        <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m14 2 4 4-8 8H6v-4l8-8z"/>
          <path d="M18 6l2 2"/>
          <path d="M4 20h4"/>
        </svg>
      </button>

      <div class="hex-input-wrap">
        <span class="hex-hash">#</span>
        <input type="text" class="hex-field" value="${currentHex.slice(1)}" maxlength="6" aria-label="Hex color" spellcheck="false" />
      </div>

      <div class="before-after-chip" title="Click left half to revert to original color">
        <button type="button" class="chip-half chip-before" style="background-color: ${initialHex};" aria-label="Revert to ${initialHex}"></button>
        <span class="chip-half chip-after" style="background-color: ${currentHex};"></span>
      </div>
    </div>

    ${typeof window !== 'undefined' && 'EyeDropper' in window ? `
      <div class="screen-dropper-row">
        <button type="button" class="btn-text-link" id="btn-pick-screen">Pick from screen</button>
      </div>
    ` : ''}

    <!-- Template Swatches -->
    ${templateColors.length > 0 ? `
      <div class="picker-section swatches-section">
        <span class="picker-section-label">From your template</span>
        <div class="picker-swatches-grid template-grid">
          ${templateColors.slice(0, 6).map(hex => `
            <button type="button" class="picker-swatch-circle ${currentHex === hex ? 'active' : ''}" data-hex="${hex}" style="background-color: ${hex};" aria-label="${hex}"></button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Recent Swatches -->
    <div class="picker-section swatches-section recent-section" style="${getRecentColors().length > 0 ? '' : 'display: none;'}">
      <span class="picker-section-label">Recent</span>
      <div class="picker-swatches-grid recent-grid"></div>
    </div>

    <!-- Default Swatches -->
    <div class="picker-section swatches-section">
      <span class="picker-section-label">Default colors</span>
      <div class="picker-swatches-grid default-grid">
        ${DEFAULT_COLORS.map(hex => `
          <button type="button" class="picker-swatch-circle ${currentHex === hex ? 'active' : ''}" data-hex="${hex}" style="background-color: ${hex};" aria-label="${hex}"></button>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(popover);

  function positionPopover() {
    if (isMobile) return;
    const rect = anchorEl.getBoundingClientRect();
    const popW = 296;
    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + popW > window.innerWidth - 12) {
      left = window.innerWidth - popW - 12;
    }
    if (left < 12) left = 12;

    const popH = popover.offsetHeight || 380;
    if (top + popH > window.innerHeight - 12 && rect.top > popH + 12) {
      top = rect.top - popH - 6;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  positionPopover();

  function renderRecentSection() {
    const recent = getRecentColors();
    const section = popover.querySelector('.recent-section');
    const grid = popover.querySelector('.recent-grid');
    if (!section || !grid) return;
    if (recent.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';
    grid.innerHTML = recent.map(hex => `
      <button type="button" class="picker-swatch-circle ${currentHex === hex ? 'active' : ''}" data-hex="${hex}" style="background-color: ${hex};" aria-label="${hex}"></button>
    `).join('');
  }

  function updateUI() {
    const rgb = hsvToRgb(h, s, v);
    currentHex = rgbToHex(rgb.r, rgb.g, rgb.b);

    // Update Square Mode
    const satBox = popover.querySelector('.sat-val-box');
    const satHandle = popover.querySelector('.sat-val-handle');
    const hueHandle = popover.querySelector('.hue-slider-handle');

    if (satBox) {
      satBox.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))`;
    }
    if (satHandle) {
      satHandle.style.left = `${s * 100}%`;
      satHandle.style.top = `${(1 - v) * 100}%`;
      satHandle.style.backgroundColor = currentHex;
    }
    if (hueHandle) {
      hueHandle.style.left = `${(h / 360) * 100}%`;
      hueHandle.style.backgroundColor = `hsl(${h} 100% 50%)`;
    }

    // Update Wheel Mode
    const wheelHandle = popover.querySelector('.wheel-handle');
    const brightTrack = popover.querySelector('.bright-slider-track');
    const brightHandle = popover.querySelector('.bright-slider-handle');

    if (wheelHandle) {
      const rad = ((h + 90) % 360) * Math.PI / 180;
      const radius = s * 88; // 200px wheel -> max inner radius ~88px
      const cx = 100 + radius * Math.cos(rad);
      const cy = 100 + radius * Math.sin(rad);
      wheelHandle.style.left = `${cx}px`;
      wheelHandle.style.top = `${cy}px`;
      wheelHandle.style.backgroundColor = currentHex;
    }
    if (brightTrack) {
      const fullColorRgb = hsvToRgb(h, s, 1);
      const fullColorHex = rgbToHex(fullColorRgb.r, fullColorRgb.g, fullColorRgb.b);
      brightTrack.style.background = `linear-gradient(to right, #000, ${fullColorHex})`;
    }
    if (brightHandle) {
      brightHandle.style.left = `${v * 100}%`;
      brightHandle.style.backgroundColor = currentHex;
    }

    // Update Hex field
    const hexField = popover.querySelector('.hex-field');
    if (hexField && document.activeElement !== hexField) {
      hexField.value = currentHex.slice(1);
      hexField.classList.remove('invalid');
    }

    // Update before/after chip
    const afterChip = popover.querySelector('.chip-after');
    if (afterChip) {
      afterChip.style.backgroundColor = currentHex;
    }

    // Update active swatch circles
    popover.querySelectorAll('.picker-swatch-circle').forEach(btn => {
      const isMatch = (btn.dataset.hex || '').toUpperCase() === currentHex.toUpperCase();
      btn.classList.toggle('active', isMatch);
    });
  }

  function applyColor(newHex, { commit = false } = {}) {
    const norm = normalizeHex(newHex);
    if (!norm) return;
    currentHex = norm;
    const rgb = hexToRgb(currentHex);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    h = hsv.h;
    s = hsv.s;
    v = hsv.v;
    updateUI();
    if (onChange) onChange(currentHex, { commit });
    if (commit) {
      addRecentColor(currentHex);
      renderRecentSection();
    }
  }

  renderRecentSection();
  updateUI();

  // Mode Switching
  popover.querySelectorAll('.mode-segmented-control .segment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const newMode = e.currentTarget.dataset.mode;
      if (newMode === mode) return;
      mode = newMode;
      try {
        localStorage.setItem('certify.colorMode', mode);
      } catch {}
      popover.querySelectorAll('.mode-segmented-control .segment-btn').forEach(b => b.classList.toggle('active', b === e.currentTarget));
      popover.querySelector('.picker-square-mode').style.display = mode === 'square' ? 'block' : 'none';
      popover.querySelector('.picker-wheel-mode').style.display = mode === 'wheel' ? 'block' : 'none';
      updateUI();
    });
  });

  // Dragging & Keyboard in Square Mode: Saturation & Value
  const satBox = popover.querySelector('.sat-val-box');
  if (satBox) {
    const handleSatPointer = (e, commit = false) => {
      const rect = satBox.getBoundingClientRect();
      s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      const rgb = hsvToRgb(h, s, v);
      applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit });
    };

    satBox.addEventListener('pointerdown', (e) => {
      satBox.setPointerCapture(e.pointerId);
      handleSatPointer(e, false);

      const onMove = (moveEv) => handleSatPointer(moveEv, false);
      const onUp = (upEv) => {
        satBox.removeEventListener('pointermove', onMove);
        satBox.removeEventListener('pointerup', onUp);
        satBox.removeEventListener('pointercancel', onUp);
        handleSatPointer(upEv, true);
      };

      satBox.addEventListener('pointermove', onMove);
      satBox.addEventListener('pointerup', onUp);
      satBox.addEventListener('pointercancel', onUp);
    });

    satBox.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      let handled = false;
      if (e.key === 'ArrowLeft') { s = Math.max(0, s - step); handled = true; }
      else if (e.key === 'ArrowRight') { s = Math.min(1, s + step); handled = true; }
      else if (e.key === 'ArrowUp') { v = Math.min(1, v + step); handled = true; }
      else if (e.key === 'ArrowDown') { v = Math.max(0, v - step); handled = true; }
      if (handled) {
        e.preventDefault();
        const rgb = hsvToRgb(h, s, v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit: true });
      }
    });
  }

  // Dragging & Keyboard Hue Slider
  const hueTrack = popover.querySelector('.hue-slider-track');
  if (hueTrack) {
    const handleHuePointer = (e, commit = false) => {
      const rect = hueTrack.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      h = Math.round(frac * 360) % 360;
      const rgb = hsvToRgb(h, s, v);
      applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit });
    };

    hueTrack.addEventListener('pointerdown', (e) => {
      hueTrack.setPointerCapture(e.pointerId);
      handleHuePointer(e, false);

      const onMove = (moveEv) => handleHuePointer(moveEv, false);
      const onUp = (upEv) => {
        hueTrack.removeEventListener('pointermove', onMove);
        hueTrack.removeEventListener('pointerup', onUp);
        hueTrack.removeEventListener('pointercancel', onUp);
        handleHuePointer(upEv, true);
      };

      hueTrack.addEventListener('pointermove', onMove);
      hueTrack.addEventListener('pointerup', onUp);
      hueTrack.addEventListener('pointercancel', onUp);
    });

    hueTrack.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      let handled = false;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        h = (h - step + 360) % 360;
        handled = true;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        h = (h + step) % 360;
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        const rgb = hsvToRgb(h, s, v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit: true });
      }
    });
  }

  // Dragging & Keyboard in Wheel Mode: Hue & Saturation
  const wheelBox = popover.querySelector('.wheel-circle-box');
  if (wheelBox) {
    const handleWheelPointer = (e, commit = false) => {
      const rect = wheelBox.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxR = rect.width / 2 - 10;
      const dist = Math.hypot(dx, dy);

      s = Math.max(0, Math.min(1, dist / maxR));
      const deg = Math.atan2(dy, dx) * 180 / Math.PI;
      h = Math.round((deg - 90 + 360) % 360);

      const rgb = hsvToRgb(h, s, v);
      applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit });
    };

    wheelBox.addEventListener('pointerdown', (e) => {
      wheelBox.setPointerCapture(e.pointerId);
      handleWheelPointer(e, false);

      const onMove = (moveEv) => handleWheelPointer(moveEv, false);
      const onUp = (upEv) => {
        wheelBox.removeEventListener('pointermove', onMove);
        wheelBox.removeEventListener('pointerup', onUp);
        wheelBox.removeEventListener('pointercancel', onUp);
        handleWheelPointer(upEv, true);
      };

      wheelBox.addEventListener('pointermove', onMove);
      wheelBox.addEventListener('pointerup', onUp);
      wheelBox.addEventListener('pointercancel', onUp);
    });

    wheelBox.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      let handled = false;
      if (e.key === 'ArrowLeft') { h = (h - step + 360) % 360; handled = true; }
      else if (e.key === 'ArrowRight') { h = (h + step) % 360; handled = true; }
      else if (e.key === 'ArrowUp') { s = Math.min(1, s + (e.shiftKey ? 0.1 : 0.01)); handled = true; }
      else if (e.key === 'ArrowDown') { s = Math.max(0, s - (e.shiftKey ? 0.1 : 0.01)); handled = true; }
      if (handled) {
        e.preventDefault();
        const rgb = hsvToRgb(h, s, v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit: true });
      }
    });
  }

  // Dragging & Keyboard Brightness Slider
  const brightTrack = popover.querySelector('.bright-slider-track');
  if (brightTrack) {
    const handleBrightPointer = (e, commit = false) => {
      const rect = brightTrack.getBoundingClientRect();
      v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rgb = hsvToRgb(h, s, v);
      applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit });
    };

    brightTrack.addEventListener('pointerdown', (e) => {
      brightTrack.setPointerCapture(e.pointerId);
      handleBrightPointer(e, false);

      const onMove = (moveEv) => handleBrightPointer(moveEv, false);
      const onUp = (upEv) => {
        brightTrack.removeEventListener('pointermove', onMove);
        brightTrack.removeEventListener('pointerup', onUp);
        brightTrack.removeEventListener('pointercancel', onUp);
        handleBrightPointer(upEv, true);
      };

      brightTrack.addEventListener('pointermove', onMove);
      brightTrack.addEventListener('pointerup', onUp);
      brightTrack.addEventListener('pointercancel', onUp);
    });

    brightTrack.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      let handled = false;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        v = Math.max(0, v - step);
        handled = true;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        v = Math.min(1, v + step);
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        const rgb = hsvToRgb(h, s, v);
        applyColor(rgbToHex(rgb.r, rgb.g, rgb.b), { commit: true });
      }
    });
  }

  // Eyedropper Button
  const btnDropper = popover.querySelector('#btn-picker-dropper');
  if (btnDropper && onPickFromTemplate) {
    btnDropper.addEventListener('click', async () => {
      const pickedHex = await onPickFromTemplate();
      if (pickedHex) {
        applyColor(pickedHex, { commit: true });
      }
    });
  }

  // "Pick from screen" EyeDropper API button
  const btnScreen = popover.querySelector('#btn-pick-screen');
  if (btnScreen && typeof window !== 'undefined' && 'EyeDropper' in window) {
    btnScreen.addEventListener('click', async () => {
      try {
        const dropper = new window.EyeDropper();
        const res = await dropper.open();
        if (res && res.sRGBHex) {
          applyColor(res.sRGBHex, { commit: true });
        }
      } catch {}
    });
  }

  // Hex Text Field
  const hexField = popover.querySelector('.hex-field');
  if (hexField) {
    const commitHex = () => {
      const text = hexField.value.trim();
      const norm = normalizeHex(text.startsWith('#') ? text : '#' + text);
      if (norm) {
        hexField.classList.remove('invalid');
        applyColor(norm, { commit: true });
      } else {
        hexField.classList.add('invalid');
      }
    };

    hexField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitHex();
      }
    });
    hexField.addEventListener('blur', () => {
      commitHex();
    });
  }

  // Before / After chip revert button
  const chipBefore = popover.querySelector('.chip-before');
  if (chipBefore) {
    chipBefore.addEventListener('click', () => {
      applyColor(initialHex, { commit: true });
    });
  }

  // Swatch Clicks (delegated)
  popover.addEventListener('click', (e) => {
    const swatch = e.target.closest('.picker-swatch-circle');
    if (swatch && swatch.dataset.hex) {
      applyColor(swatch.dataset.hex, { commit: true });
    }
  });

  // Close Button
  const btnClose = popover.querySelector('.picker-close-btn');
  if (btnClose) {
    btnClose.addEventListener('click', () => close());
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function handleClickOutside(e) {
    if (!popover.contains(e.target) && !anchorEl.contains(e.target)) {
      close();
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  setTimeout(() => {
    document.addEventListener('pointerdown', handleClickOutside);
  }, 10);

  function close() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('pointerdown', handleClickOutside);
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (popover.parentNode) popover.parentNode.removeChild(popover);
    activePicker = null;
    if (anchorEl && typeof anchorEl.focus === 'function') {
      anchorEl.focus();
    }
    if (onClose) onClose();
  }

  activePicker = { close };
  return activePicker;
}
