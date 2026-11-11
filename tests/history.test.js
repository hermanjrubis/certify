import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../js/model/history.js';

test('history undo and redo basic flow', () => {
  const history = createHistory(50);
  const a = { val: 'A' };
  const b = { val: 'B' };
  const c = { val: 'C' };

  history.reset(a);
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);

  history.push(b);
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  history.push(c);
  assert.equal(history.canUndo(), true);

  const undoneB = history.undo();
  assert.deepEqual(undoneB, { val: 'B' });
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), true);

  const undoneA = history.undo();
  assert.deepEqual(undoneA, { val: 'A' });
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), true);

  const undoneNull = history.undo();
  assert.equal(undoneNull, null);

  const redoneB = history.redo();
  assert.deepEqual(redoneB, { val: 'B' });
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), true);

  // Push after undo drops redo branch
  const d = { val: 'D' };
  history.push(d);
  assert.equal(history.canRedo(), false);
  assert.equal(history.canUndo(), true);

  const undoneAfterD = history.undo();
  assert.deepEqual(undoneAfterD, { val: 'B' });
});

test('snapshots are isolated by structuredClone', () => {
  const history = createHistory(10);
  const a = { nested: { count: 1 } };
  history.reset(a);
  a.nested.count = 99; // mutate input after reset

  history.push({ nested: { count: 2 } });
  const undone = history.undo();
  assert.equal(undone.nested.count, 1);

  undone.nested.count = 555; // mutate returned snapshot
  const redone = history.redo();
  const undoneAgain = history.undo();
  assert.equal(undoneAgain.nested.count, 1);
});

test('history limit drops oldest entries', () => {
  const history = createHistory(2);
  history.reset({ val: 'A' });
  history.push({ val: 'B' });
  history.push({ val: 'C' });
  history.push({ val: 'D' });

  // With limit 2, only 2 undos should be possible: D -> C, C -> B, then null
  assert.deepEqual(history.undo(), { val: 'C' });
  assert.deepEqual(history.undo(), { val: 'B' });
  assert.equal(history.undo(), null);
});

