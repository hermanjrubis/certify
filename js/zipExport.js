/**
 * Batch ZIP Export Module
 * Renders all certificates at full native resolution onto an offscreen canvas,
 * converts to PNG blobs, packages with JSZip using STORE compression, and triggers browser download.
 */

import { renderCertificate } from './certificateRenderer.js';
import { ensureFonts } from './fontLoader.js';
import { icons } from './icons.js';

/**
 * Cleans names for safe cross-platform file paths and resolves duplicates.
 *
 * @param {string} rawName
 * @param {Record<string, number>} counts
 * @returns {string} Safe unique filename (e.g. "Name.png" or "Name (2).png")
 */
export function sanitizeFilename(rawName, counts = {}) {
  let clean = (rawName || '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!clean) {
    clean = 'Certificate';
  }

  const baseKey = clean.toLowerCase();
  if (counts[baseKey]) {
    counts[baseKey]++;
    return `${clean} (${counts[baseKey]}).png`;
  } else {
    counts[baseKey] = 1;
    return `${clean}.png`;
  }
}

export class ZipExporter {
  constructor() {
    this.isCancelled = false;
    this.modalEl = null;
  }

  /**
   * Main export method
   *
   * @param {object} options
   * @param {HTMLImageElement} options.templateImg
   * @param {Array} options.layers
   * @param {Map|object} options.images
   * @param {Array<object>} options.rows
   * @param {string} options.nameColumn
   * @param {string} [options.zipFileName='certificates.zip']
   * @param {Function} [options.onComplete]
   * @param {Function} [options.onError]
   */
  async exportZip(options) {
    const {
      templateImg,
      layers = [],
      images = null,
      rows = [],
      nameColumn = 'Name',
      zipFileName = 'certificates.zip',
      onComplete,
      onError
    } = options;

    if (!rows || rows.length === 0) {
      if (onError) onError('Add at least one recipient before exporting.');
      return;
    }

    if (typeof window !== 'undefined' && !window.JSZip) {
      const msg = 'JSZip library is not loaded. Please ensure an active internet connection.';
      if (onError) onError(msg);
      return;
    }

    this.isCancelled = false;
    this.showProgressModal(rows.length);

    try {
      // Ensure all text layer fonts are loaded before canvas drawing
      const textFonts = layers.filter(l => l.type === 'text' && l.font).map(l => l.font);
      await ensureFonts(textFonts);

      const zip = new window.JSZip();
      const nameCounts = {};
      const total = rows.length;

      const naturalWidth = templateImg.naturalWidth || templateImg.width || 2000;
      const naturalHeight = templateImg.naturalHeight || templateImg.height || 1414;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = naturalWidth;
      offscreenCanvas.height = naturalHeight;
      const ctx = offscreenCanvas.getContext('2d');

      for (let i = 0; i < total; i++) {
        if (this.isCancelled) {
          this.closeModal();
          return;
        }

        const row = rows[i];
        const rawName = row[nameColumn] || Object.values(row)[0] || '';
        this.updateProgress(i + 1, total, rawName, 'Rendering');

        renderCertificate(
          ctx,
          { templateImg, layers, images },
          row,
          { width: naturalWidth, height: naturalHeight }
        );

        const blob = await new Promise((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          const filename = sanitizeFilename(rawName, nameCounts);
          zip.file(filename, blob);
        }

        // Non-blocking yield for UI responsiveness
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (this.isCancelled) {
        this.closeModal();
        return;
      }

      this.updatePackagingProgress(0);

      // STORE compression for PNGs (lossless PNGs are already compressed)
      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'STORE'
        },
        (metadata) => {
          if (!this.isCancelled) {
            this.updatePackagingProgress(metadata.percent);
          }
        }
      );

      if (this.isCancelled) {
        this.closeModal();
        return;
      }

      this.triggerDownload(zipBlob, zipFileName);
      this.showSuccessState();

      setTimeout(() => {
        this.closeModal();
        if (typeof onComplete === 'function') onComplete();
      }, 1200);

    } catch (err) {
      console.error('ZIP Export failed:', err);
      this.closeModal();
      if (typeof onError === 'function') {
        onError('An error occurred while generating the ZIP archive: ' + err.message);
      }
    }
  }

  showProgressModal(total) {
    this.closeModal();

    this.prevActiveElement = typeof document !== 'undefined' ? document.activeElement : null;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop active';
    this.modalEl.id = 'export-progress-modal';

    this.modalEl.innerHTML = `
      <div class="modal-card export-modal-card" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
        <div class="modal-header">
          <div class="export-header-title">
            <span class="export-icon-badge">${icons.zipArchive(20)}</span>
            <h3 class="modal-title" id="export-modal-title">Packaging Certificates</h3>
          </div>
        </div>

        <div class="export-modal-body">
          <div class="export-status-row">
            <span class="export-status-label" id="export-status-text">Starting generation...</span>
            <span class="export-percentage" id="export-percent-text">0%</span>
          </div>

          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="progress-fill" id="export-progress-bar" style="width: 0%;"></div>
          </div>

          <div class="export-current-name" id="export-current-name">
            Preparing canvas...
          </div>
        </div>

        <div class="export-modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-export">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    const cancelBtn = this.modalEl.querySelector('#btn-cancel-export');
    cancelBtn.addEventListener('click', () => {
      this.isCancelled = true;
      this.closeModal();
    });

    this.handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.isCancelled = true;
        this.closeModal();
      }
    };
    document.addEventListener('keydown', this.handleKeyDown);
    cancelBtn.focus();
  }

  updateProgress(current, total, name, stage = 'Rendering') {
    if (!this.modalEl) return;

    const percent = Math.round((current / total) * 90);
    const statusText = this.modalEl.querySelector('#export-status-text');
    const percentText = this.modalEl.querySelector('#export-percent-text');
    const progressBar = this.modalEl.querySelector('#export-progress-bar');
    const nameText = this.modalEl.querySelector('#export-current-name');

    if (statusText) statusText.textContent = `${stage} ${current} of ${total}…`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (nameText) nameText.textContent = `Certificate for: ${name}`;
  }

  updatePackagingProgress(zipPercent) {
    if (!this.modalEl) return;

    const overallPercent = 90 + Math.round((zipPercent / 100) * 10);
    const statusText = this.modalEl.querySelector('#export-status-text');
    const percentText = this.modalEl.querySelector('#export-percent-text');
    const progressBar = this.modalEl.querySelector('#export-progress-bar');
    const nameText = this.modalEl.querySelector('#export-current-name');

    if (statusText) statusText.textContent = 'Packaging ZIP archive…';
    if (percentText) percentText.textContent = `${Math.min(100, overallPercent)}%`;
    if (progressBar) progressBar.style.width = `${Math.min(100, overallPercent)}%`;
    if (nameText) nameText.textContent = 'Finalizing PNG files…';
  }

  showSuccessState() {
    if (!this.modalEl) return;

    const statusText = this.modalEl.querySelector('#export-status-text');
    const percentText = this.modalEl.querySelector('#export-percent-text');
    const progressBar = this.modalEl.querySelector('#export-progress-bar');
    const nameText = this.modalEl.querySelector('#export-current-name');

    if (statusText) statusText.textContent = 'Download started!';
    if (percentText) percentText.textContent = '100%';
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.classList.add('completed');
    }
    if (nameText) nameText.innerHTML = `${icons.check(16)} All certificates exported successfully.`;
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 15000);
  }

  closeModal() {
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.handleKeyDown = null;
    }
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    if (this.prevActiveElement && typeof this.prevActiveElement.focus === 'function') {
      this.prevActiveElement.focus();
      this.prevActiveElement = null;
    }
  }
}
