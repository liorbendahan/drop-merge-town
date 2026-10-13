// Unit tests for the pure game logic (no DOM). Run with:  node test/run.js
// The source files are classic scripts, so they are concatenated and
// evaluated in one shared scope, exactly as the browser sees them.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = ['config.js', 'gameObject.js', 'board.js', 'scorer.js', 'spawner.js'];
const source = files.map((f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
const ctx = vm.createContext({});
vm.runInContext(`${source}\nthis.CONFIG = CONFIG; this.GameObject = GameObject; this.Board = Board; this.Scorer = Scorer; this.Spawner = Spawner;`, ctx);
const { CONFIG, GameObject, Board, Scorer, Spawner } = ctx;

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}
function eq(actual, expected, what = '') {
  if (actual !== expected) throw new Error(`${what} expected ${expected}, got ${actual}`);
}

const shack = GameObject.base(0);
const house = new GameObject(0, 1);
const tower = new GameObject(0, 2);
const wheat = GameObject.base(1);
const joker = GameObject.joker();

test('same family and stage match; anything else does not', () => {
  eq(shack.matches(GameObject.base(0)), true);
  eq(shack.matches(house), false);
  eq(shack.matches(wheat), false);
});

test('a joker matches everything, in either direction', () => {
  eq(joker.matches(tower), true);
  eq(wheat.matches(joker), true);
  eq(joker.matches(joker), true);
});

test('merging evolves to the next stage and finals clear', () => {
  eq(shack.mergedWith(shack).key, 'building-1');
  eq(tower.mergedWith(tower), null);
});

test('a joker takes the family of the other object', () => {
  eq(joker.mergedWith(house).key, 'building-2');
  eq(house.mergedWith(joker).key, 'building-2');
  eq(house.mergeStage(joker), 1);
  eq(joker.mergeStage(house), 1);
  eq(joker.mergedWith(joker), null, 'two jokers');
});

test('board applies land / merge / clear / miss', () => {
  const board = new Board(6);
  eq(board.drop(0, shack).kind, 'land');
  eq(board.drop(0, shack).kind, 'merge');
  eq(board.get(0).key, 'building-1');
  eq(board.drop(0, wheat).kind, 'miss');
  eq(board.get(0), null, 'miss empties the slot');
  board.set(1, tower);
  const r = board.drop(1, tower);
  eq(r.kind, 'clear');
  eq(r.stage, 2);
  eq(board.get(1), null);
});

test('scoring: stage points, combo bonus, fever doubling', () => {
  const s = new Scorer(CONFIG);
  eq(s.recordMatch(0).points, 10);
  eq(s.recordMatch(1).points, 20);
  eq(s.inCombo, false);
  const third = s.recordMatch(2);
  eq(third.combo, true);
  eq(third.points, 50, 'stage 3 + combo bonus');
  s.recordMatch(0); s.recordMatch(0);
  const sixth = s.recordMatch(0);
  eq(sixth.feverStarted, true);
  eq(sixth.points, 40, '(10 + 10) x 2');
  eq(s.inFever, true);
  s.recordMiss();
  eq(s.streak, 0);
  eq(s.inFever, false);
});

test('fever runs out with time and the tick reports it once', () => {
  const s = new Scorer(CONFIG);
  for (let i = 0; i < CONFIG.FEVER_STREAK; i++) s.recordMatch(0);
  eq(s.update(1), false);
  eq(s.update(CONFIG.FEVER_SECONDS), true, 'ended on this tick');
  eq(s.update(1), false, 'reported only once');
});

test('speed rises only in a combo and resets on a miss', () => {
  const s = new Scorer(CONFIG);
  eq(s.speed, CONFIG.BASE_SPEED);
  s.recordMatch(0); s.recordMatch(0); s.recordMatch(0);
  eq(Math.round(s.speed), Math.round(CONFIG.BASE_SPEED * CONFIG.COMBO_SPEEDUP));
  s.recordMiss();
  eq(s.speed, CONFIG.BASE_SPEED);
});

test('spawner bounces between the edges and lands when dropped', () => {
  const sp = new Spawner(CONFIG);
  sp.spawn(shack);
  for (let i = 0; i < 100; i++) sp.update(0.05, { speed: 300, maxX: 500, landY: 400 });
  eq(sp.x >= 0 && sp.x <= 500, true, 'stays in bounds');
  eq(sp.drop(2), true);
  eq(sp.drop(2), false, 'cannot drop twice');
  let landed = false;
  for (let i = 0; i < 200 && !landed; i++) landed = sp.update(0.016, { speed: 300, maxX: 500, targetX: 200, landY: 400 });
  eq(landed, true);
});

test('random spawns are base objects or jokers only', () => {
  for (let i = 0; i < 500; i++) {
    const o = GameObject.random();
    eq(o.wild || o.stage === 0, true);
  }
  eq(GameObject.random(() => 0).wild, true, 'rng below WILD_CHANCE gives a joker');
  eq(GameObject.random(() => 0.99).wild, false);
});

console.log(failed ? `\n${failed} test(s) failed` : '\nall tests passed');
process.exit(failed ? 1 : 0);
