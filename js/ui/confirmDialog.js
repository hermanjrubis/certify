/**
 * Accessible confirm dialog replacement for window.confirm
 * Provides role="dialog", aria-modal="true", Escape handling, focus trapping, and focus restoration.
 */

export function showConfirmDialog({
  title = 'Please Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const prevActiveElement = typeof document !== 'undefined' ? document.activeElement : null;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active confirm-dialog-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'confirm-dialog-title');
    backdrop.setAttribute('aria-describedby', 'confirm-dialog-desc');

    const card = document.createElement('div');
    card.className = 'modal-card confirm-modal-card';
    card.style.maxWidth = '420px';

    card.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title" id="confirm-dialog-title">${escapeHtml(title)}</h3>
      </div>
      <div class="modal-body" style="padding: 1.25rem 0;">
        <p id="confirm-dialog-desc" class="text-secondary" style="margin: 0; line-height: 1.5; font-size: 0.9375rem;">
          ${escapeHtml(message)}
        </p>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border-hairline);">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-dialog-cancel">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" id="btn-dialog-confirm">${escapeHtml(confirmLabel)}</button>
      </div>
    `;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    const btnCancel = card.querySelector('#btn-dialog-cancel');
    const btnConfirm = card.querySelector('#btn-dialog-confirm');

    function cleanup(result) {
      document.removeEventListener('keydown', handleKeyDown);
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      if (prevActiveElement && typeof prevActiveElement.focus === 'function') {
        prevActiveElement.focus();
      }
      resolve(result);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Tab') {
        const focusable = [btnCancel, btnConfirm];
        if (e.shiftKey && document.activeElement === focusable[0]) {
          e.preventDefault();
          focusable[1].focus();
        } else if (!e.shiftKey && document.activeElement === focusable[1]) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    }

    btnCancel.addEventListener('click', () => cleanup(false));
    btnConfirm.addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(false);
    });

    document.addEventListener('keydown', handleKeyDown);
    btnCancel.focus();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
