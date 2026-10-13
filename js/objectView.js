// Draws a GameObject into an .obj element: the PNG when it has loaded,
// otherwise a coloured tile with a glyph. Shared by the board, the moving
// piece and the "next" preview.
class ObjectView {
  static #loaded = new Set();

  // Start fetching every image so the first render is not a blank.
  static preload() {
    const objects = [GameObject.joker()];
    CATEGORIES.forEach((category, cat) => {
      category.labels.forEach((_, stage) => objects.push(new GameObject(cat, stage)));
    });
    for (const obj of objects) {
      const img = new Image();
      img.onload = () => ObjectView.#loaded.add(obj.assetPath);
      img.src = obj.assetPath;
    }
  }

  static render(el, obj) {
    const useImg = obj && ObjectView.#loaded.has(obj.assetPath);
    const key = obj ? `${obj.key}-${useImg}` : '';
    if (el.dataset.key === key) return; // unchanged: leave the DOM alone
    el.dataset.key = key;
    el.replaceChildren();

    if (!obj) {
      el.className = 'obj empty';
      el.title = '';
      return;
    }

    const classes = ['obj', `cat-${obj.category.name}`, `stage-${obj.stage + 1}`, useImg ? 'has-img' : 'placeholder'];
    if (obj.wild) classes.push('wild');
    el.className = classes.join(' ');
    el.title = obj.label;

    if (useImg) {
      const img = document.createElement('img');
      img.src = obj.assetPath;
      img.alt = obj.label;
      img.draggable = false;
      el.appendChild(img);
    } else {
      const glyph = document.createElement('span');
      glyph.className = 'glyph';
      glyph.textContent = obj.category.glyphs[obj.stage];
      el.appendChild(glyph);
    }
  }
}
