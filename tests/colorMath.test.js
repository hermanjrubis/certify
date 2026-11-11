import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  contrastRatio,
  pickReadableInk
} from '../js/color/colorMath.js';

test('normalizeHex handles 3-digit, 6-digit, with/without hash and invalid strings', () => {
  assert.equal(normalizeHex('#abc'), '#AABBCC');
  assert.equal(normalizeHex('12FF00'), '#12FF00');
  assert.equal(normalizeHex('blue'), null);
  assert.equal(normalizeHex(''), null);
});

test('contrastRatio calculates WCAG standard contrast', () => {
  const whiteBlackContrast = contrastRatio('#FFFFFF', '#000000');
  assert.ok(Math.abs(whiteBlackContrast - 21) <= 0.01, `Expected 21, got ${whiteBlackContrast}`);

  const greenWhiteContrast = contrastRatio('#3A8531', '#FFFFFF');
  assert.ok(greenWhiteContrast >= 4.5, `Expected >= 4.5, got ${greenWhiteContrast}`);
});

test('rgbToHex and hsv conversions round-trip accurately', () => {
  const hsv = rgbToHsv(18, 52, 86);
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  assert.equal(hex, '#123456');
});

test('pickReadableInk prefers candidates with contrast >= 4.5 or falls back to best', () => {
  // Gold on Navy passes; dark green fails
  const ink1 = pickReadableInk('#14215A', ['#D4AF37', '#1F2A1B']);
  assert.equal(ink1, '#D4AF37');

  // Falls back to dark on cream
  const ink2 = pickReadableInk('#FBF7EC', ['#F0E6C8']);
  assert.equal(ink2, '#1F2A1B');
});

