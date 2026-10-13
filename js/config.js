// Every number that tunes the game lives here, so balancing never means
// hunting through the other files. Everything is frozen: config is read-only.

const CONFIG = Object.freeze({
  SLOT_COUNT: 6,
  GAME_SECONDS: 60,

  // Spawner movement (px, seconds)
  BASE_SPEED: 320,       // glide speed outside a combo
  COMBO_SPEEDUP: 1.18,   // speed multiplier for every match of a combo
  MAX_SPEED: 900,
  DROP_SPEED: 150,       // initial fall speed
  GRAVITY: 5000,         // fall acceleration
  PIECE_START_Y: 12,     // where the moving object hangs below the top edge

  // Scoring
  STAGE_POINTS: [10, 20, 40], // a match at stage 1 / 2 / 3
  COMBO_AFTER: 2,        // streak length that starts a combo
  COMBO_BONUS: 10,       // extra points per combo match
  FEVER_STREAK: 6,       // streak length that starts fever mode
  FEVER_SECONDS: 8,      // fever lasts this long after the latest match
  FEVER_MULTIPLIER: 2,   // points multiplier during fever
  CLEAR_TIME_BONUS: 3,   // seconds gained when two final-stage objects clear

  // Helpers
  WILD_CHANCE: 0.08,     // chance that a spawned object is a joker
  TRASH_COOLDOWN: 3,     // seconds before the discard bin can be used again
  TUTORIAL_SECONDS: 3,   // how long the first-play tutorial stays up
  MAX_SAVED_SCORES: 10,

  STORAGE_KEYS: Object.freeze({
    scores: 'mergefall.scores',
    muted: 'mergefall.muted',
    tutorialSeen: 'mergefall.tutorialSeen',
  }),
});

// Object families. Art lives in  assets/{name}-{stage}.png  (building-1 ...
// food-3, wild-1); replace a file to change the art, the names are the only
// contract. Current files are Microsoft Fluent Emoji 3D (MIT licence).
const ASSET_DIR = 'assets';

const CATEGORIES = Object.freeze([
  { name: 'building', title: 'Buildings', color: '#19b8ff', labels: ['Shack', 'House', 'Skyscraper'], glyphs: ['🛖', '🏠', '🏙️'] },
  { name: 'food',     title: 'Food',      color: '#ffb21e', labels: ['Wheat', 'Bread', 'Meal'],       glyphs: ['🌾', '🍞', '🍲'] },
  { name: 'animal',   title: 'Animals',   color: '#ff5fb7', labels: ['Egg', 'Chick', 'Rooster'],      glyphs: ['🥚', '🐤', '🐓'] },
].map(Object.freeze));

// The joker matches anything. It has a single stage.
const WILD_CATEGORY = Object.freeze({
  name: 'wild', title: 'Joker', color: '#ff3fd0', labels: ['Joker'], glyphs: ['🃏'],
});

const LAST_STAGE = 2;
