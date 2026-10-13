# Mergefall

A one-minute arcade merge game that runs entirely in the browser.

**Play it:** https://liorbendahan.github.io/drop-merge-town/

## How to play

An object glides back and forth above six platforms. Drop it onto its twin
(same family, same stage) to evolve it: Shack → House → Skyscraper, Egg →
Chick → Rooster, and so on. Drop it onto anything else and both are destroyed.

- **Space** or tap: drop the moving object.
- **Click a filled platform:** swap its object with the moving one.
- **D** or the bin: discard the moving object (3-second cooldown).
- **M:** toggle sound.

Matches score 10 / 20 / 40 points by stage. From the third match in a row
every match is a combo worth +10 more, and the spawner speeds up until the
streak breaks. Merging two final-stage objects clears the platform and adds
3 seconds. New families unlock at 50 and 120 points.

## Files

- `index.html`, `style.css`, `game.js` – the whole game, no build step.
- `assets/` – object art, one PNG per stage (`building-1.png` … `treasure-3.png`).
  Replace any file to change the art; the names are the only contract.

Art is from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
(MIT licence). Sounds are synthesised with the Web Audio API.
