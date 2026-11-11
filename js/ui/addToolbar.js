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
          <span class="btn-icon-glyph">+</span>
          Text
        </button>

        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-image" title="Add image (signature, logo, stamp)">
          <span class="btn-icon-glyph">+</span>
          Image
          <input type="file" id="image-layer-file-input" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;">
        </button>

        <div class="shape-menu-wrapper">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-shape" aria-haspopup="true" aria-expanded="false" title="Add shape layer">
            <span class="btn-icon-glyph">+</span>
            Shape ▾
          </button>
          <div class="shape-dropdown-menu" id="shape-dropdown-menu" role="menu" style="display: none;">
            <button type="button" class="menu-item" role="menuitem" data-shape="line">
              <span class="shape-glyph">—</span> Line
            </button>
            <button type="button" class="menu-item" role="menuitem" data-shape="rect">
              <span class="shape-glyph">□</span> Box
            </button>
            <button type="button" class="menu-item" role="menuitem" data-shape="ellipse">
              <span class="shape-glyph">○</span> Circle
            </button>
          </div>
        </div>
      </div>

      <span class="toolbar-divider" aria-hidden="true"></span>

      <div class="undo-redo-group">
        <button type="button" class="btn-icon btn-sm undo-btn" id="btn-undo" aria-label="Undo" title="Undo (Ctrl+Z)" ${!canUndo ? 'disabled' : ''}>
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>
        <button type="button" class="btn-icon btn-sm redo-btn" id="btn-redo" aria-label="Redo" title="Redo (Ctrl+Y)" ${!canRedo ? 'disabled' : ''}>
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 7v6h-6"/>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
          </svg>
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

