/**
 * Layer Properties Panel Component.
 * Supports Text, Image, and Shape layer properties, plus layer arrangement/action footer.
 */

import { SIZE_STEPS } from '../model/layers.js';
import { openFontPicker } from './fontPicker.js';
import { getFont, FONT_CATEGORIES } from '../fonts/catalog.js';
import { openColorPicker } from './colorPicker.js';
import { normalizeHex, contrastRatio, pickReadableInk } from '../color/colorMath.js';

const SIZE_WORDS = ['Small', 'Medium-small', 'Medium', 'Large', 'Extra large'];

export function renderPropertiesPanel(el, layer, {
  columns = ['Name'],
  templateColors = [],
  sampleText = '',
  bgUnderLayer = null,
  onPickFromTemplate,
  onChange,
  onMoveLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onToggleLock
} = {}) {
  if (!el) return;

  if (!layer) {
    el.innerHTML = `
      <div class="properties-panel-empty">
        <p class="empty-state-text">Select a layer to customize its properties.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="properties-panel-container">
      <div class="properties-header">
        <span class="section-label">${escapeHtml(layer.name || 'Properties')}</span>
      </div>

      <div class="properties-body">
        ${renderTypeProperties(layer, { columns, templateColors, sampleText, bgUnderLayer })}
      </div>

      <div class="properties-footer">
        <span class="properties-footer-label">Arrange</span>
        <div class="properties-footer-row">
          <div class="arrange-group" role="group" aria-label="Arrange layer">
            <button type="button" class="arrange-btn" id="btn-bring-forward" aria-label="Bring forward" title="Bring forward (Ctrl+])">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M14 16v-5M11.5 13.5 14 11l2.5 2.5"/></svg>
            </button>
            <button type="button" class="arrange-btn" id="btn-send-backward" aria-label="Send backward" title="Send backward (Ctrl+[)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M14 11v5M11.5 13.5 14 16l2.5-2.5"/></svg>
            </button>
            <button type="button" class="arrange-btn" id="btn-duplicate-layer" aria-label="Duplicate layer" title="Duplicate (Ctrl+D)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><path d="M14.5 11.5v6M11.5 14.5h6"/></svg>
            </button>
            <button type="button" class="arrange-btn ${layer.locked ? 'is-on' : ''}" id="btn-lock-layer" aria-pressed="${layer.locked ? 'true' : 'false'}" aria-label="${layer.locked ? 'Unlock position' : 'Lock position'}" title="${layer.locked ? 'Unlock' : 'Lock position'} (Ctrl+Shift+L)">
              ${layer.locked
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>'}
            </button>
          </div>
          <button type="button" class="btn-delete-layer" id="btn-delete-layer" ${layer.locked ? 'disabled title="Unlock to delete"' : 'title="Delete (Del)"'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  `;

  bindEvents(el, layer, {
    columns,
    templateColors,
    sampleText,
    bgUnderLayer,
    onPickFromTemplate,
    onChange,
    onMoveLayer,
    onDuplicateLayer,
    onRemoveLayer,
    onToggleLock
  });
}

function renderTypeProperties(layer, { columns, templateColors, sampleText, bgUnderLayer }) {
  if (layer.type === 'text') {
    const isColumnMode = /^{([^}]+)}$/.test((layer.text || '').trim());
    const matchedCol = isColumnMode ? (layer.text || '').trim().replace(/^\{|\}$/g, '') : (columns[0] || 'Name');
    const fontInfo = getFont(layer.font || 'Great Vibes');

    // Find closest SIZE_STEP index (1-based: 1..5)
    let sizeIndex = 3;
    let minDiff = Infinity;
    SIZE_STEPS.forEach((step, idx) => {
      const diff = Math.abs(step - (layer.sizePct ?? 0.75));
      if (diff < minDiff) {
        minDiff = diff;
        sizeIndex = idx + 1;
      }
    });

    return `
      <!-- Text Source Toggle -->
      <div class="form-group">
        <label class="form-label">Text comes from</label>
        <div class="segmented-control" id="text-mode-control">
          <button type="button" class="segment-btn ${isColumnMode ? 'active' : ''}" data-mode="column">A column</button>
          <button type="button" class="segment-btn ${!isColumnMode ? 'active' : ''}" data-mode="custom">Same for all</button>
        </div>

        <div id="column-mode-content" style="${isColumnMode ? '' : 'display: none;'} margin-top: 0.6rem;">
          <select class="select-input" id="column-select" aria-label="Recipient column">
            ${columns.map(c => `
              <option value="${escapeHtml(c)}" ${c.toLowerCase() === matchedCol.toLowerCase() ? 'selected' : ''}>
                ${escapeHtml(c)}
              </option>
            `).join('')}
          </select>
        </div>

        <div id="custom-mode-content" style="${!isColumnMode ? '' : 'display: none;'} margin-top: 0.6rem;">
          <textarea class="textarea-input" id="custom-text-input" rows="2" placeholder="e.g. For completing {Course}">${escapeHtml(layer.text || '')}</textarea>
          <div class="insert-col-row">
            <span class="insert-col-label">Insert column:</span>
            <div class="col-chips-wrap">
              ${columns.map(c => `
                <button type="button" class="insert-col-chip" data-col="${escapeHtml(c)}">
                  + {${escapeHtml(c)}}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Font Picker Trigger -->
      <div class="form-group">
        <label class="form-label">Font</label>
        <button type="button" class="font-picker-btn" id="btn-open-font-picker">
          <div class="font-btn-info">
            <span class="font-btn-family" style="font-family: '${fontInfo.family}', serif; font-weight: ${fontInfo.weight || 400};">
              ${escapeHtml(fontInfo.family)}
            </span>
            <span class="font-btn-category">${escapeHtml(FONT_CATEGORIES.find(c => c.id === fontInfo.category)?.label || fontInfo.category || 'Font')}</span>
          </div>
          <span class="font-btn-chevron">▾</span>
        </button>
      </div>

      <!-- Size Range Slider -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label" for="size-step-range">Size</label>
          <span class="font-size-hint">${SIZE_WORDS[sizeIndex - 1] || 'Medium'}</span>
        </div>
        <input type="range" class="range-slider" id="size-step-range" min="1" max="5" step="1" value="${sizeIndex}" />
      </div>

      <!-- Auto-Fit Checkbox -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="check-auto-fit" ${layer.autoFit !== false ? 'checked' : ''} />
          <span>Shrink long text to fit</span>
        </label>
      </div>

      <!-- Text Alignment -->
      <div class="form-group">
        <label class="form-label">Alignment</label>
        <div class="segmented-control" id="align-control">
          <button type="button" class="segment-btn ${layer.align === 'left' ? 'active' : ''}" data-align="left" aria-label="Align left">Left</button>
          <button type="button" class="segment-btn ${!layer.align || layer.align === 'center' ? 'active' : ''}" data-align="center" aria-label="Align center">Center</button>
          <button type="button" class="segment-btn ${layer.align === 'right' ? 'active' : ''}" data-align="right" aria-label="Align right">Right</button>
        </div>
      </div>

      <!-- Ink Colors -->
      <div class="form-group">
        <label class="form-label">Ink color</label>
        ${renderColorControl(layer.color || '#1F2A1B', templateColors, 'color', { bgUnderLayer })}
      </div>
    `;
  }

  if (layer.type === 'image') {
    return `
      <div class="form-group image-replace-row">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-replace-image">Replace image</button>
        <span class="image-filename-text" title="${escapeHtml(layer.fileName || 'Image')}">${escapeHtml(layer.fileName || 'image.png')}</span>
        <input type="file" id="replace-image-file-input" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;" />
      </div>

      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label" for="image-opacity-range">Opacity</label>
          <span class="font-size-hint">${Math.round((layer.opacity ?? 1) * 100)}%</span>
        </div>
        <input type="range" class="range-slider" id="image-opacity-range" min="0" max="100" step="1" value="${Math.round((layer.opacity ?? 1) * 100)}" />
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="check-keep-proportions" ${layer.keepAspect !== false ? 'checked' : ''} />
          <span>Keep proportions when resizing</span>
        </label>
      </div>

      <p class="image-note-text">PNG with a transparent background works best for signatures and stamps.</p>
    `;
  }

  if (layer.type === 'shape') {
    const isClosed = layer.shape === 'rect' || layer.shape === 'ellipse';
    return `
      <div class="form-group">
        <label class="form-label">Shape type</label>
        <div class="segmented-control" id="shape-type-control">
          <button type="button" class="segment-btn ${layer.shape === 'line' ? 'active' : ''}" data-shape="line">Line</button>
          <button type="button" class="segment-btn ${layer.shape === 'rect' ? 'active' : ''}" data-shape="rect">Box</button>
          <button type="button" class="segment-btn ${layer.shape === 'ellipse' ? 'active' : ''}" data-shape="ellipse">Circle</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Stroke color</label>
        ${renderColorControl(layer.stroke || '#C8A24A', templateColors, 'stroke')}
      </div>

      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label" for="shape-thickness-range">Thickness</label>
          <span class="font-size-hint">${layer.strokeWidthPct ?? 0.3}%</span>
        </div>
        <input type="range" class="range-slider" id="shape-thickness-range" min="0.1" max="1.5" step="0.05" value="${layer.strokeWidthPct ?? 0.3}" />
      </div>

      ${isClosed ? `
        <div class="form-group">
          <label class="form-label">Fill color</label>
          ${renderColorControl(layer.fill, templateColors, 'fill', { isFill: true })}
        </div>
      ` : ''}
    `;
  }

  return '';
}

function renderColorControl(currentColor, templateColors, propName, { bgUnderLayer = null, isFill = false } = {}) {
  const isNone = isFill && (!currentColor || currentColor === 'transparent' || currentColor === 'none');
  const normCurrent = isNone ? 'transparent' : (normalizeHex(currentColor) || '#1F2A1B');
  const validTemplate = (templateColors || []).slice(0, 6);

  let warningHtml = '';
  if (propName === 'color' && bgUnderLayer) {
    const ratio = contrastRatio(normCurrent, bgUnderLayer);
    if (ratio < 3) {
      warningHtml = `
        <div class="contrast-warning-row">
          <span>Hard to read on this part of the template</span>
          <button type="button" class="contrast-fix-link" id="btn-fix-contrast">Fix</button>
        </div>
      `;
    }
  }

  return `
    <div class="color-row-compact" data-prop="${propName}">
      <div class="color-field-row">
        ${isFill ? `
          <button type="button" class="color-chip-btn color-chip-btn-none ${isNone ? 'active' : ''}" id="btn-fill-none" title="No fill" aria-label="No fill"></button>
        ` : ''}
        <button type="button" class="color-field-btn" id="btn-color-chip-${propName}" aria-label="${propName} color ${isNone ? 'none' : normCurrent}, open color picker">
          <span class="color-field-swatch ${isNone ? 'is-none' : ''}" style="background-color: ${isNone ? '#FFFFFF' : normCurrent};"></span>
          <span class="color-field-hex">${isNone ? 'No fill' : normCurrent.toUpperCase()}</span>
          <svg class="color-field-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" class="btn-quick-eyedropper" id="btn-eyedropper-quick-${propName}" title="Pick a color from your template" aria-label="Pick a color from your template">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 4 6 6"/><path d="M17 7 7.5 16.5 4 20l3.5-3.5"/><path d="M12.5 5.5 18.5 11.5"/><path d="m15 3 6 6-2 2-6-6z"/></svg>
        </button>
      </div>
      ${validTemplate.length > 0 ? `
        <div class="color-template-row">
          <span class="color-template-label">From your template</span>
          <div class="color-template-swatches">
            ${validTemplate.map(hex => `
              <button type="button" class="quick-swatch ${normCurrent.toLowerCase() === hex.toLowerCase() ? 'active' : ''}" data-hex="${hex}" style="background-color: ${hex};" title="${hex}" aria-label="Use ${hex}"></button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    ${warningHtml}
  `;
}

function bindEvents(el, layer, {
  columns,
  templateColors,
  sampleText,
  bgUnderLayer,
  onPickFromTemplate,
  onChange,
  onMoveLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onToggleLock
}) {
  const btnLock = el.querySelector('#btn-lock-layer');
  if (btnLock && onToggleLock) {
    btnLock.addEventListener('click', () => onToggleLock(layer.id));
  }

  // Footer arrangement buttons
  const btnBringForward = el.querySelector('#btn-bring-forward');
  const btnSendBackward = el.querySelector('#btn-send-backward');
  const btnDuplicate = el.querySelector('#btn-duplicate-layer');
  const btnDelete = el.querySelector('#btn-delete-layer');

  if (btnBringForward && onMoveLayer) {
    btnBringForward.addEventListener('click', () => onMoveLayer(layer.id, 1));
  }
  if (btnSendBackward && onMoveLayer) {
    btnSendBackward.addEventListener('click', () => onMoveLayer(layer.id, -1));
  }
  if (btnDuplicate && onDuplicateLayer) {
    btnDuplicate.addEventListener('click', () => onDuplicateLayer(layer.id));
  }
  if (btnDelete && onRemoveLayer) {
    btnDelete.addEventListener('click', () => onRemoveLayer(layer.id));
  }

  // Text layer events
  if (layer.type === 'text') {
    const modeControl = el.querySelector('#text-mode-control');
    const colSelect = el.querySelector('#column-select');
    const customText = el.querySelector('#custom-text-input');
    const colContent = el.querySelector('#column-mode-content');
    const customContent = el.querySelector('#custom-mode-content');

    if (modeControl) {
      modeControl.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        const mode = btn.dataset.mode;
        modeControl.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (mode === 'column') {
          colContent.style.display = 'block';
          customContent.style.display = 'none';
          const col = colSelect ? colSelect.value : (columns[0] || 'Name');
          onChange({ text: `{${col}}` }, { commit: true });
        } else {
          colContent.style.display = 'none';
          customContent.style.display = 'block';
          if (customText) {
            onChange({ text: customText.value || 'Your text' }, { commit: true });
          }
        }
      });
    }

    if (colSelect) {
      colSelect.addEventListener('change', (e) => {
        onChange({ text: `{${e.target.value}}` }, { commit: true });
      });
    }

    if (customText) {
      customText.addEventListener('input', (e) => {
        onChange({ text: e.target.value }, { commit: false });
      });
      customText.addEventListener('change', (e) => {
        onChange({ text: e.target.value }, { commit: true });
      });
    }

    el.querySelectorAll('.insert-col-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const col = chip.dataset.col;
        if (!customText) return;
        const start = customText.selectionStart || customText.value.length;
        const end = customText.selectionEnd || customText.value.length;
        const token = `{${col}}`;
        const val = customText.value;
        customText.value = val.slice(0, start) + token + val.slice(end);
        customText.focus();
        customText.selectionStart = customText.selectionEnd = start + token.length;
        onChange({ text: customText.value }, { commit: true });
      });
    });

    const btnOpenFont = el.querySelector('#btn-open-font-picker');
    if (btnOpenFont) {
      btnOpenFont.addEventListener('click', () => {
        openFontPicker(btnOpenFont, {
          value: layer.font,
          sampleText,
          onPick: (chosenFamily) => {
            onChange({ font: chosenFamily }, { commit: true });
          }
        });
      });
    }

    const sizeRange = el.querySelector('#size-step-range');
    if (sizeRange) {
      sizeRange.addEventListener('input', (e) => {
        const idx = parseInt(e.target.value, 10) - 1;
        const sizePct = SIZE_STEPS[idx] ?? 0.75;
        const hint = el.querySelector('.font-size-hint');
        if (hint) hint.textContent = SIZE_WORDS[idx] || 'Medium';
        onChange({ sizePct }, { commit: false });
      });
      sizeRange.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10) - 1;
        const sizePct = SIZE_STEPS[idx] ?? 0.75;
        onChange({ sizePct }, { commit: true });
      });
    }

    const checkAutoFit = el.querySelector('#check-auto-fit');
    if (checkAutoFit) {
      checkAutoFit.addEventListener('change', (e) => {
        onChange({ autoFit: e.target.checked }, { commit: true });
      });
    }

    const alignControl = el.querySelector('#align-control');
    if (alignControl) {
      alignControl.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        alignControl.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange({ align: btn.dataset.align }, { commit: true });
      });
    }
  }

  // Image layer events
  if (layer.type === 'image') {
    const btnReplace = el.querySelector('#btn-replace-image');
    const replaceInput = el.querySelector('#replace-image-file-input');
    if (btnReplace && replaceInput) {
      btnReplace.addEventListener('click', () => replaceInput.click());
      replaceInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
          alert('Image exceeds maximum allowed size of 20MB.');
          replaceInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          const img = new Image();
          img.onload = () => {
            onChange({
              src: dataUrl,
              fileName: file.name,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            }, { commit: true });
            replaceInput.value = '';
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    const opacityRange = el.querySelector('#image-opacity-range');
    if (opacityRange) {
      opacityRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const hint = opacityRange.parentNode.querySelector('.font-size-hint');
        if (hint) hint.textContent = `${val}%`;
        onChange({ opacity: val / 100 }, { commit: false });
      });
      opacityRange.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        onChange({ opacity: val / 100 }, { commit: true });
      });
    }

    const checkKeepAspect = el.querySelector('#check-keep-proportions');
    if (checkKeepAspect) {
      checkKeepAspect.addEventListener('change', (e) => {
        onChange({ keepAspect: e.target.checked }, { commit: true });
      });
    }
  }

  // Shape layer events
  if (layer.type === 'shape') {
    const shapeTypeControl = el.querySelector('#shape-type-control');
    if (shapeTypeControl) {
      shapeTypeControl.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment-btn');
        if (!btn) return;
        const shape = btn.dataset.shape;
        const names = { line: 'Line', rect: 'Box', ellipse: 'Circle' };
        onChange({ shape, name: names[shape] || 'Shape' }, { commit: true });
      });
    }

    const thicknessRange = el.querySelector('#shape-thickness-range');
    if (thicknessRange) {
      thicknessRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const hint = thicknessRange.parentNode.querySelector('.font-size-hint');
        if (hint) hint.textContent = `${val}%`;
        onChange({ strokeWidthPct: val }, { commit: false });
      });
      thicknessRange.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        onChange({ strokeWidthPct: val }, { commit: true });
      });
    }
  }

  // Compact color controls & eyedroppers
  el.querySelectorAll('.color-row-compact').forEach(row => {
    const propName = row.dataset.prop;
    const chipBtn = row.querySelector(`#btn-color-chip-${propName}`);
    const dropperBtn = row.querySelector(`#btn-eyedropper-quick-${propName}`);

    if (chipBtn) {
      chipBtn.addEventListener('click', () => {
        openColorPicker(chipBtn, {
          value: layer[propName] || (propName === 'stroke' ? '#C8A24A' : '#1F2A1B'),
          templateColors,
          onChange: (hex, { commit }) => {
            onChange({ [propName]: hex }, { commit });
          },
          onPickFromTemplate
        });
      });
    }

    if (dropperBtn && onPickFromTemplate) {
      dropperBtn.addEventListener('click', async () => {
        const picked = await onPickFromTemplate();
        if (picked) {
          onChange({ [propName]: picked }, { commit: true });
        }
      });
    }

    row.querySelectorAll('.quick-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex;
        onChange({ [propName]: hex }, { commit: true });
      });
    });
  });

  const btnFillNone = el.querySelector('#btn-fill-none');
  if (btnFillNone) {
    btnFillNone.addEventListener('click', () => {
      onChange({ fill: null }, { commit: true });
    });
  }

  const btnFixContrast = el.querySelector('#btn-fix-contrast');
  if (btnFixContrast && bgUnderLayer) {
    btnFixContrast.addEventListener('click', () => {
      const fixedInk = pickReadableInk(bgUnderLayer, [...templateColors, '#1F2A1B', '#FFFFFF']);
      onChange({ color: fixedInk }, { commit: true });
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
