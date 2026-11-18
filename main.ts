// Vice Harbor v3 — make.fun gta6-01 entry program (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ beside this file into the output
// directory and writes dossier.json there with the vendored make.fun library, using
// the scorer's own caps so an entry the scorer would refuse is refused here first.
// Run locally with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Vice Harbor ships four staged screenshots and a compact static game folder, so the
// starter caps apply unchanged: 160 KiB of dossier text, at most 4 screenshots of
// 256 KiB each, at most 993 game files / 48 MiB, and no game path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
