import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveSafePath } from '../server.js';

const ROOT_DIR = path.resolve('.');

test('resolveSafePath maps root to index.html', () => {
  const result = resolveSafePath(ROOT_DIR, '/');
  assert.equal(result, path.join(ROOT_DIR, 'index.html'));
});

test('resolveSafePath maps /app to app.html', () => {
  const result = resolveSafePath(ROOT_DIR, '/app');
  assert.equal(result, path.join(ROOT_DIR, 'app.html'));
});

test('resolveSafePath resolves valid nested files', () => {
  const result = resolveSafePath(ROOT_DIR, '/css/tokens.css');
  assert.equal(result, path.join(ROOT_DIR, 'css', 'tokens.css'));
});

test('resolveSafePath rejects traversal attempts', () => {
  assert.equal(resolveSafePath(ROOT_DIR, '/../package.json'), null);
  assert.equal(resolveSafePath(ROOT_DIR, '/../../etc/passwd'), null);
  assert.equal(resolveSafePath(ROOT_DIR, '/%2e%2e/package.json'), null);
  assert.equal(resolveSafePath(ROOT_DIR, '/%2e%2e%2fpackage.json'), null);
  assert.equal(resolveSafePath(ROOT_DIR, '/css/../../secret.txt'), null);
});

