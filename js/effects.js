// What the player sees and hears for each game event. Combines the board
// view's animations, the particle layer and the sound player, so the game
// logic only has to say *what* happened.
class Effects {
  static MERGE_COLORS = ['#ffb300', '#ffd24a', '#12c27a', '#5ee0a0'];
  static CLEAR_COLORS = ['#ffb300', '#ff7a1a', '#12c27a', '#19b8ff', '#ff5fb7', '#7357ff'];
  static MISS_COLORS = ['#ff3b5c', '#ff7a8a', '#c81e3f', '#ff9db0'];
  static FEVER_COLORS = ['#ff5fb7', '#19b8ff', '#ffb300', '#7357ff', '#12c27a'];

  #view;
  #particles;
  #sound;

  constructor(view, particles, sound) {
    this.#view = view;
    this.#particles = particles;
    this.#sound = sound;
  }

  drop() {
    this.#sound.play('drop');
  }

  // A faint trail behind the falling object.
  trail(x, y, obj) {
    this.#particles.burst(x, y, [obj.color], 1, { speed: 40, gravity: 0, life: 0.35, lift: 0 });
  }

  land(i, obj) {
    const { x, y } = this.#view.slotPoint(i);
    this.#view.animateLand(i);
    this.#particles.burst(x, y + 20, [obj.color], 10, { speed: 160, life: 0.4, lift: 60 });
    this.#sound.play('land');
  }

  merge(i, points, combo, cleared) {
    const { x, y } = this.#view.slotPoint(i);
    this.#view.flash(i, cleared ? 'score' : 'good');
    this.#view.animatePop(i);
    this.#particles.shockwave(x, y, cleared ? '#ffb300' : '#12c27a');
    this.#particles.burst(x, y, cleared ? Effects.CLEAR_COLORS : Effects.MERGE_COLORS, cleared ? 90 : 42, { speed: cleared ? 520 : 360 });
    this.#view.floatText(i, combo ? `+${points} COMBO` : `+${points}`, combo ? 'combo' : '');
    this.#sound.play(cleared ? 'clear' : 'merge');
  }

  miss(i) {
    const { x, y } = this.#view.slotPoint(i);
    this.#view.flash(i, 'bad');
    this.#view.shake();
    this.#particles.shockwave(x, y, '#ff3b5c');
    this.#particles.burst(x, y, Effects.MISS_COLORS, 30, { speed: 420, gravity: 1100, life: 0.9, shard: true });
    this.#particles.burst(x, y, Effects.MISS_COLORS, 18, { speed: 260, life: 0.5 });
    this.#sound.play('miss');
  }

  swap(i) {
    const { x, y } = this.#view.slotPoint(i);
    this.#particles.shockwave(x, y, '#19b8ff');
    this.#view.animateLand(i);
    this.#sound.play('swap');
  }

  discard(x, y, obj) {
    this.#particles.burst(x, y, ['#9aa3c7', '#c7cdea', obj.color], 18, { speed: 220, life: 0.5 });
    this.#sound.play('discard');
  }

  timeBonus(seconds) {
    this.#view.announce(`+${seconds}s`, 'time');
  }

  feverStart() {
    this.#view.announce('FEVER ×2!', 'fever');
    const x = this.#view.width / 2;
    const y = this.#view.height / 2;
    this.#particles.burst(x, y, Effects.FEVER_COLORS, 120, { speed: 700, gravity: 300, life: 1.2 });
    this.#sound.play('fever');
  }

  tick() {
    this.#sound.play('tick');
  }

  gameOver() {
    this.#sound.play('over');
  }
}
