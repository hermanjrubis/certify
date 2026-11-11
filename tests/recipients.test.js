import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNameList,
  parseCSV,
  detectNameColumn,
  resolveText,
  findMissingTokens,
  findDuplicates,
  findBlankRows,
  longestRowIndex
} from '../js/model/recipients.js';

test('parseNameList parses line-separated names', () => {
  const result = parseNameList('Ana\n\n  Ben  \r\nÑino');
  assert.deepEqual(result.columns, ['Name']);
  assert.deepEqual(result.rows, [
    { Name: 'Ana' },
    { Name: 'Ben' },
    { Name: 'Ñino' }
  ]);
});

test('parseCSV handles BOM, CRLF, quotes and blank lines', () => {
  const csv = '\uFEFFName,Course\r\n"Cruz, Ana","Web ""Dev"""\r\n,\r\n';
  const result = parseCSV(csv);
  assert.deepEqual(result.columns, ['Name', 'Course']);
  assert.deepEqual(result.rows, [
    { Name: 'Cruz, Ana', Course: 'Web "Dev"' }
  ]);
});

test('parseCSV auto-detects semicolon delimiter', () => {
  const result = parseCSV("Name;Award\nO'Brien;Best");
  assert.deepEqual(result.columns, ['Name', 'Award']);
  assert.deepEqual(result.rows, [
    { Name: "O'Brien", Award: 'Best' }
  ]);
});

test('parseCSV handles blank and repeated headers', () => {
  const result = parseCSV('Name,,Name\na,b,c');
  assert.deepEqual(result.columns, ['Name', 'Column 2', 'Name 2']);
  assert.deepEqual(result.rows, [
    { Name: 'a', 'Column 2': 'b', 'Name 2': 'c' }
  ]);
});

test('parseNameList delegates to parseCSV when tab is present', () => {
  const result = parseNameList('Name\tCourse\nAna\tWeb');
  assert.deepEqual(result.columns, ['Name', 'Course']);
  assert.deepEqual(result.rows, [
    { Name: 'Ana', Course: 'Web' }
  ]);
});

test('detectNameColumn finds first name-like column or first column', () => {
  assert.equal(detectNameColumn(['ID', 'Full Name', 'Course']), 'Full Name');
  assert.equal(detectNameColumn(['Student', 'Course']), 'Student');
  assert.equal(detectNameColumn([]), 'Name');
});

test('resolveText replaces exact and case-insensitive tokens', () => {
  assert.equal(
    resolveText('for completing {course}', { Course: 'UI/UX' }),
    'for completing UI/UX'
  );
  assert.equal(
    resolveText('{Award}', { Name: 'A' }),
    '{Award}'
  );
  assert.equal(
    resolveText('{Name} - {Role}', { name: 'Juan', role: 'Leader' }),
    'Juan - Leader'
  );
});

test('findMissingTokens finds tokens not in columns', () => {
  const layers = [
    { type: 'text', text: 'Hello {Name}' },
    { type: 'text', text: 'Winner of {Prize} in {Year}' },
    { type: 'shape' }
  ];
  const missing = findMissingTokens(layers, ['Name', 'prize']);
  assert.deepEqual(missing, ['Year']);
});

test('findDuplicates finds normalized duplicates', () => {
  const rows = [{ Name: 'Ana Cruz' }, { Name: ' ana  cruz' }, { Name: 'Ben' }];
  assert.deepEqual(findDuplicates(rows, 'Name'), ['Ana Cruz']);
});

test('findBlankRows returns 0-based indices of blank rows', () => {
  const rows = [{ Name: 'A' }, { Name: '  ' }, { Name: 'C' }];
  assert.deepEqual(findBlankRows(rows, 'Name'), [1]);
});

test('longestRowIndex returns index of row with longest resolved text', () => {
  const layers = [
    { type: 'text', text: '{Name}' },
    { type: 'text', text: 'Award: {Award}' }
  ];
  const rows = [
    { Name: 'Ana', Award: 'A' },
    { Name: 'Bartholomew Montgomery Jr.', Award: 'Distinction' },
    { Name: 'Carlos', Award: 'Participation' }
  ];
  assert.equal(longestRowIndex(rows, layers), 1);
  assert.equal(longestRowIndex([], layers), -1);
});

