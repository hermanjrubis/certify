import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveLayerToEdge, alignPatch, pasteLayer } from '../js/model/layers.js';

const L = (id, extra = {}) => ({ id, type: 'text', xPct: 20, yPct: 40, wPct: 60, hPct: 10, ...extra });

test('moveLayerToEdge sends a layer to the front or back without mutating input', () => {
  const layers = [L('a'), L('b'), L('c')];
  assert.deepEqual(moveLayerToEdge(layers, 'a', 'front').map(l => l.id), ['b', 'c', 'a']);
  assert.deepEqual(moveLayerToEdge(layers, 'c', 'back').map(l => l.id), ['c', 'a', 'b']);
  assert.deepEqual(layers.map(l => l.id), ['a', 'b', 'c']);
  assert.deepEqual(moveLayerToEdge(layers, 'zz', 'front').map(l => l.id), ['a', 'b', 'c']);
});

test('alignPatch centers and pins to edges of the certificate', () => {
  const layer = L('a', { wPct: 60, hPct: 10 });
  assert.deepEqual(alignPatch(layer, 'center'), { xPct: 20 });
  assert.deepEqual(alignPatch(layer, 'right'), { xPct: 40 });
  assert.deepEqual(alignPatch(layer, 'left'), { xPct: 0 });
  assert.deepEqual(alignPatch(layer, 'middle'), { yPct: 45 });
  assert.deepEqual(alignPatch(layer, 'bottom'), { yPct: 90 });
  assert.deepEqual(alignPatch(layer, 'top'), { yPct: 0 });
});

test('pasteLayer offsets the copy, gives it a new id, unlocks it and puts it on top', () => {
  const layers = [L('a'), L('b')];
  const clip = L('a', { locked: true });
  const { layers: out, newId } = pasteLayer(layers, clip);
  assert.equal(out.length, 3);
  assert.equal(out[2].id, newId);
  assert.notEqual(newId, 'a');
  assert.equal(out[2].xPct, 22);
  assert.equal(out[2].yPct, 42);
  assert.equal(out[2].locked, false);
});

test('pasteLayer at a point centers the copy there but keeps it inside the certificate', () => {
  const clip = L('a', { wPct: 60, hPct: 10 });
  const centered = pasteLayer([], clip, { xPct: 50, yPct: 50 }).layers[0];
  assert.deepEqual([centered.xPct, centered.yPct], [20, 45]);
  const corner = pasteLayer([], clip, { xPct: 99, yPct: 99 }).layers[0];
  assert.deepEqual([corner.xPct, corner.yPct], [40, 90]);
});
