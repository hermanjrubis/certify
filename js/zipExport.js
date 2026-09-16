/**
 * Batch ZIP Export Module
 * Renders all certificates at full native resolution onto an offscreen canvas,
 * converts to PNG blobs, packages with JSZip, and triggers browser download.
 */

import { renderCertificate } from './certificateRenderer.js';
import { icons } from './icons.js';

export class ZipExporter {
  constructor() {
    this.isCancelled = false;
    this.modalEl = null;
  }

  /**
   * Cleans names for safe cross-platform file paths and resolves duplicates.
   * 
   * @param {string} rawName 
   * @param {Record<string, number>} nameCounts 
   * @returns {string} Safe unique filename
   */
  sanitizeFilename(rawName, nameCounts) {
    let clean = (rawName || '')
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      clean = 'Certificate';
    }

    const count = (nameCounts[clean] || 0) + 1;
    nameCounts[clean] = count;

    if (count > 1) {
      return `${clean} (${count}).png`;
    }
    return `${clean}.png`;
  }

  /**
   * Main export method
   * 
   * @param {object} options
   * @param {HTMLImageElement} options.templateImg
   * @param {object} options.textField
   * @param {string[]} options.names
   * @param {string} [options.zipFileName='certificates.zip']
   * @param {Function} [options.onComplete]
   * @param {Function} [options.onError]
   */
  async exportZip(options) {
    const {
      templateImg,
      textField,
      names,
      zipFileName = 'certificates.zip',
      onComplete,
      onError
    } = options;

    if (!window.JSZip) {
      const msg = 'JSZip library is not loaded. Please ensure an active internet connection.';
      if (onError) onError(msg);
      return;
    }

    if (!names || names.length === 0) {
      if (onError) onError('No recipient names provided to export.');
      return;
    }

    this.isCancelled = false;
    this.showProgressModal(names.length);

    try {
      const zip = new window.JSZip();
      const nameCounts = {};
      const total = names.length;

      // Offscreen canvas at full native resolution
      const naturalWidth = templateImg.naturalWidth;
      const naturalHeight = templateImg.naturalHeight;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = naturalWidth;
      offscreenCanvas.height = naturalHeight;
      const ctx = offscreenCanvas.getContext('2d');

      // Ensure web fonts are fully ready before starting canvas rendering
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Render certificates loop with non-blocking yields
      for (let i = 0; i < total; i++) {
        if (this.isCancelled) {
          this.closeModal();
          return;
        }

        const name = names[i];
        this.updateProgress(i + 1, total, name, 'Rendering');

        // Draw certificate at full native resolution
        renderCertificate(ctx, templateImg, textField, name, naturalWidth, naturalHeight, naturalHeight);

        // Convert canvas to PNG blob
        const blob = await new Promise((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          const filename = this.sanitizeFilename(name, nameCounts);
          zip.file(filename, blob);
        }

        // Yield to browser thread to keep UI interactive and responsive
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (this.isCancelled) {
        this.closeModal();
        return;
      }

      // Packaging phase
      this.updatePackagingProgress(0);

      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 4 }
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

      // Trigger download
      this.triggerDownload(zipBlob, zipFileName);

      this.showSuccessState();
      setTimeout(() => {
        this.closeModal();
        if (typeof onComplete === 'function') onComplete();
      }, 1400);

    } catch (err) {
      console.error('ZIP Export failed:', err);
      this.closeModal();
      if (typeof onError === 'function') {
        onError('An error occurred while generating the ZIP archive: ' + err.message);
      }
    }
  }

  showProgressModal(total) {
    // Remove existing if any
    this.closeModal();

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop active';
    this.modalEl.id = 'export-progress-modal';

    this.modalEl.innerHTML = `
      <div class="modal-card export-modal-card" role="dialog" aria-labelledby="export-modal-title">
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
  }

  updateProgress(current, total, name, stage = 'Rendering') {
    if (!this.modalEl) return;

    const percent = Math.round((current / total) * 90); // 0-90% is rendering
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

    if (statusText) statusText.textContent = 'Compressing into ZIP archive…';
    if (percentText) percentText.textContent = `${Math.min(100, overallPercent)}%`;
    if (progressBar) progressBar.style.width = `${Math.min(100, overallPercent)}%`;
    if (nameText) nameText.textContent = 'Finalizing lossless PNG files…';
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
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
