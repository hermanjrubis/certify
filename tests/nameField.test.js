import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNameLayer, layersUseColumn } from '../js/model/layers.js';

test('createNameLayer binds the column and accepts overrides', () => {
  const l = createNameLayer('Full Name', { color: '#FFFFFF', yPct: 50 });
  assert.equal(l.text, '{Full Name}');
  assert.equal(l.name, 'Recipient name');
  assert.equal(l.color, '#FFFFFF');
  assert.equal(l.yPct, 50);
  assert.equal(createNameLayer().text, '{Name}');
});

test('layersUseColumn finds a text layer using the column token, case-insensitively', () => {
  const t = (text, type = 'text') => ({ id: 'x', type, text });
  assert.equal(layersUseColumn([], 'Name'), false);
  assert.equal(layersUseColumn([t('Your text')], 'Name'), false);
  assert.equal(layersUseColumn([t('Awarded to {name}!')], 'Name'), true);
  assert.equal(layersUseColumn([t('{Name}', 'shape')], 'Name'), false);
  assert.equal(layersUseColumn([t('{Full Name}')], 'Full Name'), true);
  assert.equal(layersUseColumn([t('{A.B}')], 'AxB'), false);
});
