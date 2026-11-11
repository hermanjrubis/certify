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

  el.innerHTML = `
    <div class="row-switcher-bar">
      <div class="row-switcher-nav">
        <button type="button" class="btn-icon btn-sm" id="btn-row-prev" aria-label="Previous recipient" title="Previous recipient">
          ‹
        </button>
        <span class="row-switcher-status">
          <strong>Row ${humanIndex} of ${count}</strong>
          ${label ? `<span class="row-switcher-label">· ${escapeHtml(label)}</span>` : ''}
        </span>
        <button type="button" class="btn-icon btn-sm" id="btn-row-next" aria-label="Next recipient" title="Next recipient">
          ›
        </button>
      </div>

      <button type="button" class="btn btn-sm btn-secondary" id="btn-test-longest" title="Preview recipient with longest text">
        Test longest row
      </button>
    </div>
  `;

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
