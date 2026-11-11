/**
 * Font Picker component.
 * Searchable popover / bottom-sheet with on-demand preview loading.
 */

import { FONT_CATEGORIES, FONT_CATALOG, getFont, searchFonts } from '../fonts/catalog.js';
import { loadFontFamily, loadFontPreview } from '../fontLoader.js';

const RECENT_KEY = 'certify.recentFonts';

function getRecentFonts() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecentFont(family) {
  try {
    const recent = getRecentFonts().filter(f => f !== family);
    recent.unshift(family);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 6)));
  } catch {}
}

// Preload standard defaults
if (typeof window !== 'undefined') {
  loadFontFamily('Great Vibes');
  loadFontFamily('EB Garamond');
}

let activePicker = null;

export function openFontPicker(anchorEl, { value, sampleText = '', onPick, onClose }) {
  if (activePicker) {
    activePicker.close();
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;
  const overlay = document.createElement('div');
  overlay.className = 'font-picker-overlay';

  const popover = document.createElement('div');
  popover.className = `font-picker-popover ${isMobile ? 'font-picker-bottom-sheet' : ''}`;
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Select font');

  // Positioning for desktop popover
  if (!isMobile && anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const width = 360;
    let left = rect.left;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }
    let top = rect.bottom + 6;
    if (top + 450 > window.innerHeight && rect.top > 450) {
      top = rect.top - 456;
    }
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  let selectedCategory = 'all';
  let searchQuery = '';
  let selectedFamily = value || 'Great Vibes';

  const previewSample = (sampleText && sampleText.trim() ? sampleText.trim() : 'Recipient Name')
    .replace(/\{[^}]+\}/g, 'Recipient Name');

  popover.innerHTML = `
    ${isMobile ? '<div class="font-picker-drag-handle" aria-hidden="true"></div>' : ''}
    <div class="font-picker-header">
      <input type="text" class="font-picker-search" placeholder="Search 122 fonts..." aria-label="Search fonts" />
      <button type="button" class="font-picker-close-btn" aria-label="Close font picker">&times;</button>
    </div>
    <div class="font-picker-chips-wrap">
      <div class="font-picker-chips" role="tablist" aria-label="Font categories">
        <button type="button" class="font-picker-chip active" data-cat="all">All</button>
        ${FONT_CATEGORIES.map(c => `
          <button type="button" class="font-picker-chip" data-cat="${c.id}">${c.label}</button>
        `).join('')}
      </div>
    </div>
    <div class="font-picker-list" role="listbox" id="font-picker-listbox"></div>
  `;

  overlay.appendChild(popover);
  document.body.appendChild(overlay);

  const searchInput = popover.querySelector('.font-picker-search');
  const closeBtn = popover.querySelector('.font-picker-close-btn');
  const chipsContainer = popover.querySelector('.font-picker-chips');
  const listbox = popover.querySelector('#font-picker-listbox');

  const activeInitialChip = chipsContainer.querySelector('.font-picker-chip.active');
  if (activeInitialChip && typeof activeInitialChip.scrollIntoView === 'function') {
    activeInitialChip.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  let observer = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const family = entry.target.getAttribute('data-family');
          if (family) {
            loadFontPreview(family, previewSample || family);
          }
          observer.unobserve(entry.target);
        }
      }
    }, { root: listbox, rootMargin: '200px' });
  }

  function renderList() {
    if (observer) observer.disconnect();
    listbox.innerHTML = '';

    const recent = getRecentFonts();
    const matches = searchFonts(searchQuery, selectedCategory);

    // Show Recently used section if on 'all' without search and recent exists
    if (!searchQuery && selectedCategory === 'all' && recent.length > 0) {
      const recentHeader = document.createElement('div');
      recentHeader.className = 'font-picker-section-title';
      recentHeader.textContent = 'Recently used';
      listbox.appendChild(recentHeader);

      for (const fam of recent) {
        const font = getFont(fam);
        const item = createFontOption(font);
        listbox.appendChild(item);
      }

      const allHeader = document.createElement('div');
      allHeader.className = 'font-picker-section-title';
      allHeader.textContent = 'All fonts';
      listbox.appendChild(allHeader);
    }

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'font-picker-empty';
      empty.textContent = 'No fonts found';
      listbox.appendChild(empty);
      return;
    }

    for (const font of matches) {
      const item = createFontOption(font);
      listbox.appendChild(item);
    }
  }

  function createFontOption(font) {
    const isSelected = font.family.toLowerCase() === selectedFamily.toLowerCase();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `font-picker-item ${isSelected ? 'selected' : ''}`;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    btn.setAttribute('data-family', font.family);

    const preview = previewSample || font.family;
    const catLabel = FONT_CATEGORIES.find(c => c.id === font.category)?.label || font.category || '';

    btn.innerHTML = `
      <div class="font-picker-item-main">
        <div class="font-picker-sample" style="font-family: '${font.family}', serif; font-weight: ${font.weight || 400};">
          ${escapeHtml(preview)}
        </div>
        <div class="font-picker-sub">
          <span class="font-picker-family-name">${escapeHtml(font.family)}</span>
          <span class="font-picker-group-name">${escapeHtml(catLabel)}</span>
        </div>
      </div>
      ${isSelected ? '<span class="font-picker-check" aria-hidden="true">✓</span>' : ''}
    `;

    btn.addEventListener('click', async () => {
      selectedFamily = font.family;
      saveRecentFont(font.family);
      await loadFontFamily(font.family);
      if (onPick) onPick(font.family);
      close();
    });

    if (observer) {
      observer.observe(btn);
    } else {
      loadFontPreview(font.family, previewSample || font.family);
    }

    return btn;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function close() {
    if (observer) observer.disconnect();
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    activePicker = null;
    if (onClose) onClose();
    if (anchorEl && typeof anchorEl.focus === 'function') {
      anchorEl.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    const items = Array.from(listbox.querySelectorAll('.font-picker-item'));
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex].focus();
    } else if (e.key === 'Enter') {
      if (currentIndex !== -1) {
        e.preventDefault();
        items[currentIndex].click();
      }
    }
  }

  // Event bindings
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  chipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.font-picker-chip');
    if (!chip) return;
    chipsContainer.querySelectorAll('.font-picker-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedCategory = chip.getAttribute('data-cat') || 'all';
    renderList();
    if (typeof chip.scrollIntoView === 'function') {
      chip.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', handleKeyDown);

  renderList();
  setTimeout(() => searchInput.focus(), 50);

  activePicker = { close };
  return activePicker;
}

