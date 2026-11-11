/**
 * Layers List Component.
 * Displays layers ordered front-to-back (reverse of internal drawing order).
 */

export function renderLayersPanel(el, layers = [], selectedId = null, { onSelect, missingNameColumn = null, onAddNameField } = {}) {
  if (!el) return;

  const reversed = [...layers].reverse();

  el.innerHTML = `
    <div class="layers-panel-container">
      <div class="layers-panel-header">
        <span class="section-label">Layers (${layers.length})</span>
      </div>
      ${missingNameColumn ? `
        <div class="name-field-callout" role="note">
          <p class="name-field-callout-text">No text prints your <strong>${escapeHtml(missingNameColumn)}</strong> column, so every certificate will come out without a name.</p>
          <button type="button" class="name-field-callout-btn" id="btn-add-name-field">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v2a1.5 1.5 0 0 1-3 0V7h-3.5v10H15a1.5 1.5 0 0 1 0 3H9a1.5 1.5 0 0 1 0-3h1.5V7H7v.5a1.5 1.5 0 0 1-3 0v-2z"/></svg>
            Add name field
          </button>
        </div>` : ''}
      ${layers.length === 0 && !missingNameColumn ? `
        <p class="layers-empty-hint">No layers yet. Add text, an image or a shape from the toolbar.</p>` : ''}
      <div class="layers-list" role="listbox" aria-label="Project layers">
        ${reversed.map(layer => {
          const isSelected = layer.id === selectedId;
          let badge = 'T';
          let badgeClass = 'badge-text';
          if (layer.type === 'image') {
            badge = 'IMG';
            badgeClass = 'badge-image';
          } else if (layer.type === 'shape') {
            badgeClass = 'badge-shape';
            if (layer.shape === 'line') badge = '—';
            else if (layer.shape === 'rect') badge = '□';
            else if (layer.shape === 'ellipse') badge = '○';
            else badge = '◇';
          }

          let columnChip = '';
          if (layer.type === 'text' && typeof layer.text === 'string') {
            const tokenMatch = layer.text.trim().match(/^\{([^}]+)\}$/);
            if (tokenMatch) {
              columnChip = `<span class="layer-col-chip">${escapeHtml(tokenMatch[1].trim())}</span>`;
            }
          }

          return `
            <div class="layer-list-item ${isSelected ? 'selected' : ''}" 
                 role="option" 
                 data-id="${layer.id}"
                 aria-selected="${isSelected}">
              <span class="layer-type-badge ${badgeClass}">${badge}</span>
              <span class="layer-item-name">${escapeHtml(layer.name || 'Layer')}</span>
              ${columnChip}${layer.locked ? '<span class="layer-lock-icon" title="Locked" aria-label="Locked"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const addNameBtn = el.querySelector('#btn-add-name-field');
  if (addNameBtn && onAddNameField) addNameBtn.addEventListener('click', onAddNameField);

  el.querySelectorAll('.layer-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      if (onSelect) onSelect(id);
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

