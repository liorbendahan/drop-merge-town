// Synthesised sound effects through the Web Audio API: no audio files.
// Each sound is a list of notes: f = frequency, to = slide target, d = length
// in seconds, v = volume, at = delay from the start.
class SoundPlayer {
  static SOUNDS = {
    drop:    [{ f: 700, to: 250, d: 0.16, type: 'triangle', v: 0.12 }],
    land:    [{ f: 150, to: 90, d: 0.14, type: 'sine', v: 0.3 }],
    merge:   [{ f: 523, d: 0.09, type: 'triangle', v: 0.18 }, { f: 784, d: 0.16, type: 'triangle', v: 0.18, at: 0.08 }],
    clear:   [523, 659, 784, 1047].map((f, i) => ({ f, d: 0.18, type: 'triangle', v: 0.18, at: i * 0.07 })),
    miss:    [{ f: 180, to: 60, d: 0.35, type: 'sawtooth', v: 0.14 }],
    discard: [{ f: 320, to: 180, d: 0.08, type: 'square', v: 0.05 }],
    swap:    [{ f: 440, to: 660, d: 0.1, type: 'sine', v: 0.15 }],
    fever:   [523, 659, 784, 1047, 1319].map((f, i) => ({ f, d: 0.3, type: 'sawtooth', v: 0.08, at: i * 0.08 })),
    tick:    [{ f: 880, d: 0.05, type: 'square', v: 0.035 }],
    over:    [523, 392, 330].map((f, i) => ({ f, d: 0.32, type: 'triangle', v: 0.18, at: i * 0.18 })),
  };

  #storage;
  #key;
  #ctx = null;
  #muted;

  constructor(storage, key) {
    this.#storage = storage;
    this.#key = key;
    this.#muted = storage.get(key, false) === true;
  }

  get muted() {
    return this.#muted;
  }

  set muted(value) {
    this.#muted = value;
    this.#storage.set(this.#key, value);
  }

  // The context is created lazily, on the first sound after a user gesture,
  // which is what browsers require.
  #context() {
    if (!this.#ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.#ctx = new Ctx();
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }

  play(name) {
    if (this.#muted) return;
    let ctx;
    try {
      ctx = this.#context();
    } catch {
      return; // no Web Audio: stay silent
    }
    if (!ctx) return;

    const now = ctx.currentTime;
    for (const n of SoundPlayer.SOUNDS[name]) {
      const t = now + (n.at || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f, t);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t + n.d);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(n.v, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.d + 0.05);
    }
  }
}
