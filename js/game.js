// The game itself: owns the model (board, scorer, spawner), runs the frame
// loop and tells the views and effects what to show. Input and screens call
// its public actions; it never reads the DOM directly.
class Game {
  #cfg;
  #view;
  #hud;
  #effects;
  #sound;
  #screens;
  #storage;
  #highScores;
  #particles;

  #board;
  #scorer;
  #spawner;
  #next = null;      // the object shown in the "next" preview
  #timeLeft = 0;
  #lastSec = 0;      // last whole second shown, for the countdown tick
  #trashCooldown = 0;
  #running = false;
  #lastFrame = 0;

  constructor({ config, view, hud, effects, sound, screens, storage, highScores, particles }) {
    this.#cfg = config;
    this.#view = view;
    this.#hud = hud;
    this.#effects = effects;
    this.#sound = sound;
    this.#screens = screens;
    this.#storage = storage;
    this.#highScores = highScores;
    this.#particles = particles;

    this.#board = new Board(config.SLOT_COUNT);
    this.#scorer = new Scorer(config);
    this.#spawner = new Spawner(config);
  }

  get running() {
    return this.#running;
  }

  // ---- Lifecycle ------------------------------------------------------------

  boot() {
    this.#screens.buildChains(CATEGORIES);
    this.#hud.setMuted(this.#sound.muted);
    this.#layout();
    window.addEventListener('resize', () => this.#layout());
    this.#screens.showMenu();
    requestAnimationFrame((now) => this.#frame(now));
  }

  // Entry point from the menu: first-time players get the tutorial first.
  start() {
    const key = this.#cfg.STORAGE_KEYS.tutorialSeen;
    if (this.#storage.get(key, false)) {
      this.#begin();
      return;
    }
    this.#screens.showTutorial(this.#cfg.TUTORIAL_SECONDS, () => {
      this.#storage.set(key, true);
      this.#begin();
    });
  }

  #begin() {
    this.#board.reset();
    this.#scorer.reset();
    this.#timeLeft = this.#cfg.GAME_SECONDS;
    this.#lastSec = this.#cfg.GAME_SECONDS;
    this.#trashCooldown = 0;
    this.#next = GameObject.random();
    this.#running = true;
    this.#screens.hide();
    this.#view.setFever(false);
    this.#layout();
    this.#spawnNext();
    this.#render();
  }

  #end() {
    this.#running = false;
    this.#timeLeft = 0;
    this.#trashCooldown = 0;
    this.#render();
    this.#view.clearPiece();
    this.#view.setTarget(-1);
    this.#view.hideShadow();
    this.#view.setFever(false);
    this.#screens.showGameOver(this.#scorer.score, this.#highScores.isRecord(this.#scorer.score));
    this.#effects.gameOver();
  }

  saveScore(name) {
    this.#highScores.add(name, this.#scorer.score);
  }

  get scores() {
    return this.#highScores.all();
  }

  #layout() {
    this.#view.layout();
    this.#particles.resize(this.#view.width, this.#view.height);
  }

  // ---- Player actions -------------------------------------------------------

  drop() {
    if (!this.#running) return;
    const m = this.#view.metrics;
    const target = this.#view.nearestSlot(this.#spawner.centerX(m.pieceSize));
    if (this.#spawner.drop(target)) this.#effects.drop();
  }

  // Throw the moving object away and bring in the next one: the way out
  // when nothing on the board can be matched.
  discard() {
    if (!this.#running || this.#spawner.falling || this.#trashCooldown > 0) return;
    const half = this.#view.metrics.pieceSize / 2;
    this.#effects.discard(this.#spawner.x + half, this.#spawner.y + half, this.#spawner.object);
    this.#trashCooldown = this.#cfg.TRASH_COOLDOWN;
    this.#spawnNext();
    this.#render();
  }

  // Exchange the moving object with the one standing in slot i.
  swapSlot(i) {
    if (!this.#running || this.#spawner.falling || this.#board.isEmpty(i)) return;
    const held = this.#spawner.swapObject(this.#board.get(i));
    this.#board.set(i, held);
    this.#effects.swap(i);
    this.#view.animateSpawn();
    this.#render();
  }

  toggleMute() {
    this.#sound.muted = !this.#sound.muted;
    this.#hud.setMuted(this.#sound.muted);
  }

  // ---- Frame loop -----------------------------------------------------------

  #frame(now) {
    const dt = Math.min((now - this.#lastFrame) / 1000, 0.05); // cap after a tab switch
    this.#lastFrame = now;
    if (this.#running) {
      this.#update(dt);
      this.#render();
    }
    this.#particles.update(dt); // keeps running so effects finish after the game ends
    requestAnimationFrame((t) => this.#frame(t));
  }

  #update(dt) {
    this.#timeLeft -= dt;
    if (this.#timeLeft <= 0) {
      this.#end();
      return;
    }
    const sec = Math.ceil(this.#timeLeft);
    if (sec !== this.#lastSec) {
      this.#lastSec = sec;
      if (sec <= 5) this.#effects.tick();
    }

    this.#trashCooldown = Math.max(0, this.#trashCooldown - dt);
    if (this.#scorer.update(dt)) this.#view.setFever(false); // fever just ran out

    const m = this.#view.metrics;
    const s = this.#spawner;
    const landed = s.update(dt, {
      speed: this.#scorer.speed,
      maxX: this.#view.width - m.pieceSize,
      targetX: s.falling ? m.slotCenters[s.targetSlot] - m.pieceSize / 2 : 0,
      landY: m.landY,
    });

    if (s.falling) {
      this.#effects.trail(s.x + m.pieceSize / 2, s.y + m.pieceSize / 2, s.object);
    } else {
      this.#view.setTarget(this.#view.nearestSlot(s.centerX(m.pieceSize)));
    }
    if (landed) this.#land();
  }

  // The falling object has reached its slot: apply the rules and react.
  #land() {
    const i = this.#spawner.targetSlot;
    const obj = this.#spawner.object;
    const result = this.#board.drop(i, obj);

    switch (result.kind) {
      case 'land':
        this.#effects.land(i, obj);
        break;
      case 'miss':
        this.#scorer.recordMiss();
        this.#view.setFever(false);
        this.#effects.miss(i);
        break;
      case 'merge':
      case 'clear': {
        const cleared = result.kind === 'clear';
        const { points, combo, feverStarted } = this.#scorer.recordMatch(result.stage);
        if (cleared) {
          this.#timeLeft += this.#cfg.CLEAR_TIME_BONUS;
          this.#effects.timeBonus(this.#cfg.CLEAR_TIME_BONUS);
        }
        this.#effects.merge(i, points, combo, cleared);
        if (feverStarted) {
          this.#view.setFever(true);
          this.#effects.feverStart();
        }
        break;
      }
    }
    this.#spawnNext();
  }

  #spawnNext() {
    this.#spawner.spawn(this.#next);
    this.#next = GameObject.random();
    this.#view.animateSpawn();
  }

  #render() {
    const scorer = this.#scorer;
    this.#view.setSlots(this.#board.toArray());
    this.#hud.setScore(scorer.score);
    this.#hud.setStreak(scorer.streak, scorer.inCombo, scorer.inFever, scorer.feverFraction);
    this.#hud.setTime(Math.ceil(this.#timeLeft), this.#running && this.#timeLeft <= 10);
    this.#hud.setTrash(this.#trashCooldown / this.#cfg.TRASH_COOLDOWN);

    if (!this.#running) return;
    const s = this.#spawner;
    this.#hud.setNext(this.#next);
    this.#view.setPiece(s.object, s.x, s.y, s.lean);
    if (s.falling) {
      this.#view.setShadow(s.targetSlot, s.fallProgress(this.#view.metrics.landY));
    } else {
      this.#view.hideShadow();
    }
  }
}
