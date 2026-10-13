// Maps keyboard and pointer input to game actions. The only file that knows
// which key does what.
class Input {
  constructor(game, view) {
    document.addEventListener('keydown', (e) => {
      const typing = e.target instanceof HTMLInputElement;
      if (e.code === 'KeyM' && !e.repeat && !typing) {
        game.toggleMute();
        return;
      }
      if (!game.running) return; // menus keep normal typing
      if (e.code === 'Space') {
        e.preventDefault(); // stop the page from scrolling
        if (!e.repeat) game.drop();
      } else if (e.code === 'KeyD' && !e.repeat) {
        game.discard();
      }
    });

    view.onBoardTap(() => game.drop());
    view.onSlotClick((i) => game.swapSlot(i));

    // pointerdown + preventDefault keeps keyboard focus off the buttons, so
    // Space keeps dropping instead of "clicking" the last button pressed.
    document.getElementById('btn-trash').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.discard();
    });
    document.getElementById('btn-sound').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.toggleMute();
    });
  }
}
