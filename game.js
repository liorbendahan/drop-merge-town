// ---- Tunables -------------------------------------------------------------
const SLOT_COUNT = 6;
const GAME_SECONDS = 60;
const BASE_SPEED = 320;      // spawner px per second outside a combo
const COMBO_SPEEDUP = 1.18;  // speed multiplier for every match of a combo
const MAX_SPEED = 900;
const DROP_SPEED = 150;      // initial fall speed, px per second
const GRAVITY = 5000;        // fall acceleration, px per second^2
const STAGE_POINTS = [10, 20, 40]; // a match at stage 1 / 2 / 3
const COMBO_BONUS = 10;      // extra per match once the streak passes COMBO_AFTER
const COMBO_AFTER = 2;
const CLEAR_TIME_BONUS = 3;  // seconds gained when two final-stage objects clear
const TRASH_COOLDOWN = 3;    // seconds before the discard bin can be used again
const MAX_SAVED_SCORES = 10;
const STORAGE_KEY = 'mergefall.scores';
const MUTE_KEY = 'mergefall.muted';

// ---- Object families ------------------------------------------------------
// Art lives in  assets/{name}-{stage}.png  (building-1 ... treasure-3).
// The current files are Microsoft Fluent Emoji 3D (MIT licence); replace any
// of them to change the art. A missing file falls back to a glyph tile.
// Families with unlockAt > 0 only start spawning once the score reaches it.
const ASSET_DIR = 'assets';
const CATEGORIES = [
  { name: 'building', title: 'Buildings', color: '#19b8ff', unlockAt: 0,   labels: ['Shack', 'House', 'Skyscraper'], glyphs: ['🛖', '🏠', '🏙️'] },
  { name: 'food',     title: 'Food',      color: '#ffb21e', unlockAt: 0,   labels: ['Wheat', 'Bread', 'Meal'],       glyphs: ['🌾', '🍞', '🍲'] },
  { name: 'animal',   title: 'Animals',   color: '#ff5fb7', unlockAt: 0,   labels: ['Egg', 'Chick', 'Rooster'],      glyphs: ['🥚', '🐤', '🐓'] },
  { name: 'nature',   title: 'Nature',    color: '#2ecc71', unlockAt: 50,  labels: ['Seed', 'Plant', 'Tree'],        glyphs: ['🌱', '🪴', '🌳'] },
  { name: 'treasure', title: 'Treasure',  color: '#a855f7', unlockAt: 120, labels: ['Coin', 'Gem', 'Crown'],         glyphs: ['🪙', '💎', '👑'] },
];
const LAST_STAGE = 2;

function assetPath(obj) {
  return `${ASSET_DIR}/${CATEGORIES[obj.cat].name}-${obj.stage + 1}.png`;
}

const loadedAssets = new Set();
CATEGORIES.forEach((category, cat) => {
  category.glyphs.forEach((_, stage) => {
    const path = assetPath({ cat, stage });
    const img = new Image();
    img.onload = () => loadedAssets.add(path);
    img.src = path;
  });
});

// ---- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const pieceEl = $('piece');
const pieceObjEl = pieceEl.querySelector('.obj');
const beamEl = $('beam');
const shadowEl = $('drop-shadow');
const slotsEl = $('slots');
const overlayEl = $('overlay');
const scoreEl = $('score');
const streakEl = $('streak');
const nextEl = $('next');
const timeEl = $('time');
const trashEl = $('btn-trash');
const soundEl = $('btn-sound');
const screens = {
  menu: $('screen-menu'),
  dashboard: $('screen-dashboard'),
  gameover: $('screen-gameover'),
};

const slotEls = [];
const wellEls = [];
const slotObjEls = [];
for (let i = 0; i < SLOT_COUNT; i++) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const well = document.createElement('div');
  well.className = 'well';
  const stand = document.createElement('div');
  stand.className = 'stand'; // keeps the object upright on the tilted platform
  const obj = document.createElement('div');
  obj.className = 'obj empty';
  stand.appendChild(obj);
  well.appendChild(stand);
  slot.appendChild(well);
  slot.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); // a slot click swaps, it never drops
    swapWithSlot(i);
  });
  slotsEl.appendChild(slot);
  slotEls.push(slot);
  wellEls.push(well);
  slotObjEls.push(obj);
}

// The menu's list of families and their three stages.
function buildChains() {
  const list = $('chains');
  list.replaceChildren();
  CATEGORIES.forEach((category, cat) => {
    const li = document.createElement('li');
    li.title = category.title;
    category.labels.forEach((label, stage) => {
      if (stage) li.append('›');
      const img = document.createElement('img');
      img.src = assetPath({ cat, stage });
      img.alt = label;
      li.appendChild(img);
    });
    if (category.unlockAt) {
      li.classList.add('locked');
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = `🔒 ${category.unlockAt}`;
      li.appendChild(lock);
      li.title += ` (unlocks at ${category.unlockAt} points)`;
    }
    list.appendChild(li);
  });
}

// Restart a CSS animation class on an element.
function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// Draw a game object into an .obj element (image if available, else placeholder).
function setObj(el, obj) {
  const useImg = obj && loadedAssets.has(assetPath(obj));
  const key = obj ? `${obj.cat}-${obj.stage}-${useImg}` : '';
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.replaceChildren();
  if (!obj) {
    el.className = 'obj empty';
    return;
  }
  const category = CATEGORIES[obj.cat];
  el.className = `obj cat-${category.name} stage-${obj.stage + 1} ${useImg ? 'has-img' : 'placeholder'}`;
  el.title = category.labels[obj.stage];
  if (useImg) {
    const img = document.createElement('img');
    img.src = assetPath(obj);
    img.alt = category.labels[obj.stage];
    img.draggable = false;
    el.appendChild(img);
  } else {
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.textContent = category.glyphs[obj.stage];
    el.appendChild(glyph);
  }
}

// ---- Layout ---------------------------------------------------------------
// The slot row is tilted in CSS, so positions are measured from the rendered
// rectangles (which include transforms) rather than from offsetTop/Left.
let pieceSize = 0;
let slotCenters = [];
let slotRects = []; // where each slot's standing object appears, in board px
let landY = 0;      // piece top when it has landed
const PIECE_START_Y = 12;

function layout() {
  const board = boardEl.getBoundingClientRect();
  pieceSize = pieceEl.offsetWidth;
  slotRects = slotObjEls.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - board.left + r.width / 2, top: r.top - board.top, bottom: r.bottom - board.top };
  });
  slotCenters = slotRects.map((r) => r.x);
  landY = slotRects[0].bottom - pieceSize;
  beamEl.style.width = `${slotEls[0].getBoundingClientRect().width}px`;
  shadowEl.style.width = `${pieceSize * 0.9}px`;
  shadowEl.style.height = `${pieceSize * 0.26}px`;
  resizeFx();
  if (shownTarget >= 0) {
    const t = shownTarget;
    shownTarget = -1;
    showTarget(t);
  }
}

function nearestSlot(x) {
  let best = 0;
  for (let i = 1; i < SLOT_COUNT; i++) {
    if (Math.abs(slotCenters[i] - x) < Math.abs(slotCenters[best] - x)) best = i;
  }
  return best;
}

let shownTarget = -1;
function showTarget(i) {
  if (i === shownTarget) return;
  if (shownTarget >= 0) slotEls[shownTarget].classList.remove('target');
  shownTarget = i;
  if (i >= 0) {
    slotEls[i].classList.add('target');
    beamEl.style.transform = `translateX(${slotCenters[i] - beamEl.offsetWidth / 2}px)`;
  }
  beamEl.classList.toggle('hidden', i < 0);
}

// ---- Sound (synthesised, no files) ----------------------------------------
// Each sound is a list of notes: f = frequency, to = slide target, d = length
// in seconds, v = volume, at = delay from the start.
const SOUNDS = {
  drop:    [{ f: 700, to: 250, d: 0.16, type: 'triangle', v: 0.12 }],
  land:    [{ f: 150, to: 90, d: 0.14, type: 'sine', v: 0.3 }],
  merge:   [{ f: 523, d: 0.09, type: 'triangle', v: 0.18 }, { f: 784, d: 0.16, type: 'triangle', v: 0.18, at: 0.08 }],
  clear:   [523, 659, 784, 1047].map((f, i) => ({ f, d: 0.18, type: 'triangle', v: 0.18, at: i * 0.07 })),
  miss:    [{ f: 180, to: 60, d: 0.35, type: 'sawtooth', v: 0.14 }],
  discard: [{ f: 320, to: 180, d: 0.08, type: 'square', v: 0.05 }],
  swap:    [{ f: 440, to: 660, d: 0.1, type: 'sine', v: 0.15 }],
  unlock:  [659, 880, 1319].map((f, i) => ({ f, d: 0.28, type: 'sine', v: 0.18, at: i * 0.1 })),
  tick:    [{ f: 880, d: 0.05, type: 'square', v: 0.035 }],
  over:    [523, 392, 330].map((f, i) => ({ f, d: 0.32, type: 'triangle', v: 0.18, at: i * 0.18 })),
};

let audioCtx = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // storage unavailable: sound just starts on
}

function play(name) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    return; // no Web Audio: play silently
  }
  const now = audioCtx.currentTime;
  for (const n of SOUNDS[name]) {
    const t = now + (n.at || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.f, t);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t + n.d);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(n.v, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + n.d + 0.05);
  }
}

function setMuted(value) {
  muted = value;
  soundEl.querySelector('.icon').textContent = muted ? '🔇' : '🔊';
  soundEl.classList.toggle('off', muted);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
}

// ---- Particle effects -----------------------------------------------------
const fxEl = $('fx');
const fx = fxEl.getContext('2d');
const MAX_PARTICLES = 700;
const MERGE_COLORS = ['#ffb300', '#ffd24a', '#12c27a', '#5ee0a0'];
const CLEAR_COLORS = ['#ffb300', '#ff7a1a', '#12c27a', '#19b8ff', '#ff5fb7', '#7357ff'];
const MISS_COLORS = ['#ff3b5c', '#ff7a8a', '#c81e3f', '#ff9db0'];
let particles = [];

function resizeFx() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fxEl.width = boardEl.clientWidth * dpr;
  fxEl.height = boardEl.clientHeight * dpr;
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burst(x, y, colors, count, opts = {}) {
  const { speed = 340, gravity = 620, life = 0.8, shard = false, lift = 140 } = opts;
  for (let n = 0; n < count && particles.length < MAX_PARTICLES; n++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.25 + Math.random() * 0.75);
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - lift,
      gravity,
      t: 0,
      life: life * (0.6 + Math.random() * 0.6),
      size: shard ? 5 + Math.random() * 8 : 1.8 + Math.random() * 3.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shard,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 16,
    });
  }
}

function shockwave(x, y, color) {
  particles.push({ ring: true, x, y, t: 0, life: 0.5, color });
}

function updateFx(dt) {
  fx.clearRect(0, 0, boardEl.clientWidth, boardEl.clientHeight);
  if (!particles.length) return;
  particles = particles.filter((p) => (p.t += dt) < p.life);
  for (const p of particles) {
    const fade = 1 - p.t / p.life;
    fx.fillStyle = fx.strokeStyle = p.color;
    if (p.ring) {
      fx.globalAlpha = fade;
      fx.lineWidth = 5 * fade;
      fx.beginPath();
      fx.arc(p.x, p.y, 12 + 90 * (1 - fade * fade), 0, Math.PI * 2);
      fx.stroke();
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.shard) {
      p.rot += p.spin * dt;
      fx.globalAlpha = fade;
      fx.save();
      fx.translate(p.x, p.y);
      fx.rotate(p.rot);
      fx.beginPath();
      fx.moveTo(-p.size, p.size * 0.6);
      fx.lineTo(p.size * 0.9, p.size * 0.4);
      fx.lineTo(0, -p.size);
      fx.fill();
      fx.restore();
    } else {
      fx.globalAlpha = fade * 0.22; // soft halo
      fx.beginPath();
      fx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      fx.fill();
      fx.globalAlpha = fade;      // bright core
      fx.beginPath();
      fx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      fx.fill();
    }
  }
  fx.globalAlpha = 1;
}

function flashSlot(i, kind) {
  slotEls[i].classList.remove('good', 'bad', 'score');
  retrigger(slotEls[i], kind);
}

function slotPoint(i) {
  return { x: slotCenters[i], y: (slotRects[i].top + slotRects[i].bottom) / 2 };
}

function floatText(i, text, combo) {
  const el = document.createElement('div');
  el.className = combo ? 'float-text combo' : 'float-text';
  el.textContent = text;
  el.style.left = `${slotCenters[i]}px`;
  el.style.top = `${slotRects[i].top}px`;
  el.addEventListener('animationend', () => el.remove());
  boardEl.appendChild(el);
}

// Big centred message, e.g. "+3s" or "Nature unlocked!".
function announce(text, kind = '') {
  const el = document.createElement('div');
  el.className = `announce ${kind}`;
  el.textContent = text;
  el.addEventListener('animationend', () => el.remove());
  boardEl.appendChild(el);
}

function fxLand(i, obj) {
  const { x, y } = slotPoint(i);
  retrigger(wellEls[i], 'land');
  burst(x, y + pieceSize / 3, [CATEGORIES[obj.cat].color], 10, { speed: 160, life: 0.4, lift: 60 });
  play('land');
}

function fxMerge(i, points, combo, cleared) {
  const { x, y } = slotPoint(i);
  flashSlot(i, cleared ? 'score' : 'good');
  retrigger(wellEls[i], 'pop');
  shockwave(x, y, cleared ? '#ffb300' : '#12c27a');
  burst(x, y, cleared ? CLEAR_COLORS : MERGE_COLORS, cleared ? 90 : 42, { speed: cleared ? 520 : 360 });
  floatText(i, combo ? `+${points} COMBO` : `+${points}`, combo);
  play(cleared ? 'clear' : 'merge');
}

function fxMismatch(i) {
  const { x, y } = slotPoint(i);
  flashSlot(i, 'bad');
  retrigger(boardEl, 'shake');
  shockwave(x, y, '#ff3b5c');
  burst(x, y, MISS_COLORS, 30, { speed: 420, gravity: 1100, life: 0.9, shard: true });
  burst(x, y, MISS_COLORS, 18, { speed: 260, life: 0.5 });
  play('miss');
}

// ---- State ----------------------------------------------------------------
let slots = new Array(SLOT_COUNT).fill(null); // each entry is null or { cat, stage }
let piece = null;  // the object currently moving / falling
let nextObj = null;
let score = 0;
let streak = 0;    // consecutive successful matches
let unlocked = 0;  // how many families (from the front of CATEGORIES) can spawn
let timeLeft = GAME_SECONDS;
let lastSec = 0;   // last whole second shown, for the countdown tick
let trashCooldown = 0; // seconds until the bin is ready
let running = false;
let lastFrame = 0;

function same(a, b) {
  return a.cat === b.cat && a.stage === b.stage;
}

function unlockedCount() {
  return CATEGORIES.filter((c) => c.unlockAt <= score).length;
}

function randomBase() {
  return { cat: Math.floor(Math.random() * unlocked), stage: 0 };
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
  $('score-empty').classList.toggle('hidden', scores.length > 0);
  showScreen('dashboard');
}

// ---- Game flow ------------------------------------------------------------
function startGame() {
  slots = new Array(SLOT_COUNT).fill(null);
  score = 0;
  streak = 0;
  unlocked = unlockedCount();
  timeLeft = GAME_SECONDS;
  lastSec = GAME_SECONDS;
  trashCooldown = 0;
  nextObj = randomBase();
  running = true;
  showScreen(null);
  layout();
  spawnPiece();
  render();
}

function endGame() {
  running = false;
  timeLeft = 0;
  trashCooldown = 0;
  render();
  setObj(pieceObjEl, null);
  showTarget(-1);
  shadowEl.classList.add('hidden');
  const best = loadScores()[0];
  $('gameover-title').textContent = score > 0 && (!best || score > best.score) ? 'New record! 🏆' : "Time's up!";
  $('final-score').textContent = score;
  $('save-form').classList.remove('hidden');
  showScreen('gameover');
  $('player-name').focus();
  play('over');
}

function spawnPiece() {
  piece = { ...nextObj, x: 0, y: PIECE_START_Y, vy: 0, dir: 1, lean: 0, falling: false, targetSlot: 0 };
  nextObj = randomBase();
  retrigger(pieceEl, 'spawn');
}

function dropPiece() {
  if (piece.falling) return;
  piece.targetSlot = nearestSlot(piece.x + pieceSize / 2);
  piece.vy = DROP_SPEED;
  piece.falling = true;
  play('drop');
}

// Throw the moving object away and bring in the next one. This is the way out
// when nothing on the board (or in hand) can be matched.
function discardPiece() {
  if (!running || piece.falling || trashCooldown > 0) return;
  burst(piece.x + pieceSize / 2, piece.y + pieceSize / 2,
    ['#9aa3c7', '#c7cdea', CATEGORIES[piece.cat].color], 18, { speed: 220, life: 0.5 });
  trashCooldown = TRASH_COOLDOWN;
  spawnPiece();
  play('discard');
  render();
}

// Swap the moving object with the content of a filled slot.
function swapWithSlot(i) {
  if (!running || piece.falling || !slots[i]) return;
  const held = { cat: piece.cat, stage: piece.stage };
  piece.cat = slots[i].cat;
  piece.stage = slots[i].stage;
  slots[i] = held;
  const { x, y } = slotPoint(i);
  shockwave(x, y, '#19b8ff');
  retrigger(wellEls[i], 'land');
  retrigger(pieceEl, 'spawn');
  play('swap');
  render();
}

// Bring in any family whose score threshold has just been passed.
function checkUnlocks() {
  const now = unlockedCount();
  if (now <= unlocked) return;
  const names = CATEGORIES.slice(unlocked, now).map((c) => c.title).join(' & ');
  unlocked = now;
  setTimeout(() => {
    if (!running) return;
    announce(`${names} unlocked!`, 'unlock');
    play('unlock');
  }, 450);
}

// ---- Match / mismatch rules -----------------------------------------------
function resolveDrop(i, obj) {
  const current = slots[i];
  if (!current) {
    slots[i] = obj;
    fxLand(i, obj);
    return;
  }

  if (!same(current, obj)) {
    // Mismatch: both objects are destroyed, no points, streak lost.
    slots[i] = null;
    streak = 0;
    fxMismatch(i);
    return;
  }

  streak++;
  const combo = streak > COMBO_AFTER;
  const points = STAGE_POINTS[current.stage] + (combo ? COMBO_BONUS : 0);
  score += points;
  const cleared = current.stage === LAST_STAGE;
  if (cleared) {
    slots[i] = null; // two final-stage objects clear the slot
    timeLeft += CLEAR_TIME_BONUS;
    announce(`+${CLEAR_TIME_BONUS}s`, 'time');
  } else {
    current.stage++;
  }
  fxMerge(i, points, combo, cleared);
  checkUnlocks();
}

// ---- Loop -----------------------------------------------------------------
function update(dt) {
  timeLeft -= dt;
  if (timeLeft <= 0) {
    endGame();
    return;
  }
  const sec = Math.ceil(timeLeft);
  if (sec !== lastSec) {
    lastSec = sec;
    if (sec <= 5) play('tick');
  }

  trashCooldown = Math.max(0, trashCooldown - dt);

  if (!piece.falling) {
    // Speed only rises during a combo and drops back as soon as it breaks.
    const comboLevel = Math.max(0, streak - COMBO_AFTER);
    const speed = Math.min(MAX_SPEED, BASE_SPEED * COMBO_SPEEDUP ** comboLevel);
    const maxX = boardEl.clientWidth - pieceSize;
    piece.x += piece.dir * speed * dt;
    if (piece.x >= maxX) {
      piece.x = maxX;
      piece.dir = -1;
    } else if (piece.x <= 0) {
      piece.x = 0;
      piece.dir = 1;
    }
    // Lean into the direction of travel, more at higher speed.
    const targetLean = piece.dir * 6 * (speed / BASE_SPEED);
    piece.lean += (targetLean - piece.lean) * Math.min(1, dt * 8);
    showTarget(nearestSlot(piece.x + pieceSize / 2));
  } else {
    // Gravity fall, easing sideways onto the centre of the target slot.
    const targetX = slotCenters[piece.targetSlot] - pieceSize / 2;
    piece.x += (targetX - piece.x) * Math.min(1, dt * 14);
    piece.vy += GRAVITY * dt;
    piece.y += piece.vy * dt;
    piece.lean *= Math.max(0, 1 - dt * 12);
    burst(piece.x + pieceSize / 2, piece.y + pieceSize / 2, [CATEGORIES[piece.cat].color], 1,
      { speed: 40, gravity: 0, life: 0.35, lift: 0 });
    if (piece.y >= landY) {
      resolveDrop(piece.targetSlot, { cat: piece.cat, stage: piece.stage });
      spawnPiece();
    }
  }
}

let shownScore = 0;
let shownStreak = 0;

function render() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    setObj(slotObjEls[i], slots[i]);
    slotEls[i].classList.toggle('filled', !!slots[i]);
  }

  if (score !== shownScore) {
    if (score > shownScore) retrigger(scoreEl, 'bump');
    shownScore = score;
    scoreEl.textContent = score;
  }
  if (streak !== shownStreak) {
    if (streak > shownStreak) retrigger(streakEl, 'bump');
    shownStreak = streak;
    const combo = streak > COMBO_AFTER;
    streakEl.textContent = combo ? `${streak} 🔥` : streak;
    $('streak-pill').classList.toggle('combo', combo);
  }

  const secs = Math.ceil(timeLeft);
  timeEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('time-pill').classList.toggle('danger', running && timeLeft <= 10);

  trashEl.classList.toggle('cooling', trashCooldown > 0);
  trashEl.style.setProperty('--cd', trashCooldown / TRASH_COOLDOWN);

  if (running) {
    setObj(nextEl, nextObj);
    setObj(pieceObjEl, piece);
    pieceEl.style.transform = `translate3d(${piece.x}px, ${piece.y}px, 0) rotate(${piece.lean}deg)`;

    // Shadow on the target platform that grows as the object comes down.
    shadowEl.classList.toggle('hidden', !piece.falling);
    if (piece.falling) {
      const p = Math.min(1, Math.max(0, (piece.y - PIECE_START_Y) / (landY - PIECE_START_Y)));
      const r = slotRects[piece.targetSlot];
      shadowEl.style.left = `${r.x}px`;
      shadowEl.style.top = `${r.bottom - 4}px`;
      shadowEl.style.transform = `translate(-50%, -50%) scale(${0.45 + 0.55 * p})`;
      shadowEl.style.opacity = 0.15 + 0.45 * p;
    }
  }
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (running) {
    update(dt);
    render();
  }
  updateFx(dt); // keeps running so effects finish after the game ends
  requestAnimationFrame(frame);
}

// ---- Input ----------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
    setMuted(!muted);
    return;
  }
  if (!running) return; // menus keep normal typing
  if (e.code === 'Space') {
    e.preventDefault(); // stop the page from scrolling
    if (!e.repeat) dropPiece();
  } else if (e.code === 'KeyD' && !e.repeat) {
    discardPiece();
  }
});

boardEl.addEventListener('pointerdown', () => {
  if (running) dropPiece();
});

trashEl.addEventListener('pointerdown', (e) => {
  e.preventDefault(); // keep keyboard focus off the button so Space still drops
  discardPiece();
});

soundEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  setMuted(!muted);
});

window.addEventListener('resize', layout);

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

buildChains();
setMuted(muted);
layout();
showScreen('menu');
requestAnimationFrame(frame);
