/**
 * Where to put a popover so it is always fully on screen.
 *
 * side 'right': open to the right of the anchor (beside the side panel),
 *   top aligned with the anchor, pushed up if it would run past the bottom.
 * side 'below' (or 'right' when there is no room on the right): below the
 *   anchor if it fits, above if that fits, otherwise pinned inside the window.
 * The popover is never taller than the window minus margins; callers make
 * their content scroll inside.
 *
 * Pure: takes rects and sizes, returns numbers (viewport coordinates).
 */
export function computePopoverPosition({
  anchor,
  size,
  viewport,
  side = 'right',
  gap = 8,
  margin = 12
}) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const maxHeight = Math.max(160, viewport.height - margin * 2);
  const height = Math.min(size.height, maxHeight);
  const width = Math.min(size.width, viewport.width - margin * 2);

  const fitsRight = anchor.right + gap + width <= viewport.width - margin;
  if (side === 'right' && fitsRight) {
    return {
      left: Math.round(anchor.right + gap),
      top: Math.round(clamp(anchor.top, margin, viewport.height - margin - height)),
      maxHeight: Math.round(height)
    };
  }

  const left = clamp(anchor.left, margin, viewport.width - margin - width);
  const spaceBelow = viewport.height - margin - (anchor.bottom + gap);
  const spaceAbove = anchor.top - gap - margin;
  let top;
  if (height <= spaceBelow) {
    top = anchor.bottom + gap;
  } else if (height <= spaceAbove) {
    top = anchor.top - gap - height;
  } else {
    top = clamp(anchor.bottom + gap, margin, viewport.height - margin - height);
  }
  return { left: Math.round(left), top: Math.round(top), maxHeight: Math.round(height) };
}

/**
 * Anchor rect for popovers opened from a side panel: use the panel's right
 * edge so the popover sits beside the panel, not on top of it.
 */
export function panelAnchorRect(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const panel = anchorEl.closest('.editor-side-panel');
  if (!panel) return rect;
  const panelRect = panel.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom, left: rect.left, right: panelRect.right };
}
