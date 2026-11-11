import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFit } from '../js/model/placement.js';

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
