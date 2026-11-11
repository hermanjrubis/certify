import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePopoverPosition } from '../js/ui/popoverPosition.js';

const viewport = { width: 1440, height: 870 };

test('opens beside the panel, aligned with the button, when it fits', () => {
  const p = computePopoverPosition({
    anchor: { top: 120, bottom: 180, left: 30, right: 300 },
    size: { width: 380, height: 520 },
    viewport
  });
  assert.deepEqual(p, { left: 308, top: 120, maxHeight: 520 });
});

test('button low on the screen: popover is pushed up so its bottom stays on screen', () => {
  const p = computePopoverPosition({
    anchor: { top: 600, bottom: 660, left: 30, right: 300 },
    size: { width: 380, height: 520 },
    viewport
  });
  assert.equal(p.top + p.maxHeight, viewport.height - 12);
  assert.equal(p.left, 308);
});

test('short window: popover shrinks to the window and starts at the margin', () => {
  const p = computePopoverPosition({
    anchor: { top: 400, bottom: 460, left: 30, right: 300 },
    size: { width: 380, height: 520 },
    viewport: { width: 1280, height: 480 }
  });
  assert.deepEqual(p, { left: 308, top: 12, maxHeight: 456 });
});

test('no room on the right: falls back to above the button when below does not fit', () => {
  const p = computePopoverPosition({
    anchor: { top: 700, bottom: 740, left: 1100, right: 1400 },
    size: { width: 296, height: 400 },
    viewport
  });
  assert.equal(p.top, 700 - 8 - 400);
  assert.ok(p.left + 296 <= viewport.width - 12);
});

test('side "below" opens under the button when there is space', () => {
  const p = computePopoverPosition({
    anchor: { top: 100, bottom: 140, left: 50, right: 250 },
    size: { width: 296, height: 380 },
    viewport,
    side: 'below'
  });
  assert.deepEqual(p, { left: 50, top: 148, maxHeight: 380 });
});

test('result is always fully inside the window', () => {
  for (const top of [0, 200, 500, 800, 860]) {
    const p = computePopoverPosition({
      anchor: { top, bottom: top + 40, left: 20, right: 300 },
      size: { width: 380, height: 520 },
      viewport
    });
    assert.ok(p.top >= 12, `top ${p.top} for anchor ${top}`);
    assert.ok(p.top + p.maxHeight <= viewport.height - 12, `bottom for anchor ${top}`);
  }
});
