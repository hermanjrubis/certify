import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFit, findFreeSlot } from '../js/model/placement.js';

test('computeFit fits width when stage is tall', () => {
  const { cssW, cssH } = computeFit(750, 560, 2000, 1414);
  assert.equal(cssW, 750);
  assert.ok(Math.abs(cssH - 530) <= 1, `Expected cssH close to 530, got ${cssH}`);
});

test('computeFit fits height when stage is wide/short', () => {
  const { cssW, cssH } = computeFit(900, 400, 2000, 1414);
  assert.equal(cssH, 400);
  assert.ok(Math.abs(cssW - 566) <= 1, `Expected cssW close to 566, got ${cssW}`);
});

test('computeFit never upscales small templates', () => {
  const { cssW, cssH } = computeFit(2000, 2000, 800, 600);
  assert.deepEqual({ cssW, cssH }, { cssW: 800, cssH: 600 });
});

test('findFreeSlot finds preferred non-overlapping spot or next slot', () => {
  const textSpots = [
    { xPct: 25, yPct: 62 },
    { xPct: 25, yPct: 72 },
    { xPct: 25, yPct: 30 },
    { xPct: 25, yPct: 82 }
  ];

  const nameLayer = { xPct: 20, yPct: 45, wPct: 60, hPct: 15 };
  const slot1 = findFreeSlot([nameLayer], { wPct: 50, hPct: 7 }, textSpots);
  assert.deepEqual(slot1, { xPct: 25, yPct: 62 });

  // With a layer already occupying y62:
  const layerAt62 = { xPct: 25, yPct: 62, wPct: 50, hPct: 7 };
  const slot2 = findFreeSlot([nameLayer, layerAt62], { wPct: 50, hPct: 7 }, textSpots);
  assert.deepEqual(slot2, { xPct: 25, yPct: 72 });
});
