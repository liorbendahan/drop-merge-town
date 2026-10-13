# Mergefall

A one-minute arcade merge game that runs entirely in the browser.

**Play it:** https://liorbendahan.github.io/drop-merge-town/

## How to play

An object glides back and forth above six platforms. Drop it onto its twin
(same family, same stage) to evolve it: Shack → House → Skyscraper, Wheat →
Bread → Meal, Egg → Chick → Rooster. Drop it onto anything else and both are
destroyed. The joker 🃏 matches anything.

- **Space** or tap: drop the moving object.
- **Click a filled platform:** swap its object with the moving one.
- **D** or the bin: discard the moving object (3-second cooldown).
- **M:** toggle sound.

Matches score 10 / 20 / 40 points by stage. From the third match in a row
every match is a combo worth +10 more, and the spawner speeds up until the
streak breaks. Six matches in a row start **fever**: double points for 8
seconds, kept alive by every further match. Merging two final-stage objects
clears the platform and adds 3 seconds. First-time players get a 3-second
tutorial.

## Code layout

No build step: `index.html` loads the classic scripts in `js/` in dependency
order, so the game also runs straight from the file system.

| File | Responsibility |
| --- | --- |
| `js/config.js` | Every tunable number, the object families, the joker |
| `js/gameObject.js` | One object: family, stage, joker; match and merge rules |
| `js/board.js` | The six slots and what happens when an object lands |
| `js/scorer.js` | Score, streak, combo, fever and the resulting spawner speed |
| `js/spawner.js` | Motion of the gliding / falling object |
| `js/storage.js` | Safe localStorage access and the high-score list |
| `js/sound.js` | Synthesised sound effects (Web Audio) |
| `js/particles.js` | Canvas sparks, shards and shockwaves |
| `js/objectView.js` | Draws an object into the DOM (image or placeholder) |
| `js/boardView.js` | Platforms, moving piece, beam, shadow, popups, layout |
| `js/hud.js` | Score / streak / next / time strip and tool buttons |
| `js/effects.js` | Which animations, particles and sounds each event triggers |
| `js/screens.js` | Menu, dashboard, tutorial and game-over overlays |
| `js/input.js` | Keyboard and pointer bindings |
| `js/game.js` | The game loop and the wiring between model and views |
| `js/main.js` | Composition root: builds everything and starts the game |

The model classes (`GameObject`, `Board`, `Scorer`, `Spawner`) have no DOM
dependencies and are covered by `node test/run.js`.

## Assets

`assets/` holds one PNG per object (`building-1.png` … `food-3.png`,
`wild-1.png`). Replace any file to change the art; the names are the only
contract. Art is from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
(MIT licence).
