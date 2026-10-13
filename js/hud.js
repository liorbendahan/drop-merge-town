// The strip above the board (score, streak, next, time) and the tool
// buttons below it. Only displays values; it never computes them.
class Hud {
  #score;
  #streak;
  #streakPill;
  #next;
  #time;
  #timePill;
  #trash;
  #sound;
  #shownScore = 0;
  #shownStreak = 0;

  constructor() {
    const $ = (id) => document.getElementById(id);
    this.#score = $('score');
    this.#streak = $('streak');
    this.#streakPill = $('streak-pill');
    this.#next = $('next');
    this.#time = $('time');
    this.#timePill = $('time-pill');
    this.#trash = $('btn-trash');
    this.#sound = $('btn-sound');
  }

  static #bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  setScore(score) {
    if (score === this.#shownScore) return;
    if (score > this.#shownScore) Hud.#bump(this.#score);
    this.#shownScore = score;
    this.#score.textContent = score;
  }

  setStreak(streak, combo, fever, feverFraction) {
    if (streak !== this.#shownStreak) {
      if (streak > this.#shownStreak) Hud.#bump(this.#streak);
      this.#shownStreak = streak;
    }
    this.#streak.textContent = fever ? `${streak} ⚡` : combo ? `${streak} 🔥` : streak;
    this.#streakPill.classList.toggle('combo', combo && !fever);
    this.#streakPill.classList.toggle('fever', fever);
    this.#streakPill.style.setProperty('--fever', fever ? feverFraction : 0);
  }

  setTime(seconds, danger) {
    this.#time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    this.#timePill.classList.toggle('danger', danger);
  }

  setNext(obj) {
    ObjectView.render(this.#next, obj);
  }

  // `fraction` is 1 right after a discard and 0 when the bin is ready.
  setTrash(fraction) {
    this.#trash.classList.toggle('cooling', fraction > 0);
    this.#trash.style.setProperty('--cd', fraction);
  }

  setMuted(muted) {
    this.#sound.querySelector('.icon').textContent = muted ? '🔇' : '🔊';
    this.#sound.classList.toggle('off', muted);
  }
}
