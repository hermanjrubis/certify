/**
 * Undo/redo history manager (pure/in-memory data structure).
 */

export function createHistory(limit = 50) {
  let stack = [];
  let pointer = -1;

  return {
    reset(snapshot) {
      stack = [structuredClone(snapshot)];
      pointer = 0;
    },

    push(snapshot) {
      if (pointer < stack.length - 1) {
        stack = stack.slice(0, pointer + 1);
      }
      stack.push(structuredClone(snapshot));
      pointer++;

      if (stack.length > limit + 1) {
        stack.shift();
        pointer--;
      }
    },

    undo() {
      if (pointer <= 0) return null;
      pointer--;
      return structuredClone(stack[pointer]);
    },

    redo() {
      if (pointer >= stack.length - 1) return null;
      pointer++;
      return structuredClone(stack[pointer]);
    },

    canUndo() {
      return pointer > 0;
    },

    canRedo() {
      return pointer >= 0 && pointer < stack.length - 1;
    }
  };
}

