import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE_STEPS,
  createNameLayer,
  createTextLayer,
  createImageLayer,
  createShapeLayer,
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  duplicateLayer,
  createDefaultProject,
  migrateProject
} from '../js/model/layers.js';

test('createDefaultProject produces empty recipients and {Name} layer', () => {
  const p = createDefaultProject();
  assert.equal(p.version, 2);
  assert.equal(p.recipients.rows.length, 0);
  assert.deepEqual(p.recipients.columns, ['Name']);
  assert.equal(p.layers.length, 1);
  assert.equal(p.layers[0].text, '{Name}');
});

test('moveLayer reorders and clamps at ends', () => {
  const a = { id: 'a', name: 'A' };
  const b = { id: 'b', name: 'B' };
  const c = { id: 'c', name: 'C' };
  const layers = [a, b, c];

  const moved1 = moveLayer(layers, 'a', 1);
  assert.deepEqual(moved1.map(l => l.id), ['b', 'a', 'c']);

  const movedEnd = moveLayer(layers, 'c', 1);
  assert.deepEqual(movedEnd.map(l => l.id), ['a', 'b', 'c']);

  const movedStart = moveLayer(layers, 'a', -1);
  assert.deepEqual(movedStart.map(l => l.id), ['a', 'b', 'c']);

  // Original array unchanged
  assert.deepEqual(layers.map(l => l.id), ['a', 'b', 'c']);
});

test('duplicateLayer inserts right above, offsets position, creates new id', () => {
  const a = { id: 'a', name: 'Layer A', xPct: 10, yPct: 20, wPct: 30, hPct: 15 };
  const b = { id: 'b', name: 'Layer B', xPct: 40, yPct: 50, wPct: 30, hPct: 15 };
  const layers = [a, b];

  const { layers: newLayers, newId } = duplicateLayer(layers, 'a');
  assert.equal(newLayers.length, 3);
  assert.notEqual(newId, 'a');
  assert.equal(newLayers[1].id, newId);
  assert.equal(newLayers[1].name, 'Layer A copy');
  assert.equal(newLayers[1].xPct, 12);
  assert.equal(newLayers[1].yPct, 22);
  // Input array unchanged
  assert.equal(layers.length, 2);
});

test('createImageLayer calculates hPct proportional to aspect ratio', () => {
  const layer = createImageLayer({ src: 'x', naturalWidth: 400, naturalHeight: 200 }, 1.414);
  assert.equal(layer.type, 'image');
  assert.ok(Math.abs(layer.hPct - 14.14) < 0.01);
  assert.equal(layer.wPct, 20);
});

test('migrateProject handles v1 draft', () => {
  const v1 = {
    title: 'Batch A',
    hasCustomTitle: true,
    template: { dataUrl: 'd', width: 2000, height: 1414, fileName: 't.png' },
    textField: {
      xPct: 10,
      yPct: 40,
      wPct: 80,
      hPct: 20,
      font: 'Allura',
      color: '#123456',
      align: 'left',
      autoFit: false,
      maxFontSizePx: 170
    },
    names: ['Ana', 'Ñino']
  };

  const p = migrateProject(v1);
  assert.equal(p.version, 2);
  assert.equal(p.title, 'Batch A');
  assert.equal(p.hasCustomTitle, true);
  assert.equal(p.layers.length, 1);
  assert.equal(p.layers[0].text, '{Name}');
  assert.equal(p.layers[0].font, 'Allura');
  assert.equal(p.layers[0].xPct, 10);
  assert.ok(Math.abs(p.layers[0].sizePct - 170 / (0.20 * 1414)) < 0.01);
  assert.deepEqual(p.recipients.rows, [{ Name: 'Ana' }, { Name: 'Ñino' }]);
});

test('migrateProject handles invalid input and v2 defaults', () => {
  assert.equal(migrateProject(null), null);
  assert.equal(migrateProject('garbage'), null);
  assert.equal(migrateProject({}), null);

  const v2 = {
    version: 2,
    title: 'Custom Title',
    layers: []
  };
  const filled = migrateProject(v2);
  assert.equal(filled.version, 2);
  assert.equal(filled.title, 'Custom Title');
  assert.equal(filled.hasCustomTitle, false);
  assert.deepEqual(filled.recipients, {
    columns: ['Name'],
    rows: [],
    source: 'paste',
    fileName: null
  });
});
