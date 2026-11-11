/**
 * Header "⋯" menu component.
 */

export function initHeaderMenu(buttonEl, dropdownEl, { onNewProject, onExportProject, canExport = false }) {
  if (!buttonEl || !dropdownEl) return;

  function openMenu() {
    dropdownEl.style.display = 'block';
    buttonEl.setAttribute('aria-expanded', 'true');
    const firstItem = dropdownEl.querySelector('button:not(:disabled)');
    if (firstItem) firstItem.focus();
  }

  function closeMenu() {
    dropdownEl.style.display = 'none';
    buttonEl.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    const isExpanded = buttonEl.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  buttonEl.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  dropdownEl.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item || item.disabled) return;
    const action = item.dataset.action;
    closeMenu();

    if (action === 'new-project' && onNewProject) {
      onNewProject();
    } else if (action === 'export-project' && onExportProject) {
      onExportProject();
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdownEl.contains(e.target) && !buttonEl.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dropdownEl.style.display !== 'none') {
      closeMenu();
      buttonEl.focus();
    }
  });

  return {
    setCanExport(allowed) {
      const exportBtn = dropdownEl.querySelector('[data-action="export-project"]');
      if (exportBtn) {
        exportBtn.disabled = !allowed;
        if (!allowed) {
          exportBtn.title = 'Upload a template first';
        } else {
          exportBtn.removeAttribute('title');
        }
      }
    },
    close: closeMenu
  };
}
