import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename } from '../js/zipExport.js';

test('sanitizeFilename preserves Unicode accents and spaces', () => {
  assert.equal(sanitizeFilename('Ñino Peñafrancia', {}), 'Ñino Peñafrancia.png');
});

test('sanitizeFilename strips forbidden file characters', () => {
  assert.equal(sanitizeFilename('a/b:c', {}), 'abc.png');
  assert.equal(sanitizeFilename('Certificate <Final>? *2026*| "Yes"', {}), 'Certificate Final 2026 Yes.png');
});

test('sanitizeFilename handles duplicates with (2), (3)', () => {
  const counts = {};
  assert.equal(sanitizeFilename('Ana', counts), 'Ana.png');
  assert.equal(sanitizeFilename('Ana', counts), 'Ana (2).png');
  assert.equal(sanitizeFilename('Ana', counts), 'Ana (3).png');
});

test('sanitizeFilename falls back to Certificate for empty/blank names', () => {
  assert.equal(sanitizeFilename('  ', {}), 'Certificate.png');
  assert.equal(sanitizeFilename('', {}), 'Certificate.png');
  assert.equal(sanitizeFilename(null, {}), 'Certificate.png');
});
