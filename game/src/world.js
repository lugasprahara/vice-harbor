// Vice Harbor itself: the coastal neon city, the whole game state, and the one
// step that advances every system in the right order. The city is a road grid
// with buildings in the blocks, a park, a beach and the water on the east edge,
// plus named landmarks the missions and the taxi fares drive to.

import { CAR, PLAYER, ROAD_GAP, ROAD_WIDTH, VIEW, WORLD } from './config.js';
import { createRandom, randomPick, randomRange } from './random.js';
import { resolveCircleVsCity } from './geo.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { spawnParkedCars, spawnTrafficCars, stepTraffic } from './traffic.js';
import { spawnPedestrians, stepPedestrians } from './pedestrians.js';
import { stepPlayer } from './vehicles.js';
import { stepPolice } from './police.js';
import { stepCombat } from './combat.js';
import { startMission, stepMissions } from './missions.js';
import { spawnAmmoCrates, spawnPackages, stepSide } from './side.js';
import { BUILDING_COLORS, NEON_COLORS, ROOF_COLORS } from './config.js';

const PARK_BLOCK = { vx: 3, hy: 2 };

function buildCity(random) {
  const roadsV = [];
  for (let x = 300; x <= WORLD.width - 300; x += ROAD_GAP) roadsV.push(x);
  const roadsH = [];
  for (let y = 300; y <= WORLD.height - 300; y += ROAD_GAP) roadsH.push(y);

  const buildings = [];
  const xs = [0, ...roadsV, WORLD.width];
  const ys = [0, ...roadsH, WORLD.height];
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      const x0 = xs[i] + ROAD_WIDTH / 2 + 26;
      const x1 = xs[i + 1] - ROAD_WIDTH / 2 - 26;
      const y0 = ys[j] + ROAD_WIDTH / 2 + 26;
      const y1 = ys[j + 1] - ROAD_WIDTH / 2 - 26;
      if (x0 >= 2900 || x1 <= x0 + 40 || y1 <= y0 + 40) continue;
      if (i === PARK_BLOCK.vx && j === PARK_BLOCK.hy) continue; // the park, not buildings
      const cols = x1 - x0 > 200 ? 2 : 1;
      const rows = y1 - y0 > 200 ? 2 : 1;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const cellX0 = x0 + (c * (x1 - x0)) / cols;
          const cellX1 = x0 + ((c + 1) * (x1 - x0)) / cols;
          const cellY0 = y0 + (r * (y1 - y0)) / rows;
          const cellY1 = y0 + ((r + 1) * (y1 - y0)) / rows;
          const w = randomRange(random, (cellX1 - cellX0) * 0.55, (cellX1 - cellX0) * 0.8);
          const h = randomRange(random, (cellY1 - cellY0) * 0.55, (cellY1 - cellY0) * 0.8);
          const x = cellX0 + randomRange(random, 8, Math.max(9, cellX1 - cellX0 - w - 8));
          const y = cellY0 + randomRange(random, 8, Math.max(9, cellY1 - cellY0 - h - 8));
          buildings.push({
            x, y, w, h,
            color: randomPick(random, BUILDING_COLORS),
            roof: randomPick(random, ROOF_COLORS),
            neon: random() < 0.45 ? randomPick(random, NEON_COLORS) : null,
            windowsX: Math.max(2, Math.floor(w / 34)),
            windowsY: Math.max(2, Math.floor(h / 34)),
          });
        }
      }
    }
  }

  const palms = [];
  for (let y = 120; y < WORLD.height - 80; y += 110) {
    palms.push({ x: randomRange(random, 2920, 3050), y: y + randomRange(random, -30, 30) });
  }
  for (let i = 0; i < 10; i += 1) {
    palms.push({
      x: randomRange(random, xs[PARK_BLOCK.vx] + 90, xs[PARK_BLOCK.vx + 1] - 90),
      y: randomRange(random, ys[PARK_BLOCK.hy] + 90, ys[PARK_BLOCK.hy + 1] - 90),
    });
  }
  for (let i = 0; i < 16; i += 1) {
    const road = randomPick(random, roadsV);
    palms.push({ x: road + randomPick(random, [-72, 72]), y: randomRange(random, 200, WORLD.height - 200) });
  }

  const lights = [];
  for (const rx of roadsV) {
    for (const ry of roadsH) {
      lights.push({ x: rx - 66, y: ry - 66 });
      lights.push({ x: rx + 66, y: ry + 66 });
    }
  }

  return {
    roadsV,
    roadsH,
    buildings,
    palms,
    lights,
    roadWidth: ROAD_WIDTH,
    sandX: 2900,
    waterX: 3080,
    park: {
      x: xs[PARK_BLOCK.vx] + ROAD_WIDTH / 2 + 26,
      y: ys[PARK_BLOCK.hy] + ROAD_WIDTH / 2 + 26,
      w: xs[PARK_BLOCK.vx + 1] - xs[PARK_BLOCK.vx] - ROAD_WIDTH - 52,
      h: ys[PARK_BLOCK.hy + 1] - ys[PARK_BLOCK.hy] - ROAD_WIDTH - 52,
    },
    landmarks: {
      marina: { x: 2820, y: 1150 },
      hideout: { x: 350, y: 350 },
      bank: { x: 1500, y: 700 },
      garage: { x: 1100, y: 1900 },
      plaza: { x: 1900, y: 1100 },
      hospital: { x: 700, y: 300 },
      docks: { x: 2700, y: 1900 },
    },
  };
}

/** A fresh game: city, player, traffic, pedestrians, packages and mission one. */
export function createGame(seed, save) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const game = {
    seed,
    rng,
    time: 0,
    city,
    fx: createEffects(),
    audio: createAudio(),
    player: {
      x: 2650, y: 1150, angle: -Math.PI / 2,
      health: PLAYER.maxHealth, money: 50,
      wanted: 0, weapon: 0, ammo: 24,
      inCar: null, speed: 0, moving: false,
      lastHurt: -99,
    },
    cars: [],
    peds: [],
    packages: [],
    ammoCrates: [],
    mission: { index: 0, stage: 0, target: null, timer: 0, done: false, allDone: false },
    taxi: { state: 'idle', cooldown: 5, pickup: null, dest: null, fare: 0, passenger: null },
    dialogue: null,
    toast: null,
    over: null,
    camera: { x: 2650, y: 1150 },
    mouseWorld: { x: 2650, y: 1150 },
    wantedHeat: 0,
    stats: { carsStolen: 0, missionsDone: 0, packages: 0, fares: 0, earned: 0 },
  };
  spawnParkedCars(game);
  spawnTrafficCars(game);
  spawnPedestrians(game);
  spawnPackages(game);
  spawnAmmoCrates(game);
  if (save) {
    if (typeof save.money === 'number') game.player.money = save.money;
    if (typeof save.health === 'number') game.player.health = Math.max(20, save.health);
    if (typeof save.x === 'number' && typeof save.y === 'number') {
      game.player.x = save.x;
      game.player.y = save.y;
      resolveCircleVsCity(city, game.player, PLAYER.radius);
    }
    if (Array.isArray(save.packagesTaken)) {
      for (const pack of game.packages) {
        if (save.packagesTaken.includes(pack.id)) {
          pack.taken = true;
          game.stats.packages += 1;
        }
      }
    }
    startMission(game, typeof save.missionIndex === 'number' ? save.missionIndex : 0);
  } else {
    startMission(game, 0);
  }
  game.camera.x = game.player.x;
  game.camera.y = game.player.y;
  return game;
}

/** A short message at the bottom of the screen, shown for a few seconds. */
export function setToast(game, text) {
  game.toast = { text, t: 4 };
}

/** The one step: player, combat, traffic, pedestrians, police, missions, side work. */
export function stepGame(game, input, dt) {
  game.time += dt;
  if (game.toast) {
    game.toast.t -= dt;
    if (game.toast.t <= 0) game.toast = null;
  }
  if (game.over) {
    game.fx.step(dt);
    return;
  }

  stepPlayer(game, input, dt);
  stepCombat(game, input, dt);
  stepTraffic(game, dt);
  stepPedestrians(game, dt);
  stepPolice(game, dt);
  stepMissions(game, dt);
  stepSide(game, dt);

  // Slow recovery when the heat is off and nobody has hurt the player lately.
  if (game.player.wanted === 0 && game.time - game.player.lastHurt > 6) {
    game.player.health = Math.min(PLAYER.maxHealth, game.player.health + dt * 2);
  }

  // The camera follows the player (or the car they drive), eased, clamped to the city.
  const focus = game.player.inCar ?? game.player;
  const targetX = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, focus.x));
  const targetY = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, focus.y));
  game.camera.x += (targetX - game.camera.x) * Math.min(1, dt * 5);
  game.camera.y += (targetY - game.camera.y) * Math.min(1, dt * 5);

  game.fx.step(dt);
  const driving = game.player.inCar !== null;
  game.audio.engine(driving ? Math.abs(game.player.inCar.speed) / CAR.maxSpeed : 0);
  game.audio.siren(game.player.wanted > 0, game.time);
  game.audio.music(dt, true);
}

/** The title screen's backdrop: traffic and pedestrians move, the camera drifts. */
export function stepAttract(game, dt) {
  game.time += dt;
  stepTraffic(game, dt);
  stepPedestrians(game, dt);
  const cx = WORLD.width / 2;
  const cy = WORLD.height / 2;
  game.camera.x = cx + Math.cos(game.time * 0.045) * 620;
  game.camera.y = cy + Math.sin(game.time * 0.06) * 420;
  game.fx.step(dt);
}

/** After being busted or wasted: hospital, a bill, and a clean slate with the heat. */
export function respawnPlayer(game) {
  const cost = game.over && game.over.kind === 'busted' ? 150 : 200;
  game.player.money = Math.max(0, game.player.money - cost);
  game.player.health = PLAYER.maxHealth;
  game.player.wanted = 0;
  game.player.inCar = null;
  game.player.x = game.city.landmarks.hospital.x;
  game.player.y = game.city.landmarks.hospital.y;
  game.player.angle = -Math.PI / 2;
  game.cars = game.cars.filter((car) => !car.police);
  game.wantedHeat = 0;
  game.over = null;
  game.dialogue = null;
  setToast(game, cost > 0 ? `Hospital bill: $${cost}. Back on the streets.` : 'Back on the streets.');
}
