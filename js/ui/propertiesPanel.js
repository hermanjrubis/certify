/**
 * Layer Properties Panel Component.
 * Supports Text, Image, and Shape layer properties, plus layer arrangement/action footer.
 */

import { SIZE_STEPS } from '../model/layers.js';
import { openFontPicker } from './fontPicker.js';
import { getFont } from '../fonts/catalog.js';
import { DEFAULT_SWATCHES } from '../color/templateColors.js';

export function renderPropertiesPanel(el, layer, {
  columns = ['Name'],
  templateColors = [],
  sampleText = '',
  onChange,
  onMoveLayer,
  onDuplicateLayer,
  onRemoveLayer
}) {
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
        ${renderTypeProperties(layer, { columns, templateColors, sampleText })}
      </div>

      <div class="properties-footer">
        <div class="layer-actions-group">
          <button type="button" class="btn-icon btn-sm" id="btn-bring-forward" aria-label="Bring forward" title="Bring forward">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button type="button" class="btn-icon btn-sm" id="btn-send-backward" aria-label="Send backward" title="Send backward">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button type="button" class="btn-icon btn-sm" id="btn-duplicate-layer" aria-label="Duplicate layer" title="Duplicate layer">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button type="button" class="btn-icon btn-sm btn-action-danger" id="btn-delete-layer" aria-label="Delete layer" title="Delete layer">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  bindEvents(el, layer, { columns, templateColors, sampleText, onChange, onMoveLayer, onDuplicateLayer, onRemoveLayer });
}

function renderTypeProperties(layer, { columns, templateColors, sampleText }) {
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
            <span class="font-btn-category">${escapeHtml(fontInfo.category || 'Font')}</span>
          </div>
          <span class="font-btn-chevron">▾</span>
        </button>
      </div>

      <!-- Size Range Slider -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label" for="size-step-range">Size</label>
          <span class="font-size-hint">Step ${sizeIndex} of 5</span>
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
        ${renderColorSwatches(layer.color || '#1F2A1B', templateColors, 'color')}
      </div>
    `;
  }

  if (layer.type === 'image') {
    return `
      <div class="form-group">
        <label class="form-label">Image Preview</label>
        <div class="image-layer-preview-box">
          <img src="${layer.src}" class="image-layer-thumb" alt="Layer preview" />
        </div>
      </div>

      <div class="form-group">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-replace-image">Replace image</button>
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
        ${renderColorSwatches(layer.stroke || '#C8A24A', templateColors, 'stroke')}
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
          <div class="fill-options-row">
            <button type="button" class="btn btn-sm btn-secondary ${!layer.fill || layer.fill === 'transparent' ? 'active' : ''}" id="btn-fill-none">None</button>
            ${renderColorSwatches(layer.fill || 'transparent', templateColors, 'fill')}
          </div>
        </div>
      ` : ''}
    `;
  }

  return '';
}

function renderColorSwatches(currentColor, templateColors, propName) {
  const normCurrent = (currentColor || '').toLowerCase();
  const validTemplate = (templateColors || []).slice(0, 3);

  return `
    <div class="swatches-wrapper" data-prop="${propName}">
      ${validTemplate.length > 0 ? `
        <div class="swatches-row template-swatches">
          ${validTemplate.map(hex => `
            <button type="button" class="swatch-btn ${normCurrent === hex.toLowerCase() ? 'active' : ''}" data-hex="${hex}" style="background-color: ${hex};" title="Template color: ${hex}"></button>
          `).join('')}
        </div>
      ` : ''}
      <div class="swatches-row classic-swatches">
        ${DEFAULT_SWATCHES.map(s => `
          <button type="button" class="swatch-btn ${normCurrent === s.hex.toLowerCase() ? 'active' : ''}" data-hex="${s.hex}" style="background-color: ${s.hex};" title="${s.label}: ${s.hex}"></button>
        `).join('')}
        <label class="custom-color-picker-label" title="Custom color">
          <input type="color" class="custom-color-input" value="${normCurrent.startsWith('#') && normCurrent.length === 7 ? normCurrent : '#1F2A1B'}" />
          <span class="custom-color-chip" style="background-color: ${currentColor};"></span>
        </label>
      </div>
    </div>
  `;
}

function bindEvents(el, layer, { columns, templateColors, sampleText, onChange, onMoveLayer, onDuplicateLayer, onRemoveLayer }) {
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
        if (hint) hint.textContent = `Step ${idx + 1} of 5`;
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

    const btnFillNone = el.querySelector('#btn-fill-none');
    if (btnFillNone) {
      btnFillNone.addEventListener('click', () => {
        onChange({ fill: null }, { commit: true });
      });
    }
  }

  // Swatches click & custom color pickers
  el.querySelectorAll('.swatches-wrapper').forEach(wrapper => {
    const propName = wrapper.dataset.prop;
    wrapper.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex;
        wrapper.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange({ [propName]: hex }, { commit: true });
      });
    });

    const customInput = wrapper.querySelector('.custom-color-input');
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        const hex = e.target.value;
        const chip = wrapper.querySelector('.custom-color-chip');
        if (chip) chip.style.backgroundColor = hex;
        wrapper.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
        onChange({ [propName]: hex }, { commit: false });
      });
      customInput.addEventListener('change', (e) => {
        onChange({ [propName]: e.target.value }, { commit: true });
      });
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

