/**
 * Names List Input Component
 * Handles textarea parsing, whitespace trimming, live name counts,
 * sample roster loading, and clear action.
 */

import { icons } from './icons.js';

export const SAMPLE_ROSTER = [
  'Jade Cataya',
  'Miguel Santos',
  'Ana Dela Cruz',
  'Paolo Villanueva',
  'Carla Mendoza',
  'Ethan Montgomery',
  'Sophia Chen-Williams',
  'Dr. Alexander Bartholomew III'
];

export class NamesInput {
  /**
   * @param {HTMLElement} containerEl 
   * @param {string[]} initialNames 
   * @param {object} callbacks 
   * @param {Function} callbacks.onNamesChange - (names: string[]) => void
   * @param {Function} callbacks.onGeneratePreviews - () => void
   */
  constructor(containerEl, initialNames = [], callbacks = {}) {
    this.container = containerEl;
    this.names = Array.isArray(initialNames) ? initialNames : [];
    this.callbacks = callbacks;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="names-panel">
        <div class="names-panel-header">
          <div class="section-label">NAMES LIST</div>
          <div class="names-actions-header">
            <button type="button" class="btn-text-action" id="btn-load-sample" title="Insert sample student roster">
              Load sample
            </button>
            <button type="button" class="btn-text-action btn-text-danger" id="btn-clear-names" title="Clear all names">
              Clear
            </button>
          </div>
        </div>

        <div class="textarea-wrapper">
          <textarea 
            id="names-textarea" 
            class="textarea names-textarea" 
            placeholder="Paste your recipient names here, one per line..."
            rows="7"
            spellcheck="false"
          >${this.names.join('\n')}</textarea>
        </div>

        <div class="names-footer">
          <span class="names-count-label" id="names-count-text">
            ${this.names.length} ${this.names.length === 1 ? 'name' : 'names'} loaded
          </span>
        </div>

        <div class="names-cta-group">
          <button type="button" class="btn btn-mint btn-generate-previews" id="btn-generate-previews">
            Generate previews
          </button>
        </div>

        <!-- Mini Preview Ribbon Container (3 thumbnails as seen in mockup) -->
        <div class="mini-previews-section" id="mini-previews-container" style="display: none;">
          <div class="mini-previews-ribbon" id="mini-previews-ribbon"></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.textarea = this.container.querySelector('#names-textarea');
    this.countText = this.container.querySelector('#names-count-text');
    this.generateBtn = this.container.querySelector('#btn-generate-previews');
    this.clearBtn = this.container.querySelector('#btn-clear-names');
    this.sampleBtn = this.container.querySelector('#btn-load-sample');

    // Textarea input event
    this.textarea.addEventListener('input', () => {
      this.parseAndUpdate();
    });

    // Generate Previews click
    this.generateBtn.addEventListener('click', () => {
      if (typeof this.callbacks.onGeneratePreviews === 'function') {
        this.callbacks.onGeneratePreviews();
      }
    });

    // Clear names
    this.clearBtn.addEventListener('click', () => {
      if (this.textarea.value.trim().length > 0) {
        this.showClearConfirmModal();
      }
    });

    // Sample names
    this.sampleBtn.addEventListener('click', () => {
      this.textarea.value = SAMPLE_ROSTER.join('\n');
      this.parseAndUpdate();
    });
  }

  parseAndUpdate() {
    const raw = this.textarea.value;
    const lines = raw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    this.names = lines;
    this.countText.textContent = `${lines.length} ${lines.length === 1 ? 'name' : 'names'} loaded`;

    if (typeof this.callbacks.onNamesChange === 'function') {
      this.callbacks.onNamesChange(this.names);
    }
  }

  getNames() {
    return [...this.names];
  }

  setNames(namesList) {
    this.names = Array.isArray(namesList) ? namesList : [];
    if (this.textarea) {
      this.textarea.value = this.names.join('\n');
      this.countText.textContent = `${this.names.length} ${this.names.length === 1 ? 'name' : 'names'} loaded`;
    }
  }

  /**
   * Updates the mini preview strip below the generate button
   * @param {HTMLCanvasElement[]} miniCanvases 
   */
  updateMiniPreviews(miniCanvases) {
    const section = this.container.querySelector('#mini-previews-section');
    const ribbon = this.container.querySelector('#mini-previews-ribbon');
    if (!section || !ribbon) return;

    if (!miniCanvases || miniCanvases.length === 0) {
      section.style.display = 'none';
      ribbon.innerHTML = '';
      return;
    }

    section.style.display = 'block';
    ribbon.innerHTML = '';

    // Show up to 3 thumbnails as seen in the reference mockup
    miniCanvases.slice(0, 3).forEach(canvas => {
      const card = document.createElement('div');
      card.className = 'mini-preview-card';
      card.appendChild(canvas);
      ribbon.appendChild(card);
    });
  }

  showClearConfirmModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.id = 'clear-names-modal';

    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 440px;" role="dialog" aria-labelledby="clear-modal-title">
        <div class="modal-header">
          <h3 class="modal-title" id="clear-modal-title">Clear recipient list?</h3>
          <button type="button" class="modal-close" id="btn-close-clear-modal" aria-label="Close dialog">
            ${icons.close(18)}
          </button>
        </div>
        <div style="margin-bottom: 1.5rem; font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.5;">
          This will remove all recipient names from the editor. You can paste a new list anytime.
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-clear">Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" id="btn-confirm-clear">Clear names</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();

    backdrop.querySelector('#btn-close-clear-modal').addEventListener('click', close);
    backdrop.querySelector('#btn-cancel-clear').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('#btn-confirm-clear').addEventListener('click', () => {
      close();
      this.textarea.value = '';
      this.parseAndUpdate();
    });
  }
}
