// Composition root: builds every part and wires them together. This is the
// only file that knows the concrete classes exist side by side.
(() => {
  const storage = new Storage();
  const highScores = new HighScores(storage, CONFIG.STORAGE_KEYS.scores, CONFIG.MAX_SAVED_SCORES);
  const sound = new SoundPlayer(storage, CONFIG.STORAGE_KEYS.muted);
  const view = new BoardView(document.getElementById('board'), CONFIG.SLOT_COUNT);
  const particles = new ParticleSystem(document.getElementById('fx'));
  const hud = new Hud();
  const effects = new Effects(view, particles, sound);

  let game;
  const screens = new Screens({
    onStart: () => game.start(),
    onSaveScore: (name) => game.saveScore(name),
    getScores: () => game.scores,
  });

  game = new Game({ config: CONFIG, view, hud, effects, sound, screens, storage, highScores, particles });
  new Input(game, view);

  ObjectView.preload();
  game.boot();

  window.mergefall = game; // handy for debugging from the console
})();
