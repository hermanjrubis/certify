/**
 * Review & Export Screen Component.
 * Grid of all certificates, search/filtering, chunked rendering, full-size modal, and ZIP download.
 */

import { createPreviewCanvas, renderCertificate } from '../certificateRenderer.js';
import { detectNameColumn, resolveText } from '../model/recipients.js';
import { sanitizeFilename } from '../zipExport.js';

function slugify(text) {
  return (text || 'certify-batch')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'certificates';
}

function normalizeStr(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function renderReviewView(el, { project, images, onBack, onDownload }) {
  if (!el) return;

  const rows = project.recipients?.rows || [];
  const totalCount = rows.length;
  const nameCol = detectNameColumn(project.recipients?.columns || ['Name']);
  const tplW = project.template?.width || 2000;
  const tplH = project.template?.height || 1414;
  const zipName = `${slugify(project.title)}.zip`;
  const firstSampleName = rows[0] ? (rows[0][nameCol] || 'Certificate') : 'Certificate';
  const samplePngName = sanitizeFilename(firstSampleName, {});

  // Compute reports for all rows
  const cardData = rows.map((row, index) => {
    const { canvas, report } = createPreviewCanvas(project, images, row, 360);
    const hasShrunk = report.some(r => r.worthALook);
    const rawName = row[nameCol] || Object.values(row)[0] || `Certificate ${index + 1}`;
    return {
      index,
      row,
      canvas,
      rawName,
      worthALook: hasShrunk
    };
  });

  const worthALookCount = cardData.filter(c => c.worthALook).length;
  let activeFilter = 'all'; // 'all' | 'worth-a-look'
  let searchQuery = '';
  let renderToken = 0;

  el.innerHTML = `
    <div class="review-view-container">
      <div class="review-main-content">
        <!-- Header Bar -->
        <div class="review-header-bar">
          <div class="review-title-group">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-review-back">
              ← Back to Editor
            </button>
            <h2 class="review-title">${totalCount} certificates ready</h2>
          </div>

          <div class="review-filters-group">
            <div class="segmented-control" id="review-filter-control">
              <button type="button" class="segment-btn active" data-filter="all">All ${totalCount}</button>
              <button type="button" class="segment-btn" data-filter="worth-a-look">Worth a look · ${worthALookCount}</button>
            </div>

            <div class="search-input-wrapper">
              <input type="text" class="input review-search-input" id="review-search-input" placeholder="Search by name…" aria-label="Search certificates" />
            </div>
          </div>
        </div>

        <!-- Cards Grid -->
        <div class="review-grid" id="review-cards-grid" role="region" aria-label="Certificates grid"></div>
      </div>

      <!-- Side Summary Card -->
      <aside class="review-side-card">
        <div class="side-card-header">
          <h3 class="side-card-title">Download ZIP</h3>
        </div>
        <div class="side-card-details">
          <div class="detail-row">
            <span class="detail-label">File name</span>
            <span class="detail-value mono">${escapeHtml(zipName)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Certificates</span>
            <span class="detail-value">${totalCount} PNG files</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dimensions</span>
            <span class="detail-value">${tplW} × ${tplH} px</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Naming pattern</span>
            <span class="detail-value">${escapeHtml(samplePngName)}</span>
          </div>
        </div>

        <button type="button" class="btn btn-primary btn-full-width btn-download-zip" id="btn-download-zip-action" ${totalCount === 0 ? 'disabled' : ''}>
          Download ZIP
        </button>

        <p class="privacy-guarantee-note">
          <span class="privacy-check-icon">✓</span> Made on your device. Nothing is uploaded.
        </p>
      </aside>
    </div>
  `;

  const cardsGrid = el.querySelector('#review-cards-grid');
  const btnBack = el.querySelector('#btn-review-back');
  const btnDownload = el.querySelector('#btn-download-zip-action');
  const filterControl = el.querySelector('#review-filter-control');
  const searchInput = el.querySelector('#review-search-input');

  if (btnBack && onBack) btnBack.addEventListener('click', onBack);
  if (btnDownload && onDownload) btnDownload.addEventListener('click', onDownload);

  function getFilteredCards() {
    return cardData.filter(item => {
      if (activeFilter === 'worth-a-look' && !item.worthALook) return false;
      if (searchQuery) {
        const norm = normalizeStr(item.rawName);
        if (!norm.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderGridChunked() {
    renderToken++;
    const currentToken = renderToken;
    cardsGrid.innerHTML = '';

    const filtered = getFilteredCards();
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'review-empty-state';
      empty.textContent = activeFilter === 'worth-a-look' 
        ? 'No certificates need a look! All names fit comfortably.' 
        : 'No certificates match your search.';
      cardsGrid.appendChild(empty);
      return;
    }

    let nextIndex = 0;
    const chunkSize = 12;

    function renderNextBatch() {
      if (currentToken !== renderToken) return;

      const limit = Math.min(nextIndex + chunkSize, filtered.length);
      const fragment = document.createDocumentFragment();

      for (let i = nextIndex; i < limit; i++) {
        const item = filtered[i];
        const card = createCardElement(item);
        fragment.appendChild(card);
      }

      cardsGrid.appendChild(fragment);
      nextIndex = limit;

      if (nextIndex < filtered.length) {
        requestAnimationFrame(renderNextBatch);
      }
    }

    renderNextBatch();
  }

  function createCardElement(item) {
    const card = document.createElement('div');
    card.className = 'review-cert-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View certificate for ${item.rawName}`);

    const thumbBox = document.createElement('div');
    thumbBox.className = 'review-card-thumb';
    if (item.canvas) {
      thumbBox.appendChild(item.canvas);
    }

    const metaBox = document.createElement('div');
    metaBox.className = 'review-card-meta';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'review-card-name';
    nameSpan.textContent = item.rawName;
    metaBox.appendChild(nameSpan);

    if (item.worthALook) {
      const badge = document.createElement('span');
      badge.className = 'review-shrunk-badge';
      badge.textContent = 'Shrunk';
      badge.title = 'Text scaled down to fit';
      metaBox.appendChild(badge);
    }

    card.appendChild(thumbBox);
    card.appendChild(metaBox);

    card.addEventListener('click', () => {
      openFullSizeModal(project, images, item.row, item.rawName);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFullSizeModal(project, images, item.row, item.rawName);
      }
    });

    return card;
  }

  filterControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;
    filterControl.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderGridChunked();
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = normalizeStr(e.target.value);
    renderGridChunked();
  });

  renderGridChunked();
}

function openFullSizeModal(project, images, row, rawName) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active fullsize-modal-backdrop';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Full-size preview for ${rawName}`);

  const card = document.createElement('div');
  card.className = 'modal-card fullsize-modal-card';

  const tplW = project.template?.width || 2000;
  const tplH = project.template?.height || 1414;
  const aspect = tplW / tplH;

  const displayW = Math.min(1000, window.innerWidth - 64);
  const displayH = Math.round(displayW / aspect);

  const canvas = document.createElement('canvas');
  canvas.width = displayW;
  canvas.height = displayH;
  const ctx = canvas.getContext('2d');
  const templateImg = images ? (images.get ? images.get('template') : images.template) : null;

  renderCertificate(
    ctx,
    { templateImg, layers: project.layers, images },
    row,
    { width: displayW, height: displayH }
  );

  card.innerHTML = `
    <div class="fullsize-modal-header">
      <h3 class="fullsize-title">${escapeHtml(rawName)}</h3>
      <div class="fullsize-actions">
        <button type="button" class="btn btn-primary btn-sm" id="btn-download-single-png">
          Download PNG
        </button>
        <button type="button" class="btn-icon btn-sm" id="btn-close-fullsize" aria-label="Close preview">
          &times;
        </button>
      </div>
    </div>
    <div class="fullsize-canvas-container"></div>
  `;

  card.querySelector('.fullsize-canvas-container').appendChild(canvas);
  modal.appendChild(card);
  document.body.appendChild(modal);

  const prevActiveElement = document.activeElement;
  const btnClose = card.querySelector('#btn-close-fullsize');
  const btnDownload = card.querySelector('#btn-download-single-png');

  function closeModal() {
    document.removeEventListener('keydown', handleKeyDown);
    if (modal.parentNode) modal.parentNode.removeChild(modal);
    if (prevActiveElement && typeof prevActiveElement.focus === 'function') {
      prevActiveElement.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      const focusable = [btnDownload, btnClose];
      if (e.shiftKey && document.activeElement === focusable[0]) {
        e.preventDefault();
        focusable[1].focus();
      } else if (!e.shiftKey && document.activeElement === focusable[1]) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  if (btnClose) btnClose.focus();

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  btnClose.addEventListener('click', closeModal);

  btnDownload.addEventListener('click', () => {
    // Render full native resolution canvas for export
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = tplW;
    fullCanvas.height = tplH;
    const fullCtx = fullCanvas.getContext('2d');
    renderCertificate(fullCtx, { templateImg, layers: project.layers, images }, row, { width: tplW, height: tplH });

    fullCanvas.toBlob((blob) => {
      if (!blob) return;
      const filename = sanitizeFilename(rawName, {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  });

  document.addEventListener('keydown', handleKeyDown);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
