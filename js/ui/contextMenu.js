/**
 * Right-click menu for canvas layers.
 *
 * openContextMenu({ x, y, title, items, onClose })
 *   items: Array of
 *     { label, shortcut?, icon?, danger?, disabled?, onSelect() }
 *     { type: 'separator' }
 *     { type: 'align', label, onSelect(how) }   // row of 6 align buttons
 * Closes on Escape, outside click, scroll, resize, or after an action.
 * Keyboard: ↑/↓ move between items, Enter/Space activates, Esc closes.
 */
import { computePopoverPosition } from './popoverPosition.js';

let activeMenu = null;

const ICONS = {
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/>',
  duplicate: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><path d="M14.5 11.5v6M11.5 14.5h6"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  front: '<rect x="8" y="8" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  forward: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M14 16v-5M11.5 13.5 14 11l2.5 2.5"/>',
  backward: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M14 11v5M11.5 13.5 14 16l2.5-2.5"/>',
  back: '<rect x="4" y="4" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  text: '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
  font: '<path d="M4 20 10 4h1l6 16"/><path d="M6.5 14h8"/><path d="M17 20h3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  ratio: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4h4"/><path d="M17 14v-4h-4"/>'
};

const ALIGN = [
  { how: 'left', label: 'Align left', path: '<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>' },
  { how: 'center', label: 'Center horizontally', path: '<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>' },
  { how: 'right', label: 'Align right', path: '<path d="M20 3v18"/><rect x="5" y="6" width="12" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>' },
  { how: 'top', label: 'Align top', path: '<path d="M3 4h18"/><rect x="6" y="7" width="4" height="12" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>' },
  { how: 'middle', label: 'Center vertically', path: '<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>' },
  { how: 'bottom', label: 'Align bottom', path: '<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>' }
];

const svg = (inner) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export function closeContextMenu() {
  if (activeMenu) activeMenu.close();
}

export function openContextMenu({ x, y, title = '', items = [], onClose } = {}) {
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');
  if (title) menu.setAttribute('aria-label', title);

  if (title) {
    const head = document.createElement('div');
    head.className = 'ctx-menu-title';
    head.textContent = title;
    menu.appendChild(head);
  }

  const focusables = [];

  items.forEach((item) => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'ctx-menu-sep';
      sep.setAttribute('role', 'separator');
      menu.appendChild(sep);
      return;
    }

    if (item.type === 'align') {
      const wrap = document.createElement('div');
      wrap.className = 'ctx-menu-align';
      const label = document.createElement('span');
      label.className = 'ctx-menu-align-label';
      label.textContent = item.label || 'Align to certificate';
      const row = document.createElement('div');
      row.className = 'ctx-menu-align-row';
      ALIGN.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ctx-menu-align-btn';
        b.setAttribute('role', 'menuitem');
        b.setAttribute('aria-label', a.label);
        b.title = a.label;
        b.innerHTML = svg(a.path);
        b.addEventListener('click', () => { close(); item.onSelect(a.how); });
        row.appendChild(b);
        focusables.push(b);
      });
      wrap.append(label, row);
      menu.appendChild(wrap);
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ctx-menu-item${item.danger ? ' is-danger' : ''}`;
    btn.setAttribute('role', 'menuitem');
    btn.disabled = !!item.disabled;

    const icon = document.createElement('span');
    icon.className = 'ctx-menu-icon';
    icon.innerHTML = item.icon && ICONS[item.icon] ? svg(ICONS[item.icon]) : '';

    const label = document.createElement('span');
    label.className = 'ctx-menu-label';
    label.textContent = item.label;

    btn.append(icon, label);

    if (item.shortcut) {
      const kbd = document.createElement('kbd');
      kbd.className = 'ctx-menu-kbd';
      kbd.textContent = item.shortcut;
      btn.appendChild(kbd);
    }

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      close();
      item.onSelect();
    });
    menu.appendChild(btn);
    if (!btn.disabled) focusables.push(btn);
  });

  document.body.appendChild(menu);

  // Place at the pointer, always fully on screen
  const rect = menu.getBoundingClientRect();
  const pos = computePopoverPosition({
    anchor: { top: y, bottom: y, left: x, right: x },
    size: { width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    gap: 2,
    margin: 8
  });
  menu.style.left = `${pos.left}px`;
  menu.style.top = `${pos.top}px`;
  menu.style.maxHeight = `${pos.maxHeight}px`;

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const i = focusables.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown'
        ? (i + 1) % focusables.length
        : (i - 1 + focusables.length) % focusables.length;
      focusables[next]?.focus();
    }
  };
  const onPointerDown = (e) => {
    if (!menu.contains(e.target)) close();
  };
  const onScrollOrResize = () => close();

  function close() {
    if (!menu.isConnected) return;
    menu.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('resize', onScrollOrResize);
    window.removeEventListener('scroll', onScrollOrResize, true);
    activeMenu = null;
    if (onClose) onClose();
  }

  // Defer so the opening right-click doesn't close it immediately
  setTimeout(() => {
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
  }, 0);

  focusables[0]?.focus({ preventScroll: true });
  activeMenu = { close };
  return { close };
}
