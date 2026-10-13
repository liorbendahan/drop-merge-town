// Canvas particle layer over the board: sparks, shards and shockwave rings.
// Positions are in board pixels; the canvas is resized to match the board.
class ParticleSystem {
  static MAX = 700;

  #canvas;
  #ctx;
  #particles = [];
  #width = 0;
  #height = 0;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
  }

  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.#width = width;
    this.#height = height;
    this.#canvas.width = width * dpr;
    this.#canvas.height = height * dpr;
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // A burst of `count` particles from (x, y). Sparks are round dots with a
  // halo; shards are spinning triangles.
  burst(x, y, colors, count, opts = {}) {
    const { speed = 340, gravity = 620, life = 0.8, shard = false, lift = 140 } = opts;
    for (let n = 0; n < count && this.#particles.length < ParticleSystem.MAX; n++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.25 + Math.random() * 0.75);
      this.#particles.push({
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

  shockwave(x, y, color) {
    this.#particles.push({ ring: true, x, y, t: 0, life: 0.5, color });
  }

  // Advance and redraw everything. Call once per frame.
  update(dt) {
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, this.#width, this.#height);
    if (!this.#particles.length) return;

    this.#particles = this.#particles.filter((p) => (p.t += dt) < p.life);
    for (const p of this.#particles) {
      const fade = 1 - p.t / p.life;
      ctx.fillStyle = ctx.strokeStyle = p.color;
      if (p.ring) {
        ctx.globalAlpha = fade;
        ctx.lineWidth = 5 * fade;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 + 90 * (1 - fade * fade), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.shard) {
        p.rot += p.spin * dt;
        ctx.globalAlpha = fade;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(-p.size, p.size * 0.6);
        ctx.lineTo(p.size * 0.9, p.size * 0.4);
        ctx.lineTo(0, -p.size);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.globalAlpha = fade * 0.22; // soft halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade;      // bright core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
