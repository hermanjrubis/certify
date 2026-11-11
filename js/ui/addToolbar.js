/**
 * Add Layer Toolbar & Undo/Redo Component.
 */

export function renderAddToolbar(el, {
  onAddText,
  onAddImage,
  onAddShape,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) {
  if (!el) return;

  el.innerHTML = `
    <div class="add-toolbar-container">
      <div class="add-buttons-group">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-text" title="Add text layer">
          <svg class="tb-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 4h15a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.5.5h-1.6a.5.5 0 0 1-.5-.4l-.3-1.6h-3.6v11h1.6a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-.5.5H8.9a.5.5 0 0 1-.5-.5V18a.5.5 0 0 1 .5-.5h1.6v-11H6.9l-.3 1.6a.5.5 0 0 1-.5.4H4.5A.5.5 0 0 1 4 8V4.5a.5.5 0 0 1 .5-.5z"/></svg>
          Text
        </button>

        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-image" title="Add image (signature, logo, stamp)">
          <svg class="tb-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3.5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 18h14l-4.4-6-3.4 4.4-2.4-3z"/></svg>
          Image
          <input type="file" id="image-layer-file-input" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;">
        </button>

        <div class="shape-menu-wrapper">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-shape" aria-haspopup="true" aria-expanded="false" title="Add shape layer">
            <svg class="tb-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="2.5" y="10.5" width="10" height="10" rx="2"/><circle cx="15.5" cy="8.5" r="6"/></svg>
            Shape
            <svg class="tb-icon tb-caret" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10h10l-5 5.5z"/></svg>
          </button>
          <div class="shape-dropdown-menu" id="shape-dropdown-menu" role="menu" style="display: none;">
            <button type="button" class="menu-item" role="menuitem" data-shape="line">
              <svg class="tb-icon shape-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="10.5" width="18" height="3" rx="1.5"/></svg><span>Line</span>
            </button>
            <button type="button" class="menu-item" role="menuitem" data-shape="rect">
              <svg class="tb-icon shape-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2.5"/></svg><span>Box</span>
            </button>
            <button type="button" class="menu-item" role="menuitem" data-shape="ellipse">
              <svg class="tb-icon shape-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/></svg><span>Circle</span>
            </button>
          </div>
        </div>
      </div>

      <span class="toolbar-divider" aria-hidden="true"></span>

      <div class="undo-redo-group">
        <button type="button" class="btn-icon btn-sm undo-btn" id="btn-undo" aria-label="Undo" title="Undo (Ctrl+Z)" ${!canUndo ? 'disabled' : ''}>
          <svg class="tb-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 4.5 3.8 9.3a.9.9 0 0 0 0 1.4l5.7 4.8a.6.6 0 0 0 1-.5v-2.7c3.9 0 6.6 1.3 8.6 4.4.3.5 1 .2.9-.3-.8-4.7-3.7-8.1-9.5-8.7V5a.6.6 0 0 0-1-.5z"/></svg>
        </button>
        <button type="button" class="btn-icon btn-sm redo-btn" id="btn-redo" aria-label="Redo" title="Redo (Ctrl+Y)" ${!canRedo ? 'disabled' : ''}>
          <svg class="tb-icon tb-flip" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 4.5 3.8 9.3a.9.9 0 0 0 0 1.4l5.7 4.8a.6.6 0 0 0 1-.5v-2.7c3.9 0 6.6 1.3 8.6 4.4.3.5 1 .2.9-.3-.8-4.7-3.7-8.1-9.5-8.7V5a.6.6 0 0 0-1-.5z"/></svg>
        </button>
      </div>
    </div>
  `;

  const btnAddText = el.querySelector('#btn-add-text');
  const btnAddImage = el.querySelector('#btn-add-image');
  const imageFileInput = el.querySelector('#image-layer-file-input');
  const btnAddShape = el.querySelector('#btn-add-shape');
  const shapeMenu = el.querySelector('#shape-dropdown-menu');
  const btnUndo = el.querySelector('#btn-undo');
  const btnRedo = el.querySelector('#btn-redo');

  if (btnAddText && onAddText) {
    btnAddText.addEventListener('click', onAddText);
  }

  if (btnAddImage && imageFileInput) {
    btnAddImage.addEventListener('click', (e) => {
      if (e.target !== imageFileInput) {
        imageFileInput.click();
      }
    });

    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        alert('Image exceeds maximum allowed size of 20MB.');
        imageFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        const img = new Image();
        img.onload = () => {
          if (onAddImage) {
            onAddImage({
              src: dataUrl,
              fileName: file.name,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            });
          }
          imageFileInput.value = '';
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnAddShape && shapeMenu) {
    btnAddShape.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = btnAddShape.getAttribute('aria-expanded') === 'true';
      shapeMenu.style.display = isExpanded ? 'none' : 'block';
      btnAddShape.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    });

    shapeMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-shape]');
      if (!item) return;
      const shape = item.dataset.shape;
      shapeMenu.style.display = 'none';
      btnAddShape.setAttribute('aria-expanded', 'false');
      if (onAddShape) onAddShape(shape);
    });

    document.addEventListener('click', (e) => {
      if (!shapeMenu.contains(e.target) && !btnAddShape.contains(e.target)) {
        shapeMenu.style.display = 'none';
        btnAddShape.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (btnUndo && onUndo) btnUndo.addEventListener('click', onUndo);
  if (btnRedo && onRedo) btnRedo.addEventListener('click', onRedo);
}

