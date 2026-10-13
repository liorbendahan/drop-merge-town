// Thin, safe wrapper over localStorage. Every call survives private windows,
// blocked storage and corrupt JSON by falling back to a default, so the rest
// of the game never has to try/catch around persistence.
class Storage {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

// The saved leaderboard: a short list of { name, score }, best first.
class HighScores {
  #storage;
  #key;
  #max;

  constructor(storage, key, max) {
    this.#storage = storage;
    this.#key = key;
    this.#max = max;
  }

  all() {
    const list = this.#storage.get(this.#key, []);
    return Array.isArray(list) ? list : [];
  }

  best() {
    return this.all()[0] ?? null;
  }

  isRecord(score) {
    const best = this.best();
    return score > 0 && (!best || score > best.score);
  }

  add(name, score) {
    const list = this.all();
    list.push({ name, score });
    list.sort((a, b) => b.score - a.score);
    this.#storage.set(this.#key, list.slice(0, this.#max));
  }
}
