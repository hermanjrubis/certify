/**
 * Font & Style Panel Component
 * Manages Google Fonts selection, text color swatches, template-sampled recommended colors,
 * continuous 2D color picker (gradient square + hue slider), manual font size control,
 * alignment toggles, and auto-fit state.
 */

import { icons } from './icons.js';

export const CURATED_FONTS = [
  // Script & Cursive
  { name: 'Dancing Script', category: 'Script & Cursive' },
  { name: 'Luxurious Script', category: 'Script & Cursive' },
  { name: 'Allura', category: 'Script & Cursive' },
  { name: 'Parisienne', category: 'Script & Cursive' },
  { name: 'Pinyon Script', category: 'Script & Cursive' },
  { name: 'Tangerine', category: 'Script & Cursive' },
  { name: 'Sacramento', category: 'Script & Cursive' },
  { name: 'Alex Brush', category: 'Script & Cursive' },
  { name: 'Great Vibes', category: 'Script & Cursive' },
  { name: 'Mrs Saint Delafield', category: 'Script & Cursive' },

  // Elegant & Serif
  { name: 'Cinzel', category: 'Elegant & Serif' },
  { name: 'Playfair Display', category: 'Elegant & Serif' },
  { name: 'Cormorant Garamond', category: 'Elegant & Serif' },
  { name: 'EB Garamond', category: 'Elegant & Serif' },
  { name: 'Marcellus', category: 'Elegant & Serif' }
];

export const DEFAULT_SWATCHES = [
  { label: 'Charcoal', hex: '#1F2A1B' },
  { label: 'Forest Green', hex: '#2E5C24' },
  { label: 'Warm Gold', hex: '#9B783E' },
  { label: 'Deep Navy', hex: '#1E3A5F' },
  { label: 'Burgundy', hex: '#682D36' }
];

export const TONAL_PALETTE = [
  '#111812', '#1F2A1B', '#2E5C24', '#3E7B31', '#1B3A4B',
  '#0F2537', '#1E3A5F', '#2C4C74', '#5C1D24', '#782833',
  '#8E4A49', '#633B48', '#6F4E37', '#8B5A2B', '#9B783E',
  '#B8860B', '#36454F', '#2F4F4F', '#1C3144', '#4A403A'
];

/**
 * Computes WCAG relative luminance of an sRGB color [0-255].
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {number} Luminance between 0.0 and 1.0
 */
export function getRelativeLuminance(r, g, b) {
  const srgb = [r / 255, g / 255, b / 255].map(v => 
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Calculates WCAG contrast ratio between two relative luminance values.
 * @param {number} lum1 
 * @param {number} lum2 
 * @returns {number} Contrast ratio between 1.0 and 21.0
 */
export function getContrastRatio(lum1, lum2) {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Calculates Euclidean distance in RGB color space.
 */
function getRgbDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

/**
 * Accurate color conversion utilities
 */
export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255)
  ];
}

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * (((b - r) / delta) + 2);
    } else {
      h = 60 * (((r - g) / delta) + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return [Math.round(h), s, v];
}

export function rgbToHex(r, g, b) {
  const toHex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex) {
  let clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return [31, 42, 27];
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [31, 42, 27];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Extracts contrast-aware and accent-boosted colors from a certificate template image.
 * Guarantees that low-contrast background shades are rejected and vivid accents (like gold on navy) are prioritized.
 * 
 * @param {HTMLImageElement} imgElement 
 * @param {number} [maxColors=5] 
 * @returns {string[]} Array of hex color strings
 */
export function extractTemplateColors(imgElement, maxColors = 5) {
  try {
    const canvas = document.createElement('canvas');
    const width = 140;
    const height = Math.max(20, Math.round(width / (imgElement.naturalWidth / imgElement.naturalHeight)));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height).data;

    // 1. Detect background color (mode of overall image & center text region)
    const bgBuckets = {};
    const candidateBuckets = {};

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = imgData[i + 3];
        if (a < 128) continue;

        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];

        // Quantize to 24-step buckets
        const qr = Math.round(r / 24) * 24;
        const qg = Math.round(g / 24) * 24;
        const qb = Math.round(b / 24) * 24;
        const key = `${qr},${qg},${qb}`;

        // Weight center text region higher for background determination
        const inCenter = (x > width * 0.2 && x < width * 0.8 && y > height * 0.25 && y < height * 0.75);
        bgBuckets[key] = (bgBuckets[key] || 0) + (inCenter ? 2 : 1);

        if (!candidateBuckets[key]) {
          candidateBuckets[key] = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
        }
        candidateBuckets[key].rSum += r;
        candidateBuckets[key].gSum += g;
        candidateBuckets[key].bSum += b;
        candidateBuckets[key].count++;
      }
    }

    // Determine background RGB & relative luminance
    let maxBgCount = 0;
    let bgKey = '255,255,255';
    for (const [key, count] of Object.entries(bgBuckets)) {
      if (count > maxBgCount) {
        maxBgCount = count;
        bgKey = key;
      }
    }

    const [bgr, bgg, bgb] = bgKey.split(',').map(Number);
    const bgLum = getRelativeLuminance(bgr, bgg, bgb);
    const isDarkBg = bgLum < 0.25;

    // 2. Score candidates by contrast against background + chroma/accent boost
    const scoredCandidates = [];

    for (const data of Object.values(candidateBuckets)) {
      if (data.count < 3) continue;

      const r = Math.round(data.rSum / data.count);
      const g = Math.round(data.gSum / data.count);
      const b = Math.round(data.bSum / data.count);

      const lum = getRelativeLuminance(r, g, b);
      const contrast = getContrastRatio(lum, bgLum);

      // HARD CONTRAST FLOOR: Drop anything below 3.2:1 contrast ratio
      if (contrast < 3.2) continue;

      // Calculate chroma (colorfulness)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = (maxC - minC) / 255;

      // Give extra boost to warm gold, amber, or vibrant tones
      let accentBoost = 1.0;
      if (isDarkBg) {
        // On dark certificates, golden/warm accents (R > B and G > B) are top tier
        if (r > 160 && g > 120 && b < 130) {
          accentBoost = 2.4;
        } else if (chroma > 0.25) {
          accentBoost = 1.8;
        }
      } else {
        // On light certificates, rich jewel tones & dark accents rank high
        if (chroma > 0.2) {
          accentBoost = 1.6;
        }
      }

      const score = Math.pow(contrast, 1.4) * (1 + 2.5 * chroma) * accentBoost * Math.log10(data.count + 2);
      scoredCandidates.push({ r, g, b, contrast, chroma, score, hex: rgbToHex(r, g, b) });
    }

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 3. Deduplicate to ensure distinctive swatches (Euclidean distance >= 45)
    const selected = [];
    for (const cand of scoredCandidates) {
      const isTooClose = selected.some(s => getRgbDistance(cand.r, cand.g, cand.b, s.r, s.g, s.b) < 45);
      if (!isTooClose) {
        selected.push(cand);
      }
      if (selected.length >= maxColors) break;
    }

    // 4. Fallback harmonized additions if fewer than maxColors found
    if (selected.length < maxColors) {
      const fallbacks = isDarkBg
        ? ['#E5C07B', '#F7F0E3', '#D4AF37', '#DCEAD6', '#C99700']
        : ['#1F2A1B', '#2E5C24', '#9B783E', '#1E3A5F', '#682D36'];

      for (const fbHex of fallbacks) {
        const [fbr, fbg, fbb] = hexToRgb(fbHex);
        const isTooClose = selected.some(s => getRgbDistance(fbr, fbg, fbb, s.r, s.g, s.b) < 45);
        if (!isTooClose) {
          selected.push({ hex: fbHex, r: fbr, g: fbg, b: fbb });
        }
        if (selected.length >= maxColors) break;
      }
    }

    return selected.map(s => s.hex);
  } catch (err) {
    console.warn('Could not extract colors from template:', err);
    return ['#2E5C24', '#9B783E', '#1E3A5F', '#5C1D24', '#1F2A1B'];
  }
}

export class FontPanel {
  /**
   * @param {HTMLElement} containerEl 
   * @param {object} initialConfig 
   * @param {Function} onChangeCallback 
   */
  constructor(containerEl, initialConfig, onChangeCallback) {
    this.container = containerEl;
    this.boxNativeHeight = initialConfig.boxNativeHeight || 150;
    const defaultSize = Math.max(14, Math.round(this.boxNativeHeight * 0.8));

    this.config = {
      font: initialConfig.font || 'Dancing Script',
      color: initialConfig.color || '#1F2A1B',
      align: initialConfig.align || 'center',
      autoFit: initialConfig.autoFit !== false,
      maxFontSizePx: initialConfig.maxFontSizePx || defaultSize
    };

    this.stepPx = Math.max(1, Math.round(this.boxNativeHeight * 0.02));

    // Color picker HSV state
    const [r, g, b] = hexToRgb(this.config.color);
    const [h, s, v] = rgbToHsv(r, g, b);
    this.pickerState = {
      h: h || 120,
      s: s,
      v: v
    };

    this.recommendedColors = [];
    this.isPopoverOpen = false;
    this.isFontDropdownOpen = false;
    this.onChange = onChangeCallback;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="style-panel">
        <div class="section-label">TEXT STYLE</div>
        
        <!-- Custom Font Dropdown (Guaranteed reliable click target) -->
        <div class="form-group" style="position: relative;">
          <label class="form-label">Font</label>
          <div class="custom-font-dropdown" id="font-dropdown-container">
            <button type="button" class="font-dropdown-trigger" id="font-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false" title="Choose font family">
              <span class="font-trigger-text" id="font-trigger-text" style="font-family: '${this.config.font}', cursive, serif;">${this.config.font}</span>
              <span class="font-trigger-chevron">${icons.chevronDown(14)}</span>
            </button>

            <div class="font-dropdown-menu" id="font-dropdown-menu" role="listbox" style="display: none;">
              <div class="font-group-label">Script & Cursive</div>
              ${CURATED_FONTS.filter(f => f.category.includes('Script')).map(f => `
                <button type="button" 
                        class="font-option-item ${this.config.font === f.name ? 'selected' : ''}" 
                        role="option" 
                        data-font="${f.name}"
                        aria-selected="${this.config.font === f.name}">
                  <span class="font-option-name" style="font-family: '${f.name}', cursive, serif;">${f.name}</span>
                  ${this.config.font === f.name ? `<span class="font-option-check">${icons.check(14)}</span>` : ''}
                </button>
              `).join('')}

              <div class="font-group-label">Elegant & Serif</div>
              ${CURATED_FONTS.filter(f => f.category.includes('Serif')).map(f => `
                <button type="button" 
                        class="font-option-item ${this.config.font === f.name ? 'selected' : ''}" 
                        role="option" 
                        data-font="${f.name}"
                        aria-selected="${this.config.font === f.name}">
                  <span class="font-option-name" style="font-family: '${f.name}', serif;">${f.name}</span>
                  ${this.config.font === f.name ? `<span class="font-option-check">${icons.check(14)}</span>` : ''}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Manual Font Size Control in Pixels (Dynamically computed default & step) -->
        <div class="form-group font-size-form-group">
          <div class="form-label-row">
            <label class="form-label" for="font-size-input">Font Size</label>
            <span class="font-size-hint" id="font-size-hint">${this.config.autoFit ? 'Preferred max (auto-shrinks if long)' : 'Locked font size'}</span>
          </div>
          <div class="font-size-control">
            <button type="button" class="btn-icon size-step-btn" id="btn-font-size-dec" title="Decrease font size by ${this.stepPx}px">
              ${icons.minus(14)}
            </button>
            <div class="size-input-wrapper">
              <input type="number" id="font-size-input" class="size-input" min="10" max="3000" step="${this.stepPx}" value="${this.config.maxFontSizePx}" title="Preferred font size in pixels (native resolution)">
              <span class="size-unit">px</span>
            </div>
            <button type="button" class="btn-icon size-step-btn" id="btn-font-size-inc" title="Increase font size by ${this.stepPx}px">
              ${icons.plus(14)}
            </button>
          </div>
        </div>

        <!-- Auto-fit Checkbox (Safety net against overflow) -->
        <div class="form-group">
          <label class="checkbox-label" for="auto-fit-checkbox" title="Automatically shrink text for long names to prevent clipping">
            <input type="checkbox" id="auto-fit-checkbox" class="checkbox-input" ${this.config.autoFit ? 'checked' : ''}>
            <span class="checkbox-custom">
              ${icons.check(12)}
            </span>
            <span>Auto-fit size for long names</span>
          </label>
        </div>

        <!-- Alignment Controls -->
        <div class="form-group">
          <label class="form-label">Align</label>
          <div class="align-button-group" role="group" aria-label="Text Alignment">
            <button type="button" class="btn-icon align-btn ${this.config.align === 'left' ? 'active' : ''}" data-align="left" title="Align Left">
              ${icons.alignLeft(18)}
            </button>
            <button type="button" class="btn-icon align-btn ${this.config.align === 'center' ? 'active' : ''}" data-align="center" title="Align Center">
              ${icons.alignCenter(18)}
            </button>
            <button type="button" class="btn-icon align-btn ${this.config.align === 'right' ? 'active' : ''}" data-align="right" title="Align Right">
              ${icons.alignRight(18)}
            </button>
          </div>
        </div>

        <!-- Template Recommended Colors (Contrast-aware & Accent Boosted) -->
        <div class="form-group" id="recommended-colors-group" style="${this.recommendedColors.length ? '' : 'display: none;'}">
          <label class="form-label form-label-sub">Recommended for this template</label>
          <div class="swatches-container" id="recommended-swatches-container">
            ${this.renderRecommendedSwatchesHtml()}
          </div>
        </div>

        <!-- Standard Color Palette & Continuous Color Picker Trigger -->
        <div class="form-group" style="position: relative;">
          <label class="form-label">Color</label>
          <div class="swatches-container">
            ${DEFAULT_SWATCHES.map(sw => `
              <button type="button" 
                      class="swatch-btn ${this.config.color.toUpperCase() === sw.hex.toUpperCase() ? 'active' : ''}" 
                      style="background-color: ${sw.hex};" 
                      data-hex="${sw.hex}" 
                      title="${sw.label}">
              </button>
            `).join('')}

            <!-- Custom Color Popover Trigger Button -->
            <button type="button" class="custom-color-trigger ${this.isCustomColorActive() ? 'active' : ''}" id="btn-custom-color-trigger" title="Open continuous color picker">
              <span class="custom-color-indicator" style="background-color: ${this.config.color};"></span>
              <span class="custom-color-plus-icon">${icons.plus(12)}</span>
            </button>
          </div>

          <!-- Continuous Color Popover Card (Gradient Square + Hue Slider) -->
          <div class="color-popover" id="color-popover" style="display: none;">
            <div class="color-popover-header">
              <span class="color-popover-title">Pick a color</span>
              <button type="button" class="color-popover-close" id="btn-color-popover-close" title="Close">
                ${icons.close(14)}
              </button>
            </div>

            <!-- 2D Saturation / Value Gradient Area -->
            <div class="color-picker-gradient-box" id="color-picker-gradient-box">
              <div class="color-picker-gradient-sat"></div>
              <div class="color-picker-gradient-val"></div>
              <div class="color-picker-handle" id="color-picker-handle"></div>
            </div>

            <!-- 360° Hue Slider -->
            <div class="color-picker-hue-slider" id="color-picker-hue-slider">
              <div class="hue-slider-handle" id="hue-slider-handle"></div>
            </div>

            <!-- Hex Input and Live Preview Chip -->
            <div class="color-hex-row">
              <div class="color-preview-chip" id="color-preview-chip" style="background-color: ${this.config.color};"></div>
              <div class="hex-input-box">
                <span class="hex-prefix">#</span>
                <input type="text" id="color-hex-text" class="hex-input" maxlength="6" value="${this.config.color.replace('#', '')}" placeholder="1F2A1B" spellcheck="false" title="Hex color value">
              </div>
            </div>

            <!-- Preset Tonal Swatches -->
            <div class="color-palette-label">Preset palette</div>
            <div class="tonal-grid">
              ${TONAL_PALETTE.map(hex => `
                <button type="button" 
                        class="tonal-chip ${this.config.color.toUpperCase() === hex.toUpperCase() ? 'active' : ''}" 
                        style="background-color: ${hex};" 
                        data-hex="${hex}" 
                        title="${hex}">
                </button>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
    this.updateColorPickerVisuals();
  }

  renderRecommendedSwatchesHtml() {
    return this.recommendedColors.map(hex => `
      <button type="button" 
              class="swatch-btn ${this.config.color.toUpperCase() === hex.toUpperCase() ? 'active' : ''}" 
              style="background-color: ${hex};" 
              data-hex="${hex}" 
              title="Template color ${hex}">
      </button>
    `).join('');
  }

  isCustomColorActive() {
    const allSwatches = [...DEFAULT_SWATCHES.map(s => s.hex.toUpperCase()), ...this.recommendedColors.map(c => c.toUpperCase())];
    return !allSwatches.includes(this.config.color.toUpperCase());
  }

  bindEvents() {
    // 1. Custom Font Dropdown Events
    const trigger = this.container.querySelector('#font-dropdown-trigger');
    const menu = this.container.querySelector('#font-dropdown-menu');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isFontDropdownOpen = !this.isFontDropdownOpen;
        menu.style.display = this.isFontDropdownOpen ? 'block' : 'none';
        trigger.setAttribute('aria-expanded', this.isFontDropdownOpen ? 'true' : 'false');
      });

      const options = menu.querySelectorAll('.font-option-item');
      options.forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const fontName = opt.dataset.font;
          if (fontName) {
            this.selectFont(fontName);
          }
        });
      });

      // Close font dropdown on click outside
      document.addEventListener('click', (e) => {
        if (this.isFontDropdownOpen && !trigger.contains(e.target) && !menu.contains(e.target)) {
          this.isFontDropdownOpen = false;
          menu.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 2. Manual Font Size in Pixels (Dynamic step based on ~2% of box height)
    const sizeInput = this.container.querySelector('#font-size-input');
    const sizeHint = this.container.querySelector('#font-size-hint');
    const btnDec = this.container.querySelector('#btn-font-size-dec');
    const btnInc = this.container.querySelector('#btn-font-size-inc');

    const setFontSizePx = (newVal) => {
      let val = parseInt(newVal, 10);
      if (isNaN(val) || val < 10) val = 10;
      if (val > 3000) val = 3000;

      this.config.maxFontSizePx = val;
      if (sizeInput) sizeInput.value = val;
      this.emitChange();
    };

    if (sizeInput) {
      sizeInput.addEventListener('change', (e) => setFontSizePx(e.target.value));
    }

    if (btnDec) {
      btnDec.addEventListener('click', () => {
        setFontSizePx((this.config.maxFontSizePx || 50) - this.stepPx);
      });
    }

    if (btnInc) {
      btnInc.addEventListener('click', () => {
        setFontSizePx((this.config.maxFontSizePx || 50) + this.stepPx);
      });
    }

    // 3. Auto-fit toggle
    const autoFitCheck = this.container.querySelector('#auto-fit-checkbox');
    if (autoFitCheck) {
      autoFitCheck.addEventListener('change', (e) => {
        this.config.autoFit = e.target.checked;
        if (sizeHint) {
          sizeHint.textContent = this.config.autoFit ? 'Preferred max (auto-shrinks if long)' : 'Locked font size';
        }
        this.emitChange();
      });
    }

    // 4. Alignment buttons
    const alignBtns = this.container.querySelectorAll('.align-btn');
    alignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        alignBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.align = btn.dataset.align;
        this.emitChange();
      });
    });

    // 5. Swatches (Default & Recommended)
    this.bindSwatchClicks();

    // 6. Custom Color Popover Toggle & Continuous Dragging
    const triggerBtn = this.container.querySelector('#btn-custom-color-trigger');
    const popover = this.container.querySelector('#color-popover');
    const closeBtn = this.container.querySelector('#btn-color-popover-close');
    const hexInput = this.container.querySelector('#color-hex-text');

    if (triggerBtn && popover) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isPopoverOpen = !this.isPopoverOpen;
        popover.style.display = this.isPopoverOpen ? 'block' : 'none';
        if (this.isPopoverOpen) {
          this.updateColorPickerVisuals();
          if (hexInput) {
            hexInput.focus();
            hexInput.select();
          }
        }
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.isPopoverOpen = false;
          popover.style.display = 'none';
        });
      }

      document.addEventListener('click', (e) => {
        if (this.isPopoverOpen && !popover.contains(e.target) && e.target !== triggerBtn) {
          this.isPopoverOpen = false;
          popover.style.display = 'none';
        }
      });
    }

    // Bind Continuous 2D Gradient Box & Hue Slider Dragging
    this.bindContinuousColorPicker();

    // Hex Input typing
    if (hexInput) {
      hexInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
        e.target.value = val;
        if (val.length === 3 || val.length === 6) {
          const hex = `#${val.length === 3 ? val.split('').map(c => c + c).join('') : val}`.toUpperCase();
          this.setColor(hex, false);
        }
      });
    }

    // Tonal chips in popover
    const tonalChips = this.container.querySelectorAll('.tonal-chip');
    tonalChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const hex = chip.dataset.hex.toUpperCase();
        this.setColor(hex, true);
      });
    });
  }

  selectFont(fontName) {
    this.config.font = fontName;

    // Update trigger UI
    const triggerText = this.container.querySelector('#font-trigger-text');
    if (triggerText) {
      triggerText.textContent = fontName;
      triggerText.style.fontFamily = `'${fontName}', cursive, serif`;
    }

    // Update menu selections
    const menu = this.container.querySelector('#font-dropdown-menu');
    const trigger = this.container.querySelector('#font-dropdown-trigger');
    if (menu) {
      const options = menu.querySelectorAll('.font-option-item');
      options.forEach(opt => {
        const isCurrent = opt.dataset.font === fontName;
        opt.classList.toggle('selected', isCurrent);
        opt.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        const checkSpan = opt.querySelector('.font-option-check');
        if (isCurrent && !checkSpan) {
          opt.insertAdjacentHTML('beforeend', `<span class="font-option-check">${icons.check(14)}</span>`);
        } else if (!isCurrent && checkSpan) {
          checkSpan.remove();
        }
      });
      menu.style.display = 'none';
    }

    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    this.isFontDropdownOpen = false;

    // Load font explicitly to ensure canvas renders crisp glyphs
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`32px "${fontName}"`).then(() => {
        this.emitChange();
      }).catch(() => {
        this.emitChange();
      });
    } else {
      this.emitChange();
    }
  }

  bindContinuousColorPicker() {
    const gradientBox = this.container.querySelector('#color-picker-gradient-box');
    const hueSlider = this.container.querySelector('#color-picker-hue-slider');

    // 1. 2D Gradient Box (Saturation & Value) Dragging
    if (gradientBox) {
      const handleGradientMove = (e) => {
        const rect = gradientBox.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);

        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

        this.pickerState.s = Math.max(0, Math.min(1, x / rect.width));
        this.pickerState.v = Math.max(0, Math.min(1, 1 - (y / rect.height)));

        const [r, g, b] = hsvToRgb(this.pickerState.h, this.pickerState.s, this.pickerState.v);
        const hex = rgbToHex(r, g, b);
        this.setColor(hex, false);
      };

      let isDraggingGrad = false;
      gradientBox.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingGrad = true;
        gradientBox.setPointerCapture(e.pointerId);
        handleGradientMove(e);
      });

      gradientBox.addEventListener('pointermove', (e) => {
        if (!isDraggingGrad) return;
        handleGradientMove(e);
      });

      const endGradDrag = (e) => {
        if (isDraggingGrad) {
          isDraggingGrad = false;
          try { gradientBox.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };
      gradientBox.addEventListener('pointerup', endGradDrag);
      gradientBox.addEventListener('pointercancel', endGradDrag);
    }

    // 2. Hue Slider (0° to 360°) Dragging
    if (hueSlider) {
      const handleHueMove = (e) => {
        const rect = hueSlider.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));

        this.pickerState.h = Math.max(0, Math.min(360, (x / rect.width) * 360));
        const [r, g, b] = hsvToRgb(this.pickerState.h, this.pickerState.s, this.pickerState.v);
        const hex = rgbToHex(r, g, b);
        this.setColor(hex, false);
      };

      let isDraggingHue = false;
      hueSlider.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingHue = true;
        hueSlider.setPointerCapture(e.pointerId);
        handleHueMove(e);
      });

      hueSlider.addEventListener('pointermove', (e) => {
        if (!isDraggingHue) return;
        handleHueMove(e);
      });

      const endHueDrag = (e) => {
        if (isDraggingHue) {
          isDraggingHue = false;
          try { hueSlider.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };
      hueSlider.addEventListener('pointerup', endHueDrag);
      hueSlider.addEventListener('pointercancel', endHueDrag);
    }
  }

  setColor(hex, updatePickerState = true) {
    this.config.color = hex.toUpperCase();

    if (updatePickerState) {
      const [r, g, b] = hexToRgb(this.config.color);
      const [h, s, v] = rgbToHsv(r, g, b);
      if (s > 0.02) this.pickerState.h = h;
      this.pickerState.s = s;
      this.pickerState.v = v;
    }

    const hexInput = this.container.querySelector('#color-hex-text');
    if (hexInput && document.activeElement !== hexInput) {
      hexInput.value = this.config.color.replace('#', '');
    }

    const previewChip = this.container.querySelector('#color-preview-chip');
    if (previewChip) previewChip.style.backgroundColor = this.config.color;

    const indicator = this.container.querySelector('.custom-color-indicator');
    if (indicator) indicator.style.backgroundColor = this.config.color;

    this.updateColorPickerVisuals();
    this.updateActiveSwatches();
    this.emitChange();
  }

  updateColorPickerVisuals() {
    const gradientBox = this.container.querySelector('#color-picker-gradient-box');
    const gradHandle = this.container.querySelector('#color-picker-handle');
    const hueSlider = this.container.querySelector('#color-picker-hue-slider');
    const hueHandle = this.container.querySelector('#hue-slider-handle');

    if (gradientBox && gradHandle) {
      gradientBox.style.backgroundColor = `hsl(${this.pickerState.h}, 100%, 50%)`;
      const w = gradientBox.clientWidth || 220;
      const h = gradientBox.clientHeight || 140;

      const left = this.pickerState.s * w;
      const top = (1 - this.pickerState.v) * h;

      gradHandle.style.left = `${left}px`;
      gradHandle.style.top = `${top}px`;
      gradHandle.style.backgroundColor = this.config.color;
    }

    if (hueSlider && hueHandle) {
      const w = hueSlider.clientWidth || 220;
      const left = (this.pickerState.h / 360) * w;
      hueHandle.style.left = `${left}px`;
    }
  }

  bindSwatchClicks() {
    const allSwatches = this.container.querySelectorAll('.swatch-btn');
    allSwatches.forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex.toUpperCase();
        this.setColor(hex, true);
      });
    });
  }

  updateActiveSwatches() {
    const allSwatches = this.container.querySelectorAll('.swatch-btn');
    allSwatches.forEach(btn => {
      if (btn.dataset.hex.toUpperCase() === this.config.color.toUpperCase()) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const triggerBtn = this.container.querySelector('#btn-custom-color-trigger');
    if (triggerBtn) {
      if (this.isCustomColorActive()) {
        triggerBtn.classList.add('active');
      } else {
        triggerBtn.classList.remove('active');
      }
    }
  }

  /**
   * Updates recommended colors based on the loaded template image
   * @param {string[]} colors - Hex colors array
   */
  setRecommendedColors(colors) {
    if (!Array.isArray(colors) || colors.length === 0) return;
    this.recommendedColors = colors;

    const group = this.container.querySelector('#recommended-colors-group');
    const swatchesContainer = this.container.querySelector('#recommended-swatches-container');

    if (group && swatchesContainer) {
      group.style.display = 'block';
      swatchesContainer.innerHTML = this.renderRecommendedSwatchesHtml();
      this.bindSwatchClicks();
      this.updateActiveSwatches();
    }
  }

  emitChange() {
    if (typeof this.onChange === 'function') {
      this.onChange({ ...this.config });
    }
  }

  /**
   * Updates box dimensions and dynamically re-scales font-size step to 2% of box height
   * @param {number} newBoxNativeHeight 
   */
  updateBoxDimensions(newBoxNativeHeight) {
    if (!newBoxNativeHeight || newBoxNativeHeight <= 0) return;
    this.boxNativeHeight = newBoxNativeHeight;
    this.stepPx = Math.max(1, Math.round(this.boxNativeHeight * 0.02));

    const sizeInput = this.container.querySelector('#font-size-input');
    const btnDec = this.container.querySelector('#btn-font-size-dec');
    const btnInc = this.container.querySelector('#btn-font-size-inc');

    if (sizeInput) {
      sizeInput.step = this.stepPx;
    }
    if (btnDec) {
      btnDec.title = `Decrease font size by ${this.stepPx}px`;
    }
    if (btnInc) {
      btnInc.title = `Increase font size by ${this.stepPx}px`;
    }
  }

  updateValues(newConfig) {
    Object.assign(this.config, newConfig);
    if (newConfig.color) {
      const [r, g, b] = hexToRgb(newConfig.color);
      const [h, s, v] = rgbToHsv(r, g, b);
      if (s > 0.02) this.pickerState.h = h;
      this.pickerState.s = s;
      this.pickerState.v = v;
    }
    this.render();
  }
}
