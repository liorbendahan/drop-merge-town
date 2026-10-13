// The overlay screens: main menu, dashboard, tutorial and game over. Owns
// their DOM and buttons; the game plugs in what should happen through the
// handlers passed to the constructor.
class Screens {
  #overlay;
  #screens;
  #handlers;
  #tutorialTimer = null;

  // handlers: { onStart(), onSaveScore(name), getScores() -> [{name, score}] }
  constructor(handlers) {
    this.#handlers = handlers;
    const $ = (id) => document.getElementById(id);
    this.#overlay = $('overlay');
    this.#screens = {
      menu: $('screen-menu'),
      dashboard: $('screen-dashboard'),
      tutorial: $('screen-tutorial'),
      gameover: $('screen-gameover'),
    };

    $('btn-start').addEventListener('click', () => handlers.onStart());
    $('btn-again').addEventListener('click', () => handlers.onStart());
    $('btn-dashboard').addEventListener('click', () => this.showDashboard());
    $('btn-back').addEventListener('click', () => this.showMenu());
    $('btn-menu').addEventListener('click', () => this.showMenu());
    $('btn-skip').addEventListener('click', () => this.#finishTutorial());
    $('save-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('player-name').value.trim() || 'Anonymous';
      $('save-form').classList.add('hidden'); // one save per game
      handlers.onSaveScore(name);
      this.showDashboard();
    });
  }

  #show(name) {
    this.#overlay.classList.toggle('hidden', !name);
    for (const key in this.#screens) {
      this.#screens[key].classList.toggle('hidden', key !== name);
    }
  }

  hide() {
    this.#show(null);
  }

  showMenu() {
    this.#show('menu');
  }

  // The menu's list of families and their three stages.
  buildChains(categories) {
    const list = document.getElementById('chains');
    list.replaceChildren();
    categories.forEach((category, cat) => {
      const li = document.createElement('li');
      li.title = category.title;
      category.labels.forEach((label, stage) => {
        if (stage) li.append('›');
        const img = document.createElement('img');
        img.src = new GameObject(cat, stage).assetPath;
        img.alt = label;
        li.appendChild(img);
      });
      list.appendChild(li);
    });
  }

  showDashboard() {
    const scores = this.#handlers.getScores();
    const list = document.getElementById('score-list');
    list.replaceChildren();
    for (const entry of scores) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = entry.name;
      const pts = document.createElement('span');
      pts.className = 'pts';
      pts.textContent = entry.score;
      li.append(name, pts);
      list.appendChild(li);
    }
    document.getElementById('score-empty').classList.toggle('hidden', scores.length > 0);
    this.#show('dashboard');
  }

  showGameOver(score, isRecord) {
    document.getElementById('gameover-title').textContent = isRecord ? 'New record! 🏆' : "Time's up!";
    document.getElementById('final-score').textContent = score;
    document.getElementById('save-form').classList.remove('hidden');
    this.#show('gameover');
    document.getElementById('player-name').focus();
  }

  // ---- Tutorial -------------------------------------------------------------
  // Shows the three tips with a countdown, then calls onDone. The player can
  // skip with the button; either way onDone runs exactly once.

  #tutorialDone = null;

  showTutorial(seconds, onDone) {
    this.#tutorialDone = onDone;
    const count = document.getElementById('tutorial-count');
    const bar = document.getElementById('tutorial-bar');
    let left = seconds;
    count.textContent = left;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    this.#show('tutorial');
    // Next frame, so the bar animates from full to empty.
    requestAnimationFrame(() => {
      bar.style.transition = `width ${seconds}s linear`;
      bar.style.width = '0%';
    });
    this.#tutorialTimer = setInterval(() => {
      left--;
      if (left > 0) {
        count.textContent = left;
      } else {
        this.#finishTutorial();
      }
    }, 1000);
  }

  #finishTutorial() {
    clearInterval(this.#tutorialTimer);
    this.#tutorialTimer = null;
    const done = this.#tutorialDone;
    this.#tutorialDone = null;
    done?.();
  }
}
