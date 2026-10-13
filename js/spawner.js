// The object gliding along the rail, and its fall once dropped. Pure motion
// in board pixels; it does not know what the object is or what it lands on.
class Spawner {
  #cfg;

  constructor(config) {
    this.#cfg = config;
    this.object = null;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = this.#cfg.PIECE_START_Y;
    this.vy = 0;
    this.dir = 1;      // +1 right, -1 left
    this.lean = 0;     // degrees of tilt into the direction of travel
    this.falling = false;
    this.targetSlot = -1;
  }

  spawn(object) {
    this.object = object;
    this.reset();
  }

  // Replace the carried object (a swap with a slot). Returns the old one.
  swapObject(object) {
    const old = this.object;
    this.object = object;
    return old;
  }

  centerX(size) {
    return this.x + size / 2;
  }

  drop(targetSlot) {
    if (this.falling) return false;
    this.targetSlot = targetSlot;
    this.vy = this.#cfg.DROP_SPEED;
    this.falling = true;
    return true;
  }

  // How far down the fall is, 0 at the rail and 1 on the platform.
  fallProgress(landY) {
    const start = this.#cfg.PIECE_START_Y;
    return Math.min(1, Math.max(0, (this.y - start) / (landY - start)));
  }

  // Advance one frame. `speed` is the glide speed, `maxX` the right limit,
  // `targetX` the x to settle on while falling, `landY` where the fall ends.
  // Returns true on the frame the object lands.
  update(dt, { speed, maxX, targetX, landY }) {
    if (!this.falling) {
      this.x += this.dir * speed * dt;
      if (this.x >= maxX) {
        this.x = maxX;
        this.dir = -1;
      } else if (this.x <= 0) {
        this.x = 0;
        this.dir = 1;
      }
      const targetLean = this.dir * 6 * (speed / this.#cfg.BASE_SPEED);
      this.lean += (targetLean - this.lean) * Math.min(1, dt * 8);
      return false;
    }

    // Gravity fall, easing sideways onto the centre of the target slot.
    this.x += (targetX - this.x) * Math.min(1, dt * 14);
    this.vy += this.#cfg.GRAVITY * dt;
    this.y += this.vy * dt;
    this.lean *= Math.max(0, 1 - dt * 12);
    return this.y >= landY;
  }
}
