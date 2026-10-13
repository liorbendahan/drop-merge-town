// One game object: a family at a stage, or a joker. Immutable: evolving an
// object returns a new one. Pure data, no DOM.
class GameObject {
  constructor(cat, stage, wild = false) {
    this.cat = cat;     // index into CATEGORIES (ignored for a joker)
    this.stage = stage; // 0 .. LAST_STAGE
    this.wild = wild;
    Object.freeze(this);
  }

  static base(cat) {
    return new GameObject(cat, 0);
  }

  static joker() {
    return new GameObject(0, 0, true);
  }

  // A fresh spawn: usually a random base object, sometimes a joker.
  static random(rng = Math.random) {
    if (rng() < CONFIG.WILD_CHANCE) return GameObject.joker();
    return GameObject.base(Math.floor(rng() * CATEGORIES.length));
  }

  get category() {
    return this.wild ? WILD_CATEGORY : CATEGORIES[this.cat];
  }

  get label() {
    return this.category.labels[this.stage];
  }

  get color() {
    return this.category.color;
  }

  get isFinal() {
    return !this.wild && this.stage === LAST_STAGE;
  }

  get assetPath() {
    return `${ASSET_DIR}/${this.category.name}-${this.stage + 1}.png`;
  }

  // Stable identity string, handy for render caching and tests.
  get key() {
    return this.wild ? 'wild' : `${this.category.name}-${this.stage}`;
  }

  // A joker matches anything; otherwise family and stage must both agree.
  matches(other) {
    return this.wild || other.wild || (this.cat === other.cat && this.stage === other.stage);
  }

  // The object that defines a merge between this and `other`: whichever is
  // not a joker. Two jokers return null (they simply cancel out).
  #mergeBase(other) {
    if (!this.wild) return this;
    return other.wild ? null : other;
  }

  // Stage a merge with `other` is scored at.
  mergeStage(other) {
    return this.#mergeBase(other)?.stage ?? 0;
  }

  // What is left after merging with `other`: the next stage, or null when
  // the objects clear the slot (two finals, or two jokers).
  mergedWith(other) {
    const base = this.#mergeBase(other);
    if (!base || base.isFinal) return null;
    return new GameObject(base.cat, base.stage + 1);
  }
}
