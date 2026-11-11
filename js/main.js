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
import { detectNameColumn, resolveText, longestRowIndex } from './model/recipients.js';
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
import { renderRecipientsPanel, updateRecipientsDerived } from './ui/recipientsPanel.js';
import { renderRowSwitcher } from './ui/rowSwitcher.js';
import { renderReviewView } from './ui/reviewView.js';
import { ZipExporter } from './zipExport.js';
import { showConfirmDialog } from './ui/confirmDialog.js';
import { computeFit } from './model/placement.js';

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
    this.zipExporter = new ZipExporter();
    this.saveTimeout = null;
    this.currentReports = [];
    this.templateColors = [];
    this.mobileTab = 'layers'; // 'layers' | 'style' | 'data'

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

    this.mobileStepIndicator = document.querySelector('#mobile-step-indicator');
    this.mobileProgressFill = document.querySelector('#mobile-progress-fill');
    this.mobileTabsBar = document.querySelector('#mobile-tabs-bar');
    this.mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
    this.mobileDataCount = document.querySelector('#mobile-data-count');
    this.mobileReviewBadge = document.querySelector('#mobile-review-badge');
    this.btnMobileReviewDownload = document.querySelector('#btn-mobile-review-download');

    this.canvasViewport = document.querySelector('#canvas-viewport-container');
    this.previewCanvas = document.querySelector('#preview-canvas');

    this.dropZone = document.querySelector('#upload-dropzone');
    this.fileInput = document.querySelector('#template-file-input');

    this.templateUpload = new TemplateUpload(this.dropZone, this.fileInput, {
      onTemplateLoaded: (templateData) => this.handleTemplateUploaded(templateData),
      onError: (msg) => alert(msg)
    });

    // Window resize observer for canvas responsive scaling & mobile layout
    window.addEventListener('resize', () => {
      if (this.state.view === 'editing') {
        this.renderCanvas();
        this.updateMobileTabUI();
      }
    });

    const stageEl = document.querySelector('.canvas-stage-wrapper');
    if (stageEl && typeof ResizeObserver !== 'undefined') {
      let resizeRaf = null;
      const ro = new ResizeObserver(() => {
        if (this.state.view === 'editing') {
          if (resizeRaf) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            this.renderCanvas();
          });
        }
      });
      ro.observe(stageEl);
    }

    if (this.mobileTabBtns) {
      this.mobileTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = e.currentTarget.dataset.tab;
          if (tab) {
            this.setMobileTab(tab);
          }
        });
      });
    }

    if (this.btnMobileReviewDownload) {
      this.btnMobileReviewDownload.addEventListener('click', () => {
        if (!this.state.project.template) return;
        this.switchView('review');
      });
    }

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
          }), { commit, source: 'overlay' });
          if (this.state.selectedId === id) {
            this.select(this.state.project.layers[0]?.id || null);
          }
        } else {
          this.updateProject(p => ({
            ...p,
            layers: updateLayer(p.layers, id, patch)
          }), { commit, source: 'overlay' });
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
    }), { commit: true, source: 'toolbar' });
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
    }), { commit: true, source: 'toolbar' });
    this.select(newLayer.id);
  }

  handleAddShape(shape) {
    const newLayer = createShapeLayer(shape);
    this.updateProject(p => ({
      ...p,
      layers: addLayer(p.layers, newLayer)
    }), { commit: true, source: 'toolbar' });
    this.select(newLayer.id);
  }

  handleMoveLayer(id, delta) {
    this.updateProject(p => ({
      ...p,
      layers: moveLayer(p.layers, id, delta)
    }), { commit: true, source: 'layers' });
  }

  handleDuplicateLayer(id) {
    const { layers: newLayers, newId } = duplicateLayer(this.state.project.layers, id);
    if (newId) {
      this.updateProject(p => ({
        ...p,
        layers: newLayers
      }), { commit: true, source: 'layers' });
      this.select(newId);
    }
  }

  handleRemoveLayer(id) {
    this.updateProject(p => ({
      ...p,
      layers: removeLayer(p.layers, id)
    }), { commit: true, source: 'layers' });
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

  async handleNewProject() {
    if (this.state.project.template) {
      const ok = await showConfirmDialog({
        title: 'Start a new project?',
        message: 'Your current template and layers will be cleared. (Recipient data will be preserved).',
        confirmLabel: 'Start new project',
        cancelLabel: 'Keep working',
        danger: true
      });
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

  updateProject(mutator, { commit = false, source = null } = {}) {
    const updated = mutator(this.state.project);
    if (updated) {
      this.state.project = updated;
    }

    if (commit) {
      this.history.push(this.state.project.layers);
    }

    this.triggerSaveDebounced(false);
    this.render({ source, commit });
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
      this.renderReviewScreen();
    }
  }

  renderReviewScreen() {
    if (!this.viewReview) return;
    renderReviewView(this.viewReview, {
      project: this.state.project,
      images: this.state.images,
      onBack: () => this.switchView('editing'),
      onDownload: () => this.handleDownloadZip()
    });
  }

  handleDownloadZip() {
    const templateImg = this.state.images.get('template');
    if (!templateImg) return;
    const rows = this.state.project.recipients.rows;
    if (rows.length === 0) {
      alert('Add at least one recipient before exporting.');
      return;
    }
    const nameCol = detectNameColumn(this.state.project.recipients.columns);
    const cleanTitle = (this.state.project.title || 'certify-batch').toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'certificates';
    const zipFileName = `${cleanTitle}.zip`;

    this.zipExporter.exportZip({
      templateImg,
      layers: this.state.project.layers,
      images: this.state.images,
      rows,
      nameColumn: nameCol,
      zipFileName,
      onError: (err) => alert(err)
    });
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

    // Mobile step indicator & progress bar
    if (this.mobileStepIndicator) {
      if (this.state.view === 'upload') {
        this.mobileStepIndicator.textContent = 'Step 1 of 4 · Template';
      } else if (this.state.view === 'editing') {
        this.mobileStepIndicator.textContent = rowCount > 0 
          ? 'Step 3 of 4 · Recipients' 
          : 'Step 2 of 4 · Design';
      } else if (this.state.view === 'review') {
        this.mobileStepIndicator.textContent = 'Step 4 of 4 · Review';
      }
    }

    if (this.mobileProgressFill) {
      let progressPct = 25;
      if (this.state.view === 'upload') {
        progressPct = 25;
      } else if (this.state.view === 'editing') {
        progressPct = rowCount > 0 ? 75 : 50;
      } else if (this.state.view === 'review') {
        progressPct = 100;
      }
      this.mobileProgressFill.style.width = `${progressPct}%`;
    }

    if (this.mobileDataCount) {
      this.mobileDataCount.textContent = rowCount;
    }

    if (this.mobileReviewBadge) {
      this.mobileReviewBadge.textContent = rowCount;
    }

    if (this.btnMobileReviewDownload) {
      this.btnMobileReviewDownload.disabled = !hasTemplate;
    }
  }

  setMobileTab(tab) {
    this.mobileTab = tab;
    this.updateMobileTabUI();
  }

  updateMobileTabUI() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;

    if (this.mobileTabBtns) {
      this.mobileTabBtns.forEach(btn => {
        const active = btn.dataset.tab === this.mobileTab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    if (!this.leftPanelMount || !this.rightPanelMount) return;

    if (isMobile) {
      if (this.mobileTab === 'layers') {
        this.leftPanelMount.style.display = 'block';
        this.rightPanelMount.style.display = 'none';
        if (this.addToolbarMount) this.addToolbarMount.style.display = '';
        if (this.layersPanelMount) this.layersPanelMount.style.display = '';
        if (this.propertiesPanelMount) this.propertiesPanelMount.style.display = 'none';
      } else if (this.mobileTab === 'style') {
        this.leftPanelMount.style.display = 'block';
        this.rightPanelMount.style.display = 'none';
        if (this.addToolbarMount) this.addToolbarMount.style.display = 'none';
        if (this.layersPanelMount) this.layersPanelMount.style.display = 'none';
        if (this.propertiesPanelMount) this.propertiesPanelMount.style.display = '';
      } else if (this.mobileTab === 'data') {
        this.leftPanelMount.style.display = 'none';
        this.rightPanelMount.style.display = 'block';
      }
    } else {
      this.leftPanelMount.style.display = '';
      this.rightPanelMount.style.display = '';
      if (this.addToolbarMount) this.addToolbarMount.style.display = '';
      if (this.layersPanelMount) this.layersPanelMount.style.display = '';
      if (this.propertiesPanelMount) this.propertiesPanelMount.style.display = '';
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

  renderPanels({ source = null, commit = false } = {}) {
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

    // Live drag from overlay: only canvas + overlay, skip panel rebuild entirely
    if (source === 'overlay' && !commit) {
      return;
    }

    const selectedLayer = this.state.project.layers.find(l => l.id === this.state.selectedId);
    const row = this.state.project.recipients.rows[this.state.currentRow] || null;
    const sampleText = (selectedLayer && selectedLayer.type === 'text')
      ? (row ? resolveText(selectedLayer.text, row) : selectedLayer.text)
      : '';

    // If change came from properties: rebuild layers list + toolbar (if commit) + update recipients derived
    if (source === 'properties') {
      if (commit) {
        renderAddToolbar(this.addToolbarMount, {
          onAddText: () => this.handleAddText(),
          onAddImage: (imgData) => this.handleAddImage(imgData),
          onAddShape: (shape) => this.handleAddShape(shape),
          onUndo: () => this.handleUndo(),
          onRedo: () => this.handleRedo(),
          canUndo: this.history.canUndo(),
          canRedo: this.history.canRedo()
        });
      }

      renderLayersPanel(this.layersPanelMount, this.state.project.layers, this.state.selectedId, {
        onSelect: (id) => this.select(id)
      });

      if (this.rightPanelMount) {
        updateRecipientsDerived(this.rightPanelMount, this.state.project.recipients, {
          layers: this.state.project.layers,
          reports: this.currentReports,
          currentRow: this.state.currentRow,
          onShowRow: (idx) => this.setRow(idx)
        });
      }

      this.updateRowSwitcher();
      this.updateMobileTabUI();
      return;
    }

    // If change came from recipients: update recipients panel in-place, don't destroy textarea
    if (source === 'recipients') {
      if (this.rightPanelMount) {
        updateRecipientsDerived(this.rightPanelMount, this.state.project.recipients, {
          layers: this.state.project.layers,
          reports: this.currentReports,
          currentRow: this.state.currentRow,
          onShowRow: (idx) => this.setRow(idx)
        });
      }

      // Rebuild properties panel for updated column choices
      renderPropertiesPanel(this.propertiesPanelMount, selectedLayer, {
        columns: this.state.project.recipients.columns,
        templateColors: this.templateColors,
        sampleText,
        onChange: (patch, { commit }) => {
          if (this.state.selectedId) {
            this.updateProject(p => ({
              ...p,
              layers: updateLayer(p.layers, this.state.selectedId, patch)
            }), { commit, source: 'properties' });
          }
        },
        onMoveLayer: (id, delta) => this.handleMoveLayer(id, delta),
        onDuplicateLayer: (id) => this.handleDuplicateLayer(id),
        onRemoveLayer: (id) => this.handleRemoveLayer(id)
      });

      renderLayersPanel(this.layersPanelMount, this.state.project.layers, this.state.selectedId, {
        onSelect: (id) => this.select(id)
      });

      this.updateRowSwitcher();
      this.updateMobileTabUI();
      return;
    }

    // Safety net: capture active element before full rebuild
    const activeEl = document.activeElement;
    const activeId = activeEl?.id || null;
    const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
    const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;

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

    renderPropertiesPanel(this.propertiesPanelMount, selectedLayer, {
      columns: this.state.project.recipients.columns,
      templateColors: this.templateColors,
      sampleText,
      onChange: (patch, { commit }) => {
        if (this.state.selectedId) {
          this.updateProject(p => ({
            ...p,
            layers: updateLayer(p.layers, this.state.selectedId, patch)
          }), { commit, source: 'properties' });
        }
      },
      onMoveLayer: (id, delta) => this.handleMoveLayer(id, delta),
      onDuplicateLayer: (id) => this.handleDuplicateLayer(id),
      onRemoveLayer: (id) => this.handleRemoveLayer(id)
    });

    // Render Right Panel (Recipients)
    if (this.rightPanelMount) {
      renderRecipientsPanel(this.rightPanelMount, this.state.project.recipients, {
        layers: this.state.project.layers,
        reports: this.currentReports,
        currentRow: this.state.currentRow,
        onChange: (newRecipients) => {
          this.updateProject(p => ({
            ...p,
            recipients: newRecipients
          }), { commit: false, source: 'recipients' });
        },
        onShowRow: (idx) => this.setRow(idx),
        onReviewClick: () => this.switchView('review')
      });
    }

    this.updateRowSwitcher();
    this.updateMobileTabUI();

    // Safety net: restore focus if element still exists
    if (activeId) {
      const restoredEl = document.getElementById(activeId);
      if (restoredEl && typeof restoredEl.focus === 'function') {
        restoredEl.focus();
        if (selStart !== null && selEnd !== null && typeof restoredEl.setSelectionRange === 'function') {
          try {
            restoredEl.setSelectionRange(selStart, selEnd);
          } catch {}
        }
      }
    }
  }

  updateRowSwitcher() {
    if (!this.rowSwitcherMount) return;
    const rows = this.state.project.recipients.rows;
    const count = rows.length;
    const nameCol = detectNameColumn(this.state.project.recipients.columns);
    const currentRowObj = rows[this.state.currentRow];
    const currentName = currentRowObj ? (currentRowObj[nameCol] || Object.values(currentRowObj)[0] || '') : '';

    renderRowSwitcher(this.rowSwitcherMount, {
      index: this.state.currentRow,
      count,
      label: currentName,
      onPrev: () => this.setRow(this.state.currentRow - 1),
      onNext: () => this.setRow(this.state.currentRow + 1),
      onLongest: () => {
        const idx = longestRowIndex(rows, this.state.project.layers);
        if (idx !== -1) this.setRow(idx);
      }
    });
  }

  onSelectLayer() {
    this.renderPanels();
  }

  render({ source = null, commit = false } = {}) {
    this.updateHeader();
    this.renderCanvas();
    this.renderPanels({ source, commit });
  }

  renderCanvas() {
    if (!this.previewCanvas || !this.canvasViewport) return;
    const tpl = this.state.project.template;

    if (!tpl) {
      this.canvasViewport.style.width = '600px';
      this.canvasViewport.style.height = '400px';
      this.previewCanvas.width = 600;
      this.previewCanvas.height = 400;
      this.previewCanvas.style.width = '100%';
      this.previewCanvas.style.height = '100%';
      const ctx = this.previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, 600, 400);
      if (this.layerOverlay) {
        this.layerOverlay.render([], null);
      }
      return;
    }

    const stageEl = document.querySelector('.canvas-stage-wrapper');
    const rowSwitcherEl = document.querySelector('#row-switcher-mount');
    const mobileTabsEl = document.querySelector('#mobile-tabs-bar');

    let stageW = stageEl ? stageEl.clientWidth : 750;
    let stageH = stageEl ? stageEl.clientHeight : 560;

    if (stageEl && typeof window !== 'undefined') {
      const computedStyle = window.getComputedStyle(stageEl);
      const padX = (parseFloat(computedStyle.paddingLeft) || 0) + (parseFloat(computedStyle.paddingRight) || 0);
      const padY = (parseFloat(computedStyle.paddingTop) || 0) + (parseFloat(computedStyle.paddingBottom) || 0);
      stageW -= padX;
      stageH -= padY;
    }

    if (rowSwitcherEl && rowSwitcherEl.offsetHeight > 0) {
      stageH -= (rowSwitcherEl.offsetHeight + 8);
    }
    if (mobileTabsEl && mobileTabsEl.offsetHeight > 0 && typeof window !== 'undefined' && window.getComputedStyle(mobileTabsEl).display !== 'none') {
      stageH -= (mobileTabsEl.offsetHeight + 6);
    }

    stageW = Math.max(100, stageW);
    stageH = Math.max(100, stageH);

    const { cssW, cssH } = computeFit(stageW, stageH, tpl.width, tpl.height);

    this.canvasViewport.style.width = `${cssW}px`;
    this.canvasViewport.style.height = `${cssH}px`;

    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    this.previewCanvas.width = Math.round(cssW * dpr);
    this.previewCanvas.height = Math.round(cssH * dpr);
    this.previewCanvas.style.width = '100%';
    this.previewCanvas.style.height = '100%';

    const ctx = this.previewCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const templateImg = this.state.images.get('template') || null;
    const row = this.state.project.recipients.rows[this.state.currentRow] || null;

    const reports = renderCertificate(
      ctx,
      { templateImg, layers: this.state.project.layers, images: this.state.images },
      row,
      { width: cssW, height: cssH }
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
