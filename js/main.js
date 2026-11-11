/**
 * Certify Main Application Coordinator (Project v2 Architecture)
 * Single state source of truth, reactive canvas updates, layer overlay, and persistence.
 */

import {
  createDefaultProject,
  createNameLayer,
  createTextLayer,
  createImageLayer,
  createShapeLayer,
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  duplicateLayer
} from './model/layers.js';
import { detectNameColumn, resolveText } from './model/recipients.js';
import { createHistory } from './model/history.js';
import { ProjectStorage } from './projectStorage.js';
import { TemplateUpload } from './templateUpload.js';
import { LayerOverlay } from './ui/layerOverlay.js';
import { renderStepper } from './ui/stepper.js';
import { initHeaderMenu } from './ui/headerMenu.js';
import { renderCertificate } from './certificateRenderer.js';
import { ensureFonts, loadFontFamily } from './fontLoader.js';
import { extractTemplateColors } from './fontPanel.js';
import { renderAddToolbar } from './ui/addToolbar.js';
import { renderLayersPanel } from './ui/layersPanel.js';
import { renderPropertiesPanel } from './ui/propertiesPanel.js';

class CertifyApp {
  constructor() {
    this.state = {
      project: createDefaultProject(),
      selectedId: null,
      currentRow: 0,
      view: 'upload', // 'upload' | 'editing' | 'review'
      images: new Map()
    };

    this.history = createHistory(50);
    this.storage = new ProjectStorage();
    this.saveTimeout = null;
    this.currentReports = [];
    this.templateColors = [];

    this.initDOM();
    this.initOverlay();
    this.initHeader();
    this.bindKeyboardShortcuts();
    this.loadInitialDraft();
  }

  initDOM() {
    this.viewUpload = document.querySelector('#view-upload');
    this.viewEditing = document.querySelector('#view-editing');
    this.viewReview = document.querySelector('#view-review');

    this.projectTitleInput = document.querySelector('#project-title-input');
    this.stepperMount = document.querySelector('#stepper-mount');
    this.saveStatusText = document.querySelector('#save-status-text');
    this.btnHeaderMore = document.querySelector('#btn-header-more');
    this.headerDropdownMenu = document.querySelector('#header-dropdown-menu');
    this.btnReviewDownload = document.querySelector('#btn-review-download');
    this.btnReviewBadge = document.querySelector('#btn-review-badge');

    this.leftPanelMount = document.querySelector('#left-panel-mount');
    this.rightPanelMount = document.querySelector('#right-panel-mount');
    this.rowSwitcherMount = document.querySelector('#row-switcher-mount');

    this.canvasViewport = document.querySelector('#canvas-viewport-container');
    this.previewCanvas = document.querySelector('#preview-canvas');

    this.dropZone = document.querySelector('#upload-dropzone');
    this.fileInput = document.querySelector('#template-file-input');

    this.templateUpload = new TemplateUpload(this.dropZone, this.fileInput, {
      onTemplateLoaded: (templateData) => this.handleTemplateUploaded(templateData),
      onError: (msg) => alert(msg)
    });

    // Window resize observer for canvas responsive scaling
    window.addEventListener('resize', () => {
      if (this.state.view === 'editing') {
        this.renderCanvas();
      }
    });

    if (this.projectTitleInput) {
      this.projectTitleInput.addEventListener('input', (e) => {
        this.state.project.title = e.target.value;
        this.state.project.hasCustomTitle = true;
        this.triggerSaveDebounced();
      });
    }

    if (this.btnReviewDownload) {
      this.btnReviewDownload.addEventListener('click', () => {
        if (!this.state.project.template) return;
        this.switchView('review');
      });
    }
  }

  initOverlay() {
    this.layerOverlay = new LayerOverlay(this.canvasViewport, {
      onSelect: (id) => this.select(id),
      onChange: (id, patch, { commit }) => {
        if (!patch) {
          // Deletion
          this.updateProject(p => ({
            ...p,
            layers: removeLayer(p.layers, id)
          }), { commit });
          if (this.state.selectedId === id) {
            this.select(this.state.project.layers[0]?.id || null);
          }
        } else {
          this.updateProject(p => ({
            ...p,
            layers: updateLayer(p.layers, id, patch)
          }), { commit });
        }
      }
    });
  }

  initHeader() {
    this.headerMenu = initHeaderMenu(this.btnHeaderMore, this.headerDropdownMenu, {
      onNewProject: () => this.handleNewProject(),
      onExportProject: () => this.handleExportProject(),
      canExport: Boolean(this.state.project.template)
    });
  }

  async loadInitialDraft() {
    const draft = await this.storage.load();
    if (draft) {
      this.state.project = draft;
      if (draft.template && draft.template.dataUrl) {
        await this.loadTemplateImage(draft.template.dataUrl);
        this.state.view = 'editing';
      } else {
        this.state.view = 'upload';
      }
    } else {
      this.state.project = createDefaultProject();
      this.state.view = 'upload';
    }

    // Preload font families used in layers
    const layerFonts = this.state.project.layers.filter(l => l.font).map(l => l.font);
    ensureFonts(layerFonts);

    // Preload image layers
    for (const layer of this.state.project.layers) {
      if (layer.type === 'image' && layer.src) {
        this.loadImageLayer(layer.id, layer.src);
      }
    }

    this.state.selectedId = this.state.project.layers[0]?.id || null;
    this.history.reset(this.state.project.layers);

    this.updateHeader();
    this.updateView();
  }

  loadTemplateImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.state.images.set('template', img);
        try {
          this.templateColors = extractTemplateColors(img, 3);
        } catch {}
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          this.handleUndo();
        } else if (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          this.handleRedo();
        }
      }
    });
  }

  handleUndo() {
    const prevLayers = this.history.undo();
    if (prevLayers) {
      this.updateProject(p => ({ ...p, layers: prevLayers }), { commit: false });
      if (!prevLayers.some(l => l.id === this.state.selectedId)) {
        this.select(prevLayers[0]?.id || null);
      }
    }
  }

  handleRedo() {
    const nextLayers = this.history.redo();
    if (nextLayers) {
      this.updateProject(p => ({ ...p, layers: nextLayers }), { commit: false });
      if (!nextLayers.some(l => l.id === this.state.selectedId)) {
        this.select(nextLayers[0]?.id || null);
      }
    }
  }

  handleAddText() {
    const newLayer = createTextLayer();
    this.updateProject(p => ({
      ...p,
      layers: addLayer(p.layers, newLayer)
    }), { commit: true });
    this.select(newLayer.id);
  }

  handleAddImage({ src, naturalWidth, naturalHeight }) {
    const tplW = this.state.project.template?.width || 2000;
    const tplH = this.state.project.template?.height || 1414;
    const aspect = tplW / tplH;
    const newLayer = createImageLayer({ src, naturalWidth, naturalHeight }, aspect);
    this.loadImageLayer(newLayer.id, src);
    this.updateProject(p => ({
      ...p,
      layers: addLayer(p.layers, newLayer)
    }), { commit: true });
    this.select(newLayer.id);
  }

  handleAddShape(shape) {
    const newLayer = createShapeLayer(shape);
    this.updateProject(p => ({
      ...p,
      layers: addLayer(p.layers, newLayer)
    }), { commit: true });
    this.select(newLayer.id);
  }

  handleMoveLayer(id, delta) {
    this.updateProject(p => ({
      ...p,
      layers: moveLayer(p.layers, id, delta)
    }), { commit: true });
  }

  handleDuplicateLayer(id) {
    const { layers: newLayers, newId } = duplicateLayer(this.state.project.layers, id);
    if (newId) {
      this.updateProject(p => ({
        ...p,
        layers: newLayers
      }), { commit: true });
      this.select(newId);
    }
  }

  handleRemoveLayer(id) {
    this.updateProject(p => ({
      ...p,
      layers: removeLayer(p.layers, id)
    }), { commit: true });
    this.select(this.state.project.layers[0]?.id || null);
  }

  loadImageLayer(layerId, src) {
    const img = new Image();
    img.onload = () => {
      this.state.images.set(layerId, img);
      if (this.state.view === 'editing') {
        this.renderCanvas();
      }
    };
    img.src = src;
  }

  async handleTemplateUploaded(templateData) {
    this.state.project.template = {
      dataUrl: templateData.dataUrl,
      width: templateData.width,
      height: templateData.height,
      fileName: templateData.fileName
    };

    await this.loadTemplateImage(templateData.dataUrl);

    // If project has no layers, create initial name layer
    if (!this.state.project.layers || this.state.project.layers.length === 0) {
      const nameCol = detectNameColumn(this.state.project.recipients.columns);
      this.state.project.layers = [createNameLayer(nameCol)];
    }

    this.state.selectedId = this.state.project.layers[0]?.id || null;
    this.history.reset(this.state.project.layers);
    this.switchView('editing');
    this.triggerSaveDebounced(true);
  }

  handleNewProject() {
    if (this.state.project.template) {
      const ok = confirm('Start a new project? Your current template and layers will be cleared.');
      if (!ok) return;
    }

    const keptRecipients = this.state.project.recipients;
    const nameCol = detectNameColumn(keptRecipients.columns);
    const initialLayer = createNameLayer(nameCol);

    this.state.project = {
      version: 2,
      title: 'Untitled batch',
      hasCustomTitle: false,
      template: null,
      layers: [initialLayer],
      recipients: keptRecipients
    };

    this.state.images.clear();
    this.state.selectedId = initialLayer.id;
    this.state.currentRow = 0;
    this.history.reset(this.state.project.layers);

    this.switchView('upload');
    this.triggerSaveDebounced(true);
  }

  handleExportProject() {
    if (!this.state.project.template) return;
    const filename = `${(this.state.project.title || 'certify-project').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.json`;
    this.storage.exportJSON(this.state.project, filename);
  }

  updateProject(mutator, { commit = true } = {}) {
    const updated = mutator(this.state.project);
    if (updated) {
      this.state.project = updated;
    }

    if (commit) {
      this.history.push(this.state.project.layers);
    }

    this.triggerSaveDebounced(false);
    this.render();
  }

  select(id) {
    this.state.selectedId = id;
    if (this.layerOverlay) {
      this.layerOverlay.render(this.state.project.layers, this.state.selectedId);
    }
    if (typeof this.onSelectLayer === 'function') {
      this.onSelectLayer(id);
    }
  }

  setRow(index) {
    const rowCount = this.state.project.recipients.rows.length;
    if (rowCount === 0) {
      this.state.currentRow = 0;
    } else {
      this.state.currentRow = ((index % rowCount) + rowCount) % rowCount;
    }
    this.renderCanvas();
    if (typeof this.onRowChange === 'function') {
      this.onRowChange(this.state.currentRow);
    }
  }

  switchView(newView) {
    this.state.view = newView;
    this.updateView();
  }

  updateView() {
    if (this.viewUpload) this.viewUpload.style.display = this.state.view === 'upload' ? 'flex' : 'none';
    if (this.viewEditing) this.viewEditing.style.display = this.state.view === 'editing' ? 'flex' : 'none';
    if (this.viewReview) this.viewReview.style.display = this.state.view === 'review' ? 'flex' : 'none';

    this.updateHeader();
    if (this.state.view === 'editing') {
      this.render();
    } else if (this.state.view === 'review') {
      if (typeof this.renderReviewView === 'function') {
        this.renderReviewView();
      }
    }
  }

  updateHeader() {
    if (this.projectTitleInput && this.projectTitleInput.value !== this.state.project.title) {
      this.projectTitleInput.value = this.state.project.title || 'Untitled batch';
    }

    const hasTemplate = Boolean(this.state.project.template);
    const rowCount = this.state.project.recipients.rows.length;

    // Stepper state
    let activeStep = 1;
    let done = [];
    if (this.state.view === 'upload') {
      activeStep = 1;
      done = [];
    } else if (this.state.view === 'editing') {
      activeStep = 2;
      done = [1];
      if (rowCount > 0) done.push(3);
    } else if (this.state.view === 'review') {
      activeStep = 4;
      done = [1, 2, 3];
    }
    renderStepper(this.stepperMount, activeStep, done);

    // Primary button
    if (this.btnReviewDownload) {
      this.btnReviewDownload.disabled = !hasTemplate;
      if (!hasTemplate) {
        this.btnReviewDownload.title = 'Upload a template first';
      } else {
        this.btnReviewDownload.removeAttribute('title');
      }
    }
    if (this.btnReviewBadge) {
      this.btnReviewBadge.textContent = rowCount;
    }

    // Header menu
    if (this.headerMenu) {
      this.headerMenu.setCanExport(hasTemplate);
    }
  }

  triggerSaveDebounced(immediate = false) {
    if (this.saveStatusText) {
      this.saveStatusText.textContent = 'Saving…';
    }
    this.storage.save(this.state.project, immediate).then(() => {
      if (this.saveStatusText) {
        this.saveStatusText.textContent = 'Saved in this browser';
      }
    });
  }

  renderPanels() {
    if (!this.leftPanelMount) return;

    if (!this.addToolbarMount) {
      this.leftPanelMount.innerHTML = `
        <div id="add-toolbar-mount"></div>
        <div id="layers-panel-mount"></div>
        <div id="properties-panel-mount"></div>
      `;
      this.addToolbarMount = this.leftPanelMount.querySelector('#add-toolbar-mount');
      this.layersPanelMount = this.leftPanelMount.querySelector('#layers-panel-mount');
      this.propertiesPanelMount = this.leftPanelMount.querySelector('#properties-panel-mount');
    }

    renderAddToolbar(this.addToolbarMount, {
      onAddText: () => this.handleAddText(),
      onAddImage: (imgData) => this.handleAddImage(imgData),
      onAddShape: (shape) => this.handleAddShape(shape),
      onUndo: () => this.handleUndo(),
      onRedo: () => this.handleRedo(),
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo()
    });

    renderLayersPanel(this.layersPanelMount, this.state.project.layers, this.state.selectedId, {
      onSelect: (id) => this.select(id)
    });

    const selectedLayer = this.state.project.layers.find(l => l.id === this.state.selectedId);
    const row = this.state.project.recipients.rows[this.state.currentRow] || null;
    const sampleText = (selectedLayer && selectedLayer.type === 'text')
      ? (row ? resolveText(selectedLayer.text, row) : selectedLayer.text)
      : '';

    renderPropertiesPanel(this.propertiesPanelMount, selectedLayer, {
      columns: this.state.project.recipients.columns,
      templateColors: this.templateColors,
      sampleText,
      onChange: (patch, { commit }) => {
        if (this.state.selectedId) {
          this.updateProject(p => ({
            ...p,
            layers: updateLayer(p.layers, this.state.selectedId, patch)
          }), { commit });
        }
      },
      onMoveLayer: (id, delta) => this.handleMoveLayer(id, delta),
      onDuplicateLayer: (id) => this.handleDuplicateLayer(id),
      onRemoveLayer: (id) => this.handleRemoveLayer(id)
    });
  }

  onSelectLayer() {
    this.renderPanels();
  }

  render() {
    this.updateHeader();
    this.renderCanvas();
    this.renderPanels();
  }

  renderCanvas() {
    if (!this.previewCanvas || !this.canvasViewport) return;
    const tpl = this.state.project.template;

    if (!tpl) {
      this.previewCanvas.width = 600;
      this.previewCanvas.height = 400;
      const ctx = this.previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, 600, 400);
      if (this.layerOverlay) {
        this.layerOverlay.render([], null);
      }
      return;
    }

    const containerW = this.canvasViewport.clientWidth || 800;
    const aspect = tpl.width / tpl.height;
    const displayW = Math.max(300, Math.min(containerW, tpl.width));
    const displayH = Math.round(displayW / aspect);

    this.previewCanvas.width = displayW;
    this.previewCanvas.height = displayH;
    const ctx = this.previewCanvas.getContext('2d');

    const templateImg = this.state.images.get('template') || null;
    const row = this.state.project.recipients.rows[this.state.currentRow] || null;

    const reports = renderCertificate(
      ctx,
      { templateImg, layers: this.state.project.layers, images: this.state.images },
      row,
      { width: displayW, height: displayH }
    );

    this.currentReports = reports;

    if (this.layerOverlay) {
      this.layerOverlay.render(this.state.project.layers, this.state.selectedId);
    }
  }
}

// Bootstrap on DOM ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.certifyApp = new CertifyApp();
  });
}

export { CertifyApp };
