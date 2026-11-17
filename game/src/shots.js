// The screenshot scenes behind ?shot=start|play|chase|mission. Each one plays
// the real game forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what real play looks like and the same
// seed always gives the same frame.

import { STEP } from './config.js';
import { createScriptedInput } from './input.js';
import { createGame, stepAttract, stepGame } from './world.js';
import { addWanted } from './police.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 10;
const CHASE_SECONDS = 7;

/** Put the player in a car on the southbound lane of the road at x = 724. */
function putPlayerInCar(game, x, y) {
  const car = game.cars.find((candidate) => candidate.parked) ?? game.cars[0];
  car.traffic = false;
  car.parked = false;
  car.driver = 'player';
  car.speed = 0;
  car.x = x;
  car.y = y;
  car.angle = Math.PI / 2;
  game.player.inCar = car;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = Math.PI / 2;
  game.camera.x = x;
  game.camera.y = y;
  return car;
}

/** Drive straight down the road, steering gently back to the lane centre. */
function autopilotDrive(game, input, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const car = game.player.inCar;
    input.axesValue = {
      x: Math.max(-1, Math.min(1, (car.x - 724) / 30)),
      y: -1,
    };
    stepGame(game, input, STEP);
  }
}

/**
 * Set up the named scene (start, play, chase or mission; any other name is
 * start) and return the game and the screen to draw over it.
 */
export function stageShot(name, seed) {
  const game = createGame(seed, null);
  const input = createScriptedInput();

  if (name === 'play') {
    game.player.money = 350;
    putPlayerInCar(game, 724, 700);
    autopilotDrive(game, input, PLAY_SECONDS);
    return { game, screen: SCREEN_PLAY };
  }

  if (name === 'chase') {
    game.player.money = 350;
    putPlayerInCar(game, 724, 700);
    addWanted(game, 3);
    autopilotDrive(game, input, CHASE_SECONDS);
    return { game, screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    game.player.money = 150;
    // Walk up to Mara at the marina: the talk-stage dialogue opens on arrival.
    game.dialogue = null;
    game.player.x = 2790;
    game.player.y = 1150;
    game.camera.x = 2790;
    game.camera.y = 1150;
    for (let i = 0; i < 30; i += 1) stepGame(game, input, STEP);
    return { game, screen: SCREEN_PLAY };
  }

  for (let i = 0; i < START_SECONDS / STEP; i += 1) stepAttract(game, STEP);
  return { game, screen: SCREEN_TITLE };
}
