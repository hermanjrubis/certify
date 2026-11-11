/**
 * Canvas Row Switcher Component.
 * Navigation controls underneath canvas to preview individual recipients.
 */

export function renderRowSwitcher(el, {
  index = 0,
  count = 0,
  label = '',
  onPrev,
  onNext,
  onLongest
}) {
  if (!el) return;

  if (count === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';
  const humanIndex = index + 1;

  // Keep keyboard focus on the arrow the user just pressed across re-renders.
  const focusedId = el.contains(document.activeElement) ? document.activeElement.id : '';

  el.innerHTML = `
    <div class="row-switcher-bar">
      <div class="row-switcher-nav">
        <button type="button" class="row-switcher-arrow" id="btn-row-prev" aria-label="Previous recipient" title="Previous recipient">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.2 5.6a1.4 1.4 0 0 1 0 2L10.8 12l4.4 4.4a1.4 1.4 0 1 1-2 2l-5.4-5.4a1.4 1.4 0 0 1 0-2l5.4-5.4a1.4 1.4 0 0 1 2 0z"/></svg>
        </button>
        <span class="row-switcher-status" aria-live="polite">
          <strong>Row ${humanIndex} of ${count}</strong>
          ${label ? `<span class="row-switcher-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>` : ''}
        </span>
        <button type="button" class="row-switcher-arrow" id="btn-row-next" aria-label="Next recipient" title="Next recipient">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.8 5.6a1.4 1.4 0 0 0 0 2l4.4 4.4-4.4 4.4a1.4 1.4 0 1 0 2 2l5.4-5.4a1.4 1.4 0 0 0 0-2l-5.4-5.4a1.4 1.4 0 0 0-2 0z"/></svg>
        </button>
      </div>

      <span class="row-switcher-divider" aria-hidden="true"></span>

      <button type="button" class="row-switcher-longest" id="btn-test-longest" title="Preview the recipient with the longest text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 8.5A1.5 1.5 0 0 1 3.5 7h17A1.5 1.5 0 0 1 22 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 15.5v-7zM6 9v3.2h1.6V9H6zm4 0v2h1.6V9H10zm4 0v3.2h1.6V9H14zm4 0v2h1.6V9H18z"/></svg>
        <span>Longest name</span>
      </button>
    </div>
  `;

  if (focusedId) {
    const again = el.querySelector(`#${focusedId}`);
    if (again) again.focus();
  }

  const btnPrev = el.querySelector('#btn-row-prev');
  const btnNext = el.querySelector('#btn-row-next');
  const btnLongest = el.querySelector('#btn-test-longest');

  if (btnPrev && onPrev) btnPrev.addEventListener('click', onPrev);
  if (btnNext && onNext) btnNext.addEventListener('click', onNext);
  if (btnLongest && onLongest) btnLongest.addEventListener('click', onLongest);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

