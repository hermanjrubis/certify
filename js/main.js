/**
 * Main Application Coordinator
 * Handles view switching (Upload, Editing, Preview),
 * reactive canvas updates, batch generation, and project state lifecycle.
 */

import { icons } from './icons.js';
import { TemplateUpload } from './templateUpload.js';
import { TextFieldEditor } from './textFieldEditor.js';
import { FontPanel, extractTemplateColors } from './fontPanel.js';
import { NamesInput, SAMPLE_ROSTER } from './namesInput.js';
import { renderCertificate, createPreviewCanvas } from './certificateRenderer.js';
import { ZipExporter } from './zipExport.js';
import { ProjectStorage } from './projectStorage.js';

class CertifyApp {
  constructor() {
    this.state = {
      title: 'Graduation batch 2026',
      hasCustomTitle: false,
      template: null, // { dataUrl, width, height, imageElement, fileName }
      textField: {
        xPct: 20,
        yPct: 45,
        wPct: 60,
        hPct: 15,
        font: 'Dancing Script',
        color: '#1F2A1B',
        align: 'center',
        autoFit: true,
        fontSizePct: 75,
        minFontSizePx: 14,
        maxFontSizePx: null
      },
      names: [...SAMPLE_ROSTER],
      currentView: 'upload', // 'upload' | 'editing' | 'preview'
      hasUnexportedChanges: false
    };

    this.storage = new ProjectStorage();
    this.zipExporter = new ZipExporter();

    this.textFieldEditor = null;
    this.fontPanel = null;
    this.namesInput = null;

    this.initDOM();
    this.bindGlobalEvents();
    this.loadInitialDraft();
  }

  initDOM() {
    this.appHeader = document.querySelector('#app-header');
    this.viewUpload = document.querySelector('#view-upload');
    this.viewEditing = document.querySelector('#view-editing');
    this.viewPreview = document.querySelector('#view-preview');

    this.projectTitleInput = document.querySelector('#project-title-input');
    this.projectRenameHintGroup = document.querySelector('#project-rename-hint-group');
    this.projectRenameHint = document.querySelector('#project-rename-hint');
    this.btnDismissRenameHint = document.querySelector('#btn-dismiss-rename-hint');
    this.btnNewProject = document.querySelector('#btn-new-project');
    this.btnTogglePreview = document.querySelector('#btn-toggle-preview');
    this.btnSaveProject = document.querySelector('#btn-save-project');
    this.btnGenerateZip = document.querySelector('#btn-generate-zip');
    this.btnExportJson = document.querySelector('#btn-export-json');

    // Workbench elements
    this.stylePanelMount = document.querySelector('#style-panel-mount');
    this.namesPanelMount = document.querySelector('#names-panel-mount');
    this.canvasViewport = document.querySelector('#canvas-viewport-container');
    this.previewCanvas = document.querySelector('#preview-canvas');

    // Batch Preview elements
    this.btnBackToEditor = document.querySelector('#btn-back-to-editor');
    this.btnPreviewExportZip = document.querySelector('#btn-preview-export-zip');
    this.previewSearchInput = document.querySelector('#preview-search-input');
    this.previewBatchCount = document.querySelector('#preview-batch-count');
    this.certificatesGrid = document.querySelector('#certificates-grid');

    // Dropzone elements
    this.dropZone = document.querySelector('#upload-dropzone');
    this.fileInput = document.querySelector('#template-file-input');

    // Initialize Upload handler
    this.templateUpload = new TemplateUpload(this.dropZone, this.fileInput, {
      onTemplateLoaded: (templateData) => this.handleTemplateUploaded(templateData),
      onError: (msg) => this.showToast(msg, 'error')
    });
  }

  showRenameHint() {
    if (this.projectRenameHintGroup && !this.state.hasCustomTitle) {
      this.projectRenameHintGroup.style.display = 'inline-flex';
    }
  }

  hideRenameHint() {
    if (this.projectRenameHintGroup) {
      this.projectRenameHintGroup.style.display = 'none';
    }
  }

  bindGlobalEvents() {
    // Project title change
    if (this.projectTitleInput) {
      this.projectTitleInput.addEventListener('input', (e) => {
        this.state.title = e.target.value;
        this.state.hasCustomTitle = true;
        this.hideRenameHint();
        this.markStateDirty();
      });
    }

    // Rename hint click focuses and selects the field
    if (this.projectRenameHint) {
      this.projectRenameHint.addEventListener('click', () => {
        if (this.projectTitleInput) {
          this.projectTitleInput.focus();
          this.projectTitleInput.select();
        }
      });
    }

    // Dismiss rename hint
    if (this.btnDismissRenameHint) {
      this.btnDismissRenameHint.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.hasCustomTitle = true;
        this.hideRenameHint();
        this.saveDraft(false);
      });
    }

    // New Project button
    if (this.btnNewProject) {
      this.btnNewProject.addEventListener('click', () => this.handleNewProject());
    }

    // Toggle Preview button
    if (this.btnTogglePreview) {
      this.btnTogglePreview.addEventListener('click', () => {
        if (this.state.currentView === 'preview') {
          this.switchView('editing');
        } else {
          this.generateAndShowPreviews();
        }
      });
    }

    // Save button
    if (this.btnSaveProject) {
      this.btnSaveProject.addEventListener('click', async () => {
        const ok = await this.saveDraft(true);
        if (ok) {
          this.showToast('Project saved to your browser', 'success');
        } else {
          this.showToast('Failed to save project', 'error');
        }
      });
    }

    // Generate ZIP button (from top nav or preview header)
    if (this.btnGenerateZip) {
      this.btnGenerateZip.addEventListener('click', () => this.handleGenerateZip());
    }
    if (this.btnPreviewExportZip) {
      this.btnPreviewExportZip.addEventListener('click', () => this.handleGenerateZip());
    }

    // Back to Editor from Preview
    if (this.btnBackToEditor) {
      this.btnBackToEditor.addEventListener('click', () => this.switchView('editing'));
    }

    // Search filter in Preview grid
    if (this.previewSearchInput) {
      this.previewSearchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').toLowerCase().trim();
        this.filterPreviewGrid(query);
      });
    }

    // Export project JSON backup
    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => {
        this.storage.exportJSON({
          title: this.state.title,
          template: this.state.template ? {
            dataUrl: this.state.template.dataUrl,
            width: this.state.template.width,
            height: this.state.template.height,
            fileName: this.state.template.fileName
          } : null,
          textField: this.state.textField,
          names: this.state.names
        }, `${this.state.title || 'certify-project'}.json`);
        this.showToast('Exported project JSON backup', 'success');
      });
    }
  }

  async handleNewProject() {
    if (this.state.hasUnexportedChanges) {
      const confirmReset = window.confirm('Start a new project? Any unsaved changes in your current certificate will be cleared.');
      if (!confirmReset) return;
    }
    await this.storage.clear();
    window.location.reload();
  }

  async loadInitialDraft() {
    const draft = await this.storage.load();
    if (draft) {
      this.state.hasCustomTitle = !!draft.hasCustomTitle || (draft.title && draft.title !== 'Graduation batch 2026');
      if (draft.title) {
        this.state.title = draft.title;
        if (this.projectTitleInput) this.projectTitleInput.value = this.state.title;
      }

      if (this.state.hasCustomTitle) {
        this.hideRenameHint();
      } else {
        this.showRenameHint();
      }

      if (draft.template && draft.template.dataUrl) {
        const img = new Image();
        img.onload = () => {
          this.state.textField = { ...this.state.textField, ...draft.textField };
          if (Array.isArray(draft.names)) {
            this.state.names = draft.names;
          }

          this.handleTemplateUploaded({
            dataUrl: draft.template.dataUrl,
            width: draft.template.width || img.naturalWidth,
            height: draft.template.height || img.naturalHeight,
            imageElement: img,
            fileName: draft.template.fileName || 'template.png'
          }, false);
        };
        img.src = draft.template.dataUrl;
      }
    } else {
      // Moment 1: Right when a new project starts
      this.showRenameHint();
    }
  }

  handleTemplateUploaded(templateData, markDirty = true) {
    this.state.template = templateData;
    if (markDirty) {
      this.markStateDirty();
    }

    // Configure Canvas size & Aspect Ratio
    const aspect = templateData.width / templateData.height;
    this.canvasViewport.style.aspectRatio = `${aspect}`;

    this.previewCanvas.width = templateData.width;
    this.previewCanvas.height = templateData.height;

    // Initialize Text Field Editor on the canvas container
    const boxNativeH = Math.round((this.state.textField.hPct / 100) * templateData.height);
    if (!this.state.textField.maxFontSizePx) {
      this.state.textField.maxFontSizePx = Math.round(boxNativeH * 0.8);
    }

    if (this.textFieldEditor) {
      this.textFieldEditor.destroy();
    }
    this.textFieldEditor = new TextFieldEditor(
      this.canvasViewport,
      this.state.textField,
      this.state.textField,
      (newCoords) => {
        Object.assign(this.state.textField, newCoords);
        if (this.state.template && this.fontPanel) {
          const updatedBoxNativeH = Math.round((this.state.textField.hPct / 100) * this.state.template.height);
          this.fontPanel.updateBoxDimensions(updatedBoxNativeH);
        }
        this.renderCanvasPreview();
        this.markStateDirty();
      }
    );

    // Initialize Font Panel
    this.fontPanel = new FontPanel(
      this.stylePanelMount,
      { ...this.state.textField, boxNativeHeight: boxNativeH },
      (newStyle) => {
        Object.assign(this.state.textField, newStyle);
        if (this.textFieldEditor) {
          this.textFieldEditor.updateLabel(this.state.textField.font, this.state.textField.autoFit);
        }
        this.renderCanvasPreview();
        this.markStateDirty();
      }
    );

    // Sample template colors and recommend palette
    if (templateData.imageElement) {
      const templateRecs = extractTemplateColors(templateData.imageElement, 5);
      this.fontPanel.setRecommendedColors(templateRecs);
    }

    // Initialize Names Panel
    this.namesInput = new NamesInput(
      this.namesPanelMount,
      this.state.names,
      {
        onNamesChange: (names) => {
          this.state.names = names;
          this.renderCanvasPreview();
          this.markStateDirty();
        },
        onGeneratePreviews: () => {
          this.generateAndShowPreviews();
        }
      }
    );

    // Initial canvas render & switch to editing view
    this.renderCanvasPreview();
    this.switchView('editing');

    // Moment 2: Right after first template upload completes
    if (!this.state.hasCustomTitle) {
      this.showRenameHint();
    }
  }

  renderCanvasPreview() {
    if (!this.state.template || !this.previewCanvas) return;

    const ctx = this.previewCanvas.getContext('2d');
    const displayName = (this.state.names && this.state.names.length > 0)
      ? this.state.names[0]
      : 'Jade Cataya';

    renderCertificate(
      ctx,
      this.state.template.imageElement,
      this.state.textField,
      displayName,
      this.previewCanvas.width,
      this.previewCanvas.height,
      this.state.template.height
    );
  }

  switchView(viewName) {
    this.state.currentView = viewName;

    this.viewUpload.style.display = viewName === 'upload' ? 'flex' : 'none';
    this.viewEditing.style.display = viewName === 'editing' ? 'block' : 'none';
    this.viewPreview.style.display = viewName === 'preview' ? 'block' : 'none';

    // Update Toggle Preview button label & style
    if (this.btnTogglePreview) {
      if (viewName === 'preview') {
        this.btnTogglePreview.innerHTML = `${icons.drag(16)} Editor`;
        this.btnTogglePreview.classList.add('active');
      } else {
        this.btnTogglePreview.innerHTML = `${icons.preview(16)} Preview`;
        this.btnTogglePreview.classList.remove('active');
      }
    }

    if (viewName === 'editing') {
      this.renderCanvasPreview();
    }
  }

  handleNewProject() {
    // 6.9 Starting a new certificate:
    // Show confirmation only if current batch has unexported work in progress
    if (this.state.hasUnexportedChanges && this.state.template) {
      this.showNewProjectConfirmModal(() => this.executeNewProjectReset());
      return;
    }
    this.executeNewProjectReset();
  }

  showNewProjectConfirmModal(onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.id = 'new-project-confirm-modal';

    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 460px;" role="dialog" aria-labelledby="new-proj-modal-title">
        <div class="modal-header">
          <h3 class="modal-title" id="new-proj-modal-title">Start new certificate?</h3>
          <button type="button" class="modal-close" id="btn-close-new-proj-modal" aria-label="Close dialog">
            ${icons.close(18)}
          </button>
        </div>
        <div style="margin-bottom: 1.5rem; font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.5;">
          You have unexported changes on your current certificate. Discard this certificate and start a new one? (Your style preferences and names list will be kept).
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-new-proj">Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" id="btn-confirm-new-proj">Discard & Start New</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();

    backdrop.querySelector('#btn-close-new-proj-modal').addEventListener('click', close);
    backdrop.querySelector('#btn-cancel-new-proj').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('#btn-confirm-new-proj').addEventListener('click', () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    });
  }

  executeNewProjectReset() {
    // Reset template image and text box position/size back to sensible default
    this.state.template = null;
    this.state.textField.xPct = 20;
    this.state.textField.yPct = 45;
    this.state.textField.wPct = 60;
    this.state.textField.hPct = 15;

    // Font, color, and alignment are preserved.
    // Names list is carried over by default!
    this.state.hasUnexportedChanges = false;

    if (this.textFieldEditor) {
      this.textFieldEditor.destroy();
      this.textFieldEditor = null;
    }

    this.storage.clear();
    this.switchView('upload');
    this.showToast('Ready for new certificate template', 'success');
  }

  generateAndShowPreviews() {
    if (!this.state.template) {
      this.showToast('Please upload a certificate template first.', 'error');
      return;
    }

    const namesToRender = (this.state.names && this.state.names.length > 0)
      ? this.state.names
      : ['Jade Cataya', 'Miguel Santos', 'Ana Dela Cruz'];

    this.previewBatchCount.textContent = `Batch Preview: ${namesToRender.length} Certificates`;
    this.certificatesGrid.innerHTML = '';

    const miniCanvases = [];

    // Render preview cards
    namesToRender.forEach((name, index) => {
      const previewCanvas = createPreviewCanvas(
        this.state.template.imageElement,
        this.state.textField,
        name,
        420
      );

      if (index < 3) {
        miniCanvases.push(previewCanvas.cloneNode ? createPreviewCanvas(this.state.template.imageElement, this.state.textField, name, 240) : previewCanvas);
      }

      const card = document.createElement('div');
      card.className = 'certificate-card';
      card.dataset.name = name.toLowerCase();

      card.innerHTML = `
        <div class="certificate-card-canvas-wrap"></div>
        <div class="certificate-card-info">
          <span class="card-recipient-name" title="${name}">${name}</span>
          <button type="button" class="btn-text-action card-view-btn">View full</button>
        </div>
      `;

      card.querySelector('.certificate-card-canvas-wrap').appendChild(previewCanvas);
      card.addEventListener('click', () => this.openLightbox(name));
      this.certificatesGrid.appendChild(card);
    });

    // Update mini previews in the names panel
    if (this.namesInput) {
      this.namesInput.updateMiniPreviews(miniCanvases);
    }

    this.switchView('preview');
  }

  filterPreviewGrid(query) {
    const cards = this.certificatesGrid.querySelectorAll('.certificate-card');
    cards.forEach(card => {
      const name = card.dataset.name || '';
      if (!query || name.includes(query)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  openLightbox(name) {
    if (!this.state.template) return;

    // Create high-res preview canvas
    const lightboxModal = document.createElement('div');
    lightboxModal.className = 'modal-backdrop active';
    lightboxModal.id = 'certificate-lightbox';

    const canvas = createPreviewCanvas(
      this.state.template.imageElement,
      this.state.textField,
      name,
      960
    );

    lightboxModal.innerHTML = `
      <div class="modal-card lightbox-card" role="dialog" aria-labelledby="lightbox-name">
        <div class="modal-header">
          <h3 class="modal-title" id="lightbox-name">${name}</h3>
          <button type="button" class="modal-close" id="btn-close-lightbox" title="Close preview">
            ${icons.close(20)}
          </button>
        </div>
        <div class="lightbox-content">
          <div class="lightbox-canvas-wrapper" id="lightbox-canvas-slot"></div>
          <div class="lightbox-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-download-single">
              ${icons.download(16)} Download PNG
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-lightbox-dismiss">
              Done
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(lightboxModal);
    lightboxModal.querySelector('#lightbox-canvas-slot').appendChild(canvas);

    const closeLightbox = () => lightboxModal.remove();

    lightboxModal.querySelector('#btn-close-lightbox').addEventListener('click', closeLightbox);
    lightboxModal.querySelector('#btn-lightbox-dismiss').addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });

    // Download single certificate
    lightboxModal.querySelector('#btn-download-single').addEventListener('click', () => {
      // Offscreen canvas at full native resolution
      const natW = this.state.template.width;
      const natH = this.state.template.height;
      const singleCanvas = document.createElement('canvas');
      singleCanvas.width = natW;
      singleCanvas.height = natH;
      const ctx = singleCanvas.getContext('2d');

      renderCertificate(ctx, this.state.template.imageElement, this.state.textField, name, natW, natH, natH);
      singleCanvas.toBlob((blob) => {
        if (blob) {
          const cleanName = (name || 'Certificate').replace(/[/\\?%*:|"<>]/g, '').trim();
          this.zipExporter.triggerDownload(blob, `${cleanName}.png`);
          this.showToast(`Downloaded certificate for ${name}`, 'success');
        }
      }, 'image/png');
    });
  }

  async handleGenerateZip() {
    if (!this.state.template) {
      this.showToast('Please upload a certificate template first.', 'error');
      return;
    }

    const namesList = (this.state.names && this.state.names.length > 0)
      ? this.state.names
      : ['Jade Cataya'];

    const filename = `${(this.state.title || 'certificates').toLowerCase().replace(/\s+/g, '-')}.zip`;

    await this.zipExporter.exportZip({
      templateImg: this.state.template.imageElement,
      textField: this.state.textField,
      names: namesList,
      zipFileName: filename,
      onComplete: () => {
        this.state.hasUnexportedChanges = false;
        this.showToast('ZIP archive downloaded successfully!', 'success');
      },
      onError: (err) => {
        this.showToast(err, 'error');
      }
    });
  }

  markStateDirty() {
    this.state.hasUnexportedChanges = true;
    this.saveDraft(false);
  }

  async saveDraft(immediate = false) {
    return await this.storage.save({
      title: this.state.title,
      hasCustomTitle: this.state.hasCustomTitle,
      template: this.state.template ? {
        dataUrl: this.state.template.dataUrl,
        width: this.state.template.width,
        height: this.state.template.height,
        fileName: this.state.template.fileName
      } : null,
      textField: this.state.textField,
      names: this.state.names
    }, immediate);
  }

  showToast(message, type = 'info') {
    let container = document.querySelector('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconSvg = type === 'success' ? icons.check(16) : (type === 'error' ? icons.close(16) : icons.sparkle(16));
    toast.innerHTML = `<span>${iconSvg}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new CertifyApp();
});
