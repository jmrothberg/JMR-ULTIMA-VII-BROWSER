#!/usr/bin/env bash
set -euo pipefail

mkdir -p game-parts
split -b 700k -d -a 3 dist/game/black-gate.jsdos game-parts/black-gate.jsdos.part-
echo "Created game-parts/black-gate.jsdos.part-*"
