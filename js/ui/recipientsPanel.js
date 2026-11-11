/**
 * Recipients Panel Component.
 * Supports Paste list and CSV Import, data validation checks, and table preview.
 */

import {
  parseNameList,
  parseCSV,
  detectNameColumn,
  findDuplicates,
  findBlankRows,
  findMissingTokens,
  longestRowIndex
} from '../model/recipients.js';
import { showConfirmDialog } from './confirmDialog.js';

export const SAMPLE_ROWS = [
  { Name: 'Jade Cataya', Course: 'UI/UX Design', Date: 'March 2026' },
  { Name: 'Miguel Santos', Course: 'Web Development', Date: 'March 2026' },
  { Name: 'Ana Dela Cruz', Course: 'Graphic Design', Date: 'March 2026' },
  { Name: 'Paolo Villanueva', Course: 'Data Science', Date: 'March 2026' },
  { Name: 'Carla Mendoza', Course: 'Project Management', Date: 'March 2026' },
  { Name: 'Ethan Montgomery', Course: 'Cybersecurity', Date: 'March 2026' },
  { Name: 'Sophia Chen-Williams', Course: 'Digital Marketing', Date: 'March 2026' },
  { Name: 'Dr. Alexander Bartholomew III', Course: 'Artificial Intelligence', Date: 'March 2026' }
];

export function renderRecipientsPanel(el, recipients, {
  layers = [],
  reports = [],
  currentRow = 0,
  onChange,
  onShowRow,
  onReviewClick
}) {
  if (!el) return;

  const currentTab = recipients.source === 'csv' ? 'csv' : 'paste';
  const rowCount = recipients.rows.length;
  const nameCol = detectNameColumn(recipients.columns);

  el.innerHTML = `
    <div class="recipients-panel-container">
      <div class="recipients-panel-header">
        <span class="section-label">Recipients (${rowCount})</span>
        <div class="recipients-header-actions">
          <button type="button" class="btn-text-action" id="btn-load-sample" title="Load 8 sample test recipients">Sample</button>
          <button type="button" class="btn-text-action btn-text-danger" id="btn-clear-recipients" title="Clear all recipients">Clear</button>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="recipients-tabs" role="tablist">
        <button type="button" class="tab-btn ${currentTab === 'paste' ? 'active' : ''}" data-tab="paste" role="tab" aria-selected="${currentTab === 'paste'}">
          Paste list
        </button>
        <button type="button" class="tab-btn ${currentTab === 'csv' ? 'active' : ''}" data-tab="csv" role="tab" aria-selected="${currentTab === 'csv'}">
          Import CSV
        </button>
      </div>

      <!-- Tab 1: Paste List -->
      <div class="tab-content" id="tab-paste-content" style="${currentTab === 'paste' ? '' : 'display: none;'}">
        <textarea 
          class="recipients-textarea" 
          id="paste-textarea" 
          placeholder="Paste names here, one per line (or spreadsheet table)..."
          rows="5"
        >${currentTab === 'paste' ? recipients.rows.map(r => r.Name || Object.values(r)[0] || '').join('\n') : ''}</textarea>
      </div>

      <!-- Tab 2: Import CSV -->
      <div class="tab-content" id="tab-csv-content" style="${currentTab === 'csv' ? '' : 'display: none;'}">
        <div class="csv-import-box">
          ${recipients.fileName ? `
            <div class="csv-file-info">
              <span class="csv-file-name">📄 ${escapeHtml(recipients.fileName)}</span>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-replace-csv">Replace CSV</button>
            </div>
          ` : `
            <div class="csv-drop-area" id="csv-drop-area">
              <p class="csv-drop-text">Upload spreadsheet CSV (up to 5MB)</p>
              <button type="button" class="btn btn-sm btn-secondary" id="btn-browse-csv">Browse CSV</button>
            </div>
          `}
          <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display: none;" />
        </div>
      </div>

      <!-- Table Preview -->
      <div class="table-preview-section">
        <div class="columns-header-row">
          <span class="columns-label">Columns:</span>
          <div class="columns-chips">
            ${recipients.columns.map(c => `
              <span class="column-pill">${escapeHtml(c)}</span>
            `).join('')}
          </div>
        </div>

        <div class="recipients-table-wrapper" id="table-preview-wrapper"></div>
      </div>

      <!-- Checks & Warnings -->
      <div class="checks-list-section" id="checks-list-container"></div>

      <!-- Bottom Review Action -->
      <div class="recipients-footer">
        <button type="button" class="btn btn-primary btn-full-width" id="btn-review-certificates" ${rowCount === 0 ? 'disabled' : ''}>
          Review all ${rowCount} certificates
        </button>
      </div>
    </div>
  `;

  // Render Table Preview with textContent for security
  renderTablePreview(el.querySelector('#table-preview-wrapper'), recipients, currentRow, onShowRow);

  // Render Data Checks
  renderChecksList(el.querySelector('#checks-list-container'), recipients, layers, reports, onShowRow);

  bindEvents(el, recipients, { onChange, onShowRow, onReviewClick });
}

function renderTablePreview(container, recipients, currentRow, onShowRow) {
  if (!container) return;
  container.innerHTML = '';

  if (recipients.rows.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.className = 'table-empty-text';
    emptyP.textContent = 'No recipients yet. Paste names or import a CSV.';
    container.appendChild(emptyP);
    return;
  }

  const table = document.createElement('table');
  table.className = 'recipients-preview-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const thIdx = document.createElement('th');
  thIdx.textContent = '#';
  trHead.appendChild(thIdx);

  for (const col of recipients.columns) {
    const th = document.createElement('th');
    th.textContent = col;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const displayLimit = 5;
  const rowsToShow = recipients.rows.slice(0, displayLimit);

  rowsToShow.forEach((row, i) => {
    const tr = document.createElement('tr');
    if (i === currentRow) tr.className = 'current-row';

    tr.addEventListener('click', () => {
      if (onShowRow) onShowRow(i);
    });

    const tdIdx = document.createElement('td');
    tdIdx.className = 'row-index-cell';
    tdIdx.textContent = String(i + 1);
    tr.appendChild(tdIdx);

    for (const col of recipients.columns) {
      const td = document.createElement('td');
      td.textContent = row[col] || '';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  if (recipients.rows.length > displayLimit) {
    const moreP = document.createElement('div');
    moreP.className = 'table-more-hint';
    moreP.textContent = `+ ${recipients.rows.length - displayLimit} more rows`;
    container.appendChild(moreP);
  }
}

function renderChecksList(container, recipients, layers, reports, onShowRow) {
  if (!container) return;
  container.innerHTML = '';

  const rows = recipients.rows;
  if (rows.length === 0) return;

  const ul = document.createElement('ul');
  ul.className = 'checks-list';

  const nameCol = detectNameColumn(recipients.columns);

  // 1. Check if any text layer uses the name column
  const nameUsed = layers.some(l => l.type === 'text' && new RegExp(`\\{${nameCol}\\}`, 'i').test(l.text || ''));
  if (!nameUsed) {
    const li = document.createElement('li');
    li.className = 'check-item check-warn';
    li.textContent = `⚠ No text uses your ${nameCol} column`;
    ul.appendChild(li);
  }

  // 2. Check duplicates
  const duplicates = findDuplicates(rows, nameCol);
  if (duplicates.length > 0) {
    const li = document.createElement('li');
    li.className = 'check-item check-warn';
    li.textContent = `⚠ ${duplicates.length} duplicate name${duplicates.length > 1 ? 's' : ''} found (${duplicates[0]})`;
    ul.appendChild(li);
  } else {
    const li = document.createElement('li');
    li.className = 'check-item check-ok';
    li.textContent = '✓ No duplicate names';
    ul.appendChild(li);
  }

  // 3. Check blanks
  const blanks = findBlankRows(rows, nameCol);
  if (blanks.length > 0) {
    const li = document.createElement('li');
    li.className = 'check-item check-warn';
    const humanIndices = blanks.map(b => b + 1).slice(0, 3).join(', ');
    li.textContent = `⚠ Row(s) ${humanIndices}: blank ${nameCol}`;
    ul.appendChild(li);
  } else {
    const li = document.createElement('li');
    li.className = 'check-item check-ok';
    li.textContent = `✓ No blank ${nameCol}s`;
    ul.appendChild(li);
  }

  // 4. Missing tokens
  const missing = findMissingTokens(layers, recipients.columns);
  if (missing.length > 0) {
    const li = document.createElement('li');
    li.className = 'check-item check-warn';
    li.textContent = `⚠ Missing column: {${missing.join('}, {')}}`;
    ul.appendChild(li);
  }

  // 5. Long names shrinking
  const shrinkCount = (reports || []).filter(r => r.worthALook).length;
  if (shrinkCount > 0) {
    const li = document.createElement('li');
    li.className = 'check-item check-warn';
    li.innerHTML = `⚠ ${shrinkCount} long name${shrinkCount > 1 ? 's' : ''} will shrink · <button type="button" class="check-link-btn" id="btn-show-longest">Show it</button>`;
    const btnShow = li.querySelector('#btn-show-longest');
    btnShow.addEventListener('click', () => {
      const idx = longestRowIndex(rows, layers);
      if (idx !== -1 && onShowRow) onShowRow(idx);
    });
    ul.appendChild(li);
  }

  container.appendChild(ul);
}

function bindEvents(el, recipients, { onChange, onShowRow, onReviewClick }) {
  // Tabs
  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const pasteContent = el.querySelector('#tab-paste-content');
      const csvContent = el.querySelector('#tab-csv-content');
      if (tab === 'paste') {
        pasteContent.style.display = 'block';
        csvContent.style.display = 'none';
      } else {
        pasteContent.style.display = 'none';
        csvContent.style.display = 'block';
      }
    });
  });

  // Paste Textarea (debounced 250ms)
  const textarea = el.querySelector('#paste-textarea');
  if (textarea) {
    let timer = null;
    textarea.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const text = e.target.value;
        const parsed = parseNameList(text);
        if (onChange) {
          onChange({
            columns: parsed.columns,
            rows: parsed.rows,
            source: 'paste',
            fileName: null
          });
        }
      }, 250);
    });
  }

  // CSV file input
  const fileInput = el.querySelector('#csv-file-input');
  const btnBrowse = el.querySelector('#btn-browse-csv');
  const btnReplace = el.querySelector('#btn-replace-csv');

  function openCsvDialog() {
    if (fileInput) fileInput.click();
  }
  if (btnBrowse) btnBrowse.addEventListener('click', openCsvDialog);
  if (btnReplace) btnReplace.addEventListener('click', openCsvDialog);

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('CSV file exceeds 5MB limit.');
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        if (onChange) {
          onChange({
            columns: parsed.columns,
            rows: parsed.rows,
            source: 'csv',
            fileName: file.name
          });
        }
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Sample and Clear
  const btnSample = el.querySelector('#btn-load-sample');
  if (btnSample) {
    btnSample.addEventListener('click', () => {
      if (onChange) {
        onChange({
          columns: ['Name', 'Course', 'Date'],
          rows: SAMPLE_ROWS,
          source: 'paste',
          fileName: null
        });
      }
    });
  }

  const btnClear = el.querySelector('#btn-clear-recipients');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (recipients.rows.length === 0) return;
      const ok = await showConfirmDialog({
        title: 'Clear recipients?',
        message: 'This will remove all current recipient names and table data.',
        confirmLabel: 'Clear all',
        cancelLabel: 'Keep recipients',
        danger: true
      });
      if (ok && onChange) {
        onChange({
          columns: ['Name'],
          rows: [],
          source: 'paste',
          fileName: null
        });
      }
    });
  }

  // Bottom review button
  const btnReview = el.querySelector('#btn-review-certificates');
  if (btnReview && onReviewClick) {
    btnReview.addEventListener('click', onReviewClick);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
