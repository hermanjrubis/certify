import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FONT_CATEGORIES,
  FONT_CATALOG,
  getFont,
  searchFonts,
  fontCssUrl
} from '../js/fonts/catalog.js';

test('FONT_CATALOG has 122 fonts, correct category counts, no duplicates', () => {
  assert.equal(FONT_CATALOG.length, 122);

  const seen = new Set();
  const validCategories = new Set(FONT_CATEGORIES.map(c => c.id));
  const counts = {};

  for (const font of FONT_CATALOG) {
    assert.ok(!seen.has(font.family), `Duplicate font family: ${font.family}`);
    seen.add(font.family);
    assert.ok(validCategories.has(font.category), `Invalid category ${font.category} for font ${font.family}`);
    counts[font.category] = (counts[font.category] || 0) + 1;
  }

  assert.equal(counts['formal'], 24);
  assert.equal(counts['casual'], 16);
  assert.equal(counts['signature'], 14);
  assert.equal(counts['serif'], 28);
  assert.equal(counts['blackletter'], 10);
  assert.equal(counts['sans'], 16);
  assert.equal(counts['fun'], 14);
});

test('all 15 old fonts are in catalog', () => {
  const oldFonts = [
    'Dancing Script',
    'Luxurious Script',
    'Allura',
    'Parisienne',
    'Pinyon Script',
    'Tangerine',
    'Sacramento',
    'Alex Brush',
    'Great Vibes',
    'Mrs Saint Delafield',
    'Cinzel',
    'Playfair Display',
    'Cormorant Garamond',
    'EB Garamond',
    'Marcellus'
  ];

  for (const name of oldFonts) {
    const found = FONT_CATALOG.find(f => f.family === name);
    assert.ok(found, `Old font missing from catalog: ${name}`);
  }
});

test('fontCssUrl formats standard and weighted fonts with and without text subset', () => {
  assert.equal(
    fontCssUrl('Great Vibes'),
    'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap'
  );
  assert.equal(
    fontCssUrl('UnifrakturCook'),
    'https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap'
  );
  assert.equal(
    fontCssUrl('Allura', 'Ñiño'),
    'https://fonts.googleapis.com/css2?family=Allura&display=swap&text=%C3%91i%C3%B1o'
  );
});

test('searchFonts filters by substring and category', () => {
  const scriptMatches = searchFonts('script');
  assert.ok(scriptMatches.length > 0);
  assert.ok(scriptMatches.every(f => /script/i.test(f.family)));

  const blackletterMatches = searchFonts('', 'blackletter');
  assert.equal(blackletterMatches.length, 10);

  const unknown = getFont('Unknown Font');
  assert.equal(unknown.weight, 400);
  assert.equal(unknown.category, null);
});
