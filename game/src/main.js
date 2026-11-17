// Vice Harbor — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between four screens: title, play, paused and busted/wasted.
// A dialogue box freezes the world until the player clicks through it.
//
// ?seed=N fixes the city. ?shot=start|play|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createGame, respawnPlayer, stepAttract, stepGame } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { clearSave, loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(scene.game, scene.screen, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let game = createGame(seed, null);
  let saveExists = loadSave() !== null;
  let accumulator = 0;
  let last = performance.now();

  function startGame(fromSave) {
    const save = fromSave ? loadSave() : null;
    game = createGame(seed, save);
    accumulator = 0;
    screen = SCREEN_PLAY;
    game.audio.unlock();
    announce(save ? 'Welcome back to Vice Harbor.' : 'Welcome to Vice Harbor. Mara is waiting at the marina.');
  }

  /** Advance an open dialogue box one line, or close it and run its aftermath. */
  function advanceDialogue() {
    if (!game.dialogue) return false;
    game.dialogue.index += 1;
    if (game.dialogue.index < game.dialogue.lines.length) return true;
    const onDone = game.dialogue.onDone;
    game.dialogue = null;
    if (onDone) onDone();
    return true;
  }

  function handleActions() {
    if (input.takePressed('mute')) {
      game.audio.setMuted(!game.audio.isMuted());
      announce(game.audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (game.dialogue) {
      if (input.takePressed('confirm') || input.takeClick()) advanceDialogue();
      return;
    }
    if (input.takePressed('pause')) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (input.takePressed('newgame')) {
        clearSave();
        saveExists = false;
        startGame(false);
      } else if (input.takePressed('confirm') || input.takeClick()) {
        startGame(saveExists);
      }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (input.takePressed('confirm') || input.takeClick()) {
        respawnPlayer(game);
        screen = SCREEN_PLAY;
        announce('Back on the streets.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED && input.takePressed('quit')) {
      if (saveGame(game)) announce('Progress saved.');
      saveExists = loadSave() !== null;
      game = createGame(seed, null);
      screen = SCREEN_TITLE;
      announce('Vice Harbor. Press Enter to continue.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      stepAttract(game, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY || game.dialogue) return;
    const mouse = renderer.toWorld(input.mouse.x, input.mouse.y, game.camera);
    game.mouseWorld = mouse;
    stepGame(game, input, STEP);
    if (game.over) {
      screen = SCREEN_OVER;
      announce(game.over.kind === 'busted' ? 'Busted! The police caught you.' : 'Wasted! You ran out of health.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
      if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) break;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(game, screen, saveExists);
  }

  // Leaving the tab pauses a running game rather than letting the police catch the player unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vice Harbor. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
