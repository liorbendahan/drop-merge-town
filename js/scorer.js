// Score, streak, combo and fever. The only place that knows how points are
// counted or how fast the spawner should move for the current streak.
class Scorer {
  #cfg;

  constructor(config) {
    this.#cfg = config;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.streak = 0;    // consecutive successful matches
    this.feverLeft = 0; // seconds of fever remaining
  }

  get inCombo() {
    return this.streak > this.#cfg.COMBO_AFTER;
  }

  get inFever() {
    return this.feverLeft > 0;
  }

  // 1 at the start of fever, 0 when it is about to end.
  get feverFraction() {
    return this.feverLeft / this.#cfg.FEVER_SECONDS;
  }

  // Spawner speed only rises during a combo and resets when it breaks.
  get speed() {
    const level = Math.max(0, this.streak - this.#cfg.COMBO_AFTER);
    return Math.min(this.#cfg.MAX_SPEED, this.#cfg.BASE_SPEED * this.#cfg.COMBO_SPEEDUP ** level);
  }

  // Count a successful match at `stage`. Returns what it was worth and
  // whether this match switched fever on.
  recordMatch(stage) {
    this.streak++;
    const combo = this.inCombo;
    let points = this.#cfg.STAGE_POINTS[stage] + (combo ? this.#cfg.COMBO_BONUS : 0);

    let feverStarted = false;
    if (this.streak >= this.#cfg.FEVER_STREAK) {
      feverStarted = !this.inFever;
      this.feverLeft = this.#cfg.FEVER_SECONDS; // every match keeps fever alive
    }
    if (this.inFever) points *= this.#cfg.FEVER_MULTIPLIER;

    this.score += points;
    return { points, combo, fever: this.inFever, feverStarted };
  }

  // A mismatch breaks the streak and ends fever at once.
  recordMiss() {
    this.streak = 0;
    this.feverLeft = 0;
  }

  // Advance the fever timer. Returns true on the tick fever ran out.
  update(dt) {
    if (!this.inFever) return false;
    this.feverLeft = Math.max(0, this.feverLeft - dt);
    return !this.inFever;
  }
}
