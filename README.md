# JMR’S Ultima VII

## [PLAY JMR’S ULTIMA VII](https://jmrothberg.github.io/JMR-ULTIMA-VII-BROWSER/dist/)

A browser-playable edition of **Ultima VII: The Black Gate + Forge of Virtue** using the original legally purchased GOG game files.

The first implementation runs the original DOS release through the open-source js-dos WebAssembly runtime. This preserves the original plot, maps, dialogue, graphics, audio, inventory, combat, schedules, and save system without translating or approximating game behavior.

## Current game

- Ultima VII: The Black Gate
- Forge of Virtue
- Original GOG data extracted and packaged as a js-dos bundle
- Browser mouse, keyboard, audio, fullscreen, and device-local saves
- GitHub Pages deployment for browser play from anywhere

## Run locally

Serve `dist/` through any static HTTP server and open its URL in a modern browser. Opening `index.html` directly as a `file://` URL will not work because browsers block the game-data request.

## Repository structure

- `dist/` — deployable browser application
- `game-parts/` — split original game bundle stored in GitHub
- `dist/game/black-gate.jsdos` — locally assembled original game bundle
- `scripts/` — packaging helpers

## Serpent Isle

Support for **Serpent Isle + The Silver Seed** will be added when its separate GOG installer is supplied.

## Licensing

The browser runtime is based on js-dos/DOSBox and is licensed under GPL-2.0. Ultima VII and its original game data are copyrighted by their respective owners and are stored for the purchaser's personal use.
