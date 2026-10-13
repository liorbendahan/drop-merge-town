// Everything drawn inside the board: the slot platforms, the moving piece,
// the target beam, the falling shadow and the text popups. It measures its
// own layout so the game logic can work in board pixels.
class BoardView {
  #board;
  #slotsEl;
  #pieceEl;
  #pieceObjEl;
  #beamEl;
  #shadowEl;
  #slotEls = [];
  #wellEls = [];
  #slotObjEls = [];
  #shownTarget = -1;
  #slotHandler = null;

  // Measured layout, refreshed by layout(). All in board pixels.
  metrics = { pieceSize: 0, slotCenters: [], slotRects: [], landY: 0 };

  constructor(boardEl, slotCount) {
    this.#board = boardEl;
    this.#slotsEl = boardEl.querySelector('#slots');
    this.#pieceEl = boardEl.querySelector('#piece');
    this.#pieceObjEl = this.#pieceEl.querySelector('.obj');
    this.#beamEl = boardEl.querySelector('#beam');
    this.#shadowEl = boardEl.querySelector('#drop-shadow');
    this.#buildSlots(slotCount);
  }

  #buildSlots(count) {
    for (let i = 0; i < count; i++) {
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
        e.stopPropagation(); // a slot click is a swap, never a drop
        this.#slotHandler?.(i);
      });
      this.#slotsEl.appendChild(slot);
      this.#slotEls.push(slot);
      this.#wellEls.push(well);
      this.#slotObjEls.push(obj);
    }
  }

  get width() {
    return this.#board.clientWidth;
  }

  get height() {
    return this.#board.clientHeight;
  }

  onSlotClick(handler) {
    this.#slotHandler = handler;
  }

  onBoardTap(handler) {
    this.#board.addEventListener('pointerdown', handler);
  }

  // The slot row is tilted in CSS, so positions come from the rendered
  // rectangles (which include transforms) rather than offsetTop/Left.
  layout() {
    const board = this.#board.getBoundingClientRect();
    const pieceSize = this.#pieceEl.offsetWidth;
    const slotRects = this.#slotObjEls.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - board.left + r.width / 2, top: r.top - board.top, bottom: r.bottom - board.top };
    });
    this.metrics = {
      pieceSize,
      slotRects,
      slotCenters: slotRects.map((r) => r.x),
      landY: slotRects[0].bottom - pieceSize,
    };
    this.#beamEl.style.width = `${this.#slotEls[0].getBoundingClientRect().width}px`;
    this.#shadowEl.style.width = `${pieceSize * 0.9}px`;
    this.#shadowEl.style.height = `${pieceSize * 0.26}px`;
    if (this.#shownTarget >= 0) {
      const t = this.#shownTarget;
      this.#shownTarget = -1;
      this.setTarget(t);
    }
  }

  nearestSlot(x) {
    const centers = this.metrics.slotCenters;
    let best = 0;
    for (let i = 1; i < centers.length; i++) {
      if (Math.abs(centers[i] - x) < Math.abs(centers[best] - x)) best = i;
    }
    return best;
  }

  // Centre of slot i's standing object, for effects.
  slotPoint(i) {
    const r = this.metrics.slotRects[i];
    return { x: r.x, y: (r.top + r.bottom) / 2 };
  }

  // ---- Slots and piece ----------------------------------------------------

  setSlots(objects) {
    objects.forEach((obj, i) => {
      ObjectView.render(this.#slotObjEls[i], obj);
      this.#slotEls[i].classList.toggle('filled', !!obj);
    });
  }

  setPiece(obj, x, y, lean) {
    ObjectView.render(this.#pieceObjEl, obj);
    this.#pieceEl.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${lean}deg)`;
  }

  clearPiece() {
    ObjectView.render(this.#pieceObjEl, null);
  }

  // Highlight the slot the piece is over (-1 for none).
  setTarget(i) {
    if (i === this.#shownTarget) return;
    if (this.#shownTarget >= 0) this.#slotEls[this.#shownTarget].classList.remove('target');
    this.#shownTarget = i;
    if (i >= 0) {
      this.#slotEls[i].classList.add('target');
      this.#beamEl.style.transform = `translateX(${this.metrics.slotCenters[i] - this.#beamEl.offsetWidth / 2}px)`;
    }
    this.#beamEl.classList.toggle('hidden', i < 0);
  }

  // Shadow on the target platform that grows as the object comes down.
  setShadow(slot, progress) {
    const r = this.metrics.slotRects[slot];
    this.#shadowEl.classList.remove('hidden');
    this.#shadowEl.style.left = `${r.x}px`;
    this.#shadowEl.style.top = `${r.bottom - 4}px`;
    this.#shadowEl.style.transform = `translate(-50%, -50%) scale(${0.45 + 0.55 * progress})`;
    this.#shadowEl.style.opacity = 0.15 + 0.45 * progress;
  }

  hideShadow() {
    this.#shadowEl.classList.add('hidden');
  }

  setFever(on) {
    this.#board.classList.toggle('fever', on);
  }

  // ---- One-shot animations --------------------------------------------------

  static #retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // forces a reflow so the animation restarts
    el.classList.add(cls);
  }

  animateSpawn() {
    BoardView.#retrigger(this.#pieceEl, 'spawn');
  }

  animateLand(i) {
    BoardView.#retrigger(this.#wellEls[i], 'land');
  }

  animatePop(i) {
    BoardView.#retrigger(this.#wellEls[i], 'pop');
  }

  // Coloured ring flash: 'good' (merge), 'score' (clear) or 'bad' (miss).
  flash(i, kind) {
    this.#slotEls[i].classList.remove('good', 'bad', 'score');
    BoardView.#retrigger(this.#slotEls[i], kind);
  }

  shake() {
    BoardView.#retrigger(this.#board, 'shake');
  }

  // "+10" style text rising out of slot i.
  floatText(i, text, cls = '') {
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
    el.style.left = `${this.metrics.slotCenters[i]}px`;
    el.style.top = `${this.metrics.slotRects[i].top}px`;
    el.addEventListener('animationend', () => el.remove());
    this.#board.appendChild(el);
  }

  // Big centred message, e.g. "+3s" or "FEVER!".
  announce(text, cls = '') {
    const el = document.createElement('div');
    el.className = `announce ${cls}`;
    el.textContent = text;
    el.addEventListener('animationend', () => el.remove());
    this.#board.appendChild(el);
  }
}
