// The row of slots and the match / mismatch rules. Knows nothing about
// scoring, timing or the screen: it only answers "what happens if this
// object lands here?".
class Board {
  #slots;

  constructor(size) {
    this.#slots = new Array(size).fill(null);
  }

  get size() {
    return this.#slots.length;
  }

  reset() {
    this.#slots.fill(null);
  }

  get(i) {
    return this.#slots[i];
  }

  set(i, object) {
    this.#slots[i] = object;
  }

  isEmpty(i) {
    return this.#slots[i] === null;
  }

  // Snapshot for rendering; callers cannot mutate the board through it.
  toArray() {
    return this.#slots.slice();
  }

  // Drop `object` into slot i and apply the rules. Returns what happened:
  //   { kind: 'land' }                 the slot was empty
  //   { kind: 'miss' }                 mismatch, both objects destroyed
  //   { kind: 'merge', stage }         match, the object evolved
  //   { kind: 'clear', stage }         match of two finals, slot emptied
  drop(i, object) {
    const current = this.#slots[i];
    if (!current) {
      this.#slots[i] = object;
      return { kind: 'land' };
    }
    if (!current.matches(object)) {
      this.#slots[i] = null;
      return { kind: 'miss' };
    }
    const stage = current.mergeStage(object);
    const result = current.mergedWith(object);
    this.#slots[i] = result;
    return { kind: result ? 'merge' : 'clear', stage };
  }
}
