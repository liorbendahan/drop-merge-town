// ---- Tunables -------------------------------------------------------------
const SLOT_COUNT = 6;
const GAME_SECONDS = 120;
const BASE_SPEED = 320;      // spawner px per second at score 0
const SPEED_PER_POINT = 1.2; // extra px per second for every point scored
const MAX_SPEED = 800;
const FALL_SPEED = 1100;     // px per second
const MATCH_POINTS = 10;     // every successful match
const COMBO_BONUS = 10;      // extra per match once the streak passes COMBO_AFTER
const COMBO_AFTER = 2;
const MAX_SAVED_SCORES = 10;
const STORAGE_KEY = 'dropMergeTown.scores';

// Emoji are placeholders until real art is chosen.
const CATEGORIES = [
  { name: 'building', stages: ['🛖', '🏠', '🏙️'] },
  { name: 'food',     stages: ['🌾', '🍞', '🍲'] },
  { name: 'animal',   stages: ['🥚', '🐤', '🐓'] },
];
const LAST_STAGE = 2;

// ---- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const pieceEl = $('piece');
const slotsEl = $('slots');
const overlayEl = $('overlay');
const scoreEl = $('score');
const streakEl = $('streak');
const nextEl = $('next');
const timeEl = $('time');
const screens = {
  menu: $('screen-menu'),
  dashboard: $('screen-dashboard'),
  gameover: $('screen-gameover'),
};

const slotEls = [];
for (let i = 0; i < SLOT_COUNT; i++) {
  const el = document.createElement('div');
  el.className = 'slot';
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); // a slot click swaps, it never drops
    swapWithSlot(i);
  });
  slotsEl.appendChild(el);
  slotEls.push(el);
}

// ---- State ----------------------------------------------------------------
let slots = new Array(SLOT_COUNT).fill(null); // each entry is null or { cat, stage }
let piece = null;  // the object currently moving / falling
let nextObj = null;
let score = 0;
let streak = 0;    // consecutive successful matches
let timeLeft = GAME_SECONDS;
let running = false;
let lastFrame = 0;

function icon(obj) {
  return CATEGORIES[obj.cat].stages[obj.stage];
}

function same(a, b) {
  return a.cat === b.cat && a.stage === b.stage;
}

function randomBase() {
  return { cat: Math.floor(Math.random() * CATEGORIES.length), stage: 0 };
}

// ---- Screens --------------------------------------------------------------
function showScreen(name) {
  overlayEl.classList.toggle('hidden', !name);
  for (const key in screens) {
    screens[key].classList.toggle('hidden', key !== name);
  }
}

// ---- High scores ----------------------------------------------------------
function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveScore(name, value) {
  const scores = loadScores();
  scores.push({ name, score: value });
  scores.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, MAX_SAVED_SCORES)));
  } catch {
    // storage unavailable (e.g. private window): the score just isn't kept
  }
}

function showDashboard() {
  const scores = loadScores();
  const list = $('score-list');
  list.textContent = '';
  for (const entry of scores) {
    const li = document.createElement('li');
    li.textContent = `${entry.name} — ${entry.score}`;
    list.appendChild(li);
  }
  $('score-empty').classList.toggle('hidden', scores.length > 0);
  showScreen('dashboard');
}

// ---- Game flow ------------------------------------------------------------
function startGame() {
  slots = new Array(SLOT_COUNT).fill(null);
  score = 0;
  streak = 0;
  timeLeft = GAME_SECONDS;
  nextObj = randomBase();
  running = true;
  showScreen(null);
  spawnPiece();
  render();
}

function endGame() {
  running = false;
  timeLeft = 0;
  pieceEl.textContent = '';
  render();
  $('final-score').textContent = score;
  $('save-form').classList.remove('hidden');
  showScreen('gameover');
  $('player-name').focus();
}

function spawnPiece() {
  piece = { ...nextObj, x: 0, y: 0, dir: 1, falling: false, targetSlot: 0 };
  nextObj = randomBase();
}

function dropPiece() {
  if (piece.falling) return;
  const centerX = piece.x + pieceEl.offsetWidth / 2;
  const slotWidth = boardEl.clientWidth / SLOT_COUNT;
  piece.targetSlot = Math.min(SLOT_COUNT - 1, Math.floor(centerX / slotWidth));
  piece.falling = true;
}

// Swap the moving object with the content of a filled slot.
function swapWithSlot(i) {
  if (!running || piece.falling || !slots[i]) return;
  const held = { cat: piece.cat, stage: piece.stage };
  piece.cat = slots[i].cat;
  piece.stage = slots[i].stage;
  slots[i] = held;
  render();
}

// ---- Match / mismatch rules -----------------------------------------------
function flash(i, kind) {
  const el = slotEls[i];
  el.classList.remove('good', 'bad', 'score');
  void el.offsetWidth; // restart the animation
  el.classList.add(kind);
}

function resolveDrop(i, obj) {
  const current = slots[i];
  if (!current) {
    slots[i] = obj;
    return;
  }

  if (!same(current, obj)) {
    // Mismatch: both objects are destroyed, no points, streak lost.
    slots[i] = null;
    streak = 0;
    flash(i, 'bad');
    return;
  }

  streak++;
  score += MATCH_POINTS + (streak > COMBO_AFTER ? COMBO_BONUS : 0);
  if (current.stage === LAST_STAGE) {
    slots[i] = null; // two final-stage objects clear the slot
    flash(i, 'score');
  } else {
    current.stage++;
    flash(i, 'good');
  }
}

// ---- Loop -----------------------------------------------------------------
function update(dt) {
  timeLeft -= dt;
  if (timeLeft <= 0) {
    endGame();
    return;
  }

  if (!piece.falling) {
    const speed = Math.min(MAX_SPEED, BASE_SPEED + score * SPEED_PER_POINT);
    const maxX = boardEl.clientWidth - pieceEl.offsetWidth;
    piece.x += piece.dir * speed * dt;
    if (piece.x >= maxX) {
      piece.x = maxX;
      piece.dir = -1;
    } else if (piece.x <= 0) {
      piece.x = 0;
      piece.dir = 1;
    }
  } else {
    piece.y += FALL_SPEED * dt;
    if (piece.y >= slotsEl.offsetTop) {
      resolveDrop(piece.targetSlot, { cat: piece.cat, stage: piece.stage });
      spawnPiece();
    }
  }
}

function render() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    slotEls[i].textContent = slots[i] ? icon(slots[i]) : '';
    slotEls[i].classList.toggle('filled', !!slots[i]);
  }
  scoreEl.textContent = score;
  streakEl.textContent = streak > COMBO_AFTER ? `${streak} (combo!)` : streak;
  const secs = Math.ceil(timeLeft);
  timeEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  if (running) {
    nextEl.textContent = icon(nextObj);
    pieceEl.textContent = icon(piece);
    pieceEl.style.transform = `translate(${piece.x}px, ${piece.y}px)`;
  }
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (running) {
    update(dt);
    render();
  }
  requestAnimationFrame(frame);
}

// ---- Input ----------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !running) return; // menus keep normal typing
  e.preventDefault(); // stop the page from scrolling
  if (!e.repeat) dropPiece();
});

boardEl.addEventListener('pointerdown', () => {
  if (running) dropPiece();
});

$('btn-start').addEventListener('click', startGame);
$('btn-again').addEventListener('click', startGame);
$('btn-dashboard').addEventListener('click', showDashboard);
$('btn-back').addEventListener('click', () => showScreen('menu'));
$('btn-menu').addEventListener('click', () => showScreen('menu'));

$('save-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('player-name').value.trim() || 'Anonymous';
  saveScore(name, score);
  $('save-form').classList.add('hidden'); // one save per game
  showDashboard();
});

showScreen('menu');
requestAnimationFrame(frame);
