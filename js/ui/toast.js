/**
 * Small toast with an optional action button (e.g. "Undo").
 * Only one action toast is shown at a time; a new one replaces the old.
 */

let current = null;

function container() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

export function dismissToast() {
  if (!current) return;
  clearTimeout(current.timer);
  current.el.remove();
  current = null;
}

export function showToast({ message, actionLabel = '', onAction = null, duration = 6000 } = {}) {
  dismissToast();

  const el = document.createElement('div');
  el.className = 'toast toast-action';

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  el.appendChild(text);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      dismissToast();
      onAction();
    });
    el.appendChild(btn);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss');
  close.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.4 4.9 12 10.6l5.6-5.7a1.1 1.1 0 1 1 1.5 1.5L13.4 12l5.7 5.6a1.1 1.1 0 1 1-1.5 1.5L12 13.4l-5.6 5.7a1.1 1.1 0 1 1-1.5-1.5L10.6 12 4.9 6.4a1.1 1.1 0 0 1 1.5-1.5z"/></svg>';
  close.addEventListener('click', dismissToast);
  el.appendChild(close);

  container().appendChild(el);

  const entry = { el, timer: 0 };
  const arm = () => { entry.timer = setTimeout(() => { if (current === entry) dismissToast(); }, duration); };
  el.addEventListener('mouseenter', () => clearTimeout(entry.timer));
  el.addEventListener('mouseleave', arm);
  arm();
  current = entry;
}
