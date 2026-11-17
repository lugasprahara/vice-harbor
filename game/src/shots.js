// Vice Harbor — the four screenshot scenes behind ?shot=start|play|chase|mission.
// Each stages REAL game state deterministically from the seeded city: the same
// seed always builds the same frame. Scenes place the player, traffic, crowds,
// police and dialogue by hand so every frame shows several systems at once.

import { createCar } from './vehicles.js';
import { createPedestrian } from './pedestrians.js';
import { MISSIONS, objectiveTarget } from './missions.js';
import { SCREEN_DIALOGUE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function centreCameraOn(G, x, y) {
  G.camera.x = Math.max(0, Math.min(3400 - 1280, x - 640));
  G.camera.y = Math.max(0, Math.min(2600 - 720, y - 360));
}

function ringOfPeds(G, cx, cy, count, radius) {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const ped = createPedestrian(G.rng, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * 0.7);
    ped.angle = a + Math.PI / 2;
    G.peds.push(ped);
  }
}

function stageStart(G) {
  // A living vista: downtown avenues under the title panel, marina to the east.
  G.player.x = 1500; G.player.y = 1000;
  centreCameraOn(G, 1560, 980);
  for (let i = 0; i < 7; i += 1) {
    const vertical = i % 2 === 0;
    const car = createCar(['compact', 'sedan', 'taxi', 'truck'][i % 4], 0, 0, 0, G.rng);
    if (vertical) { car.x = 1440 + (i % 3 === 0 ? 18 : -18); car.y = 760 + i * 92; car.angle = i % 3 === 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { car.x = 1180 + i * 96; car.y = 1040 + (i % 2 === 0 ? 18 : -18); car.angle = i % 2 === 0 ? 0 : Math.PI; }
    car.traffic = { vertical, dir: 1, speed: 120, turnCooldown: 9 };
    car.driver = { civilian: true };
    G.cars.push(car);
  }
  ringOfPeds(G, 1500, 1000, 10, 190);
  return SCREEN_TITLE;
}

function stagePlay(G) {
  // Rio on foot mid-street in downtown rush hour, first mission active.
  G.player.x = 1440; G.player.y = 1010;
  G.player.car = null;
  G.activeMission = { def: MISSIONS[0], stage: 1, wrecked: 0, timer: 0 };
  G.player.money = 230;
  const spots = [
    ['sedan', 1330, 1058, 0], ['taxi', 1560, 1058, 0], ['compact', 1620, 986, Math.PI],
    ['truck', 1260, 986, Math.PI], ['sedan', 1422, 830, Math.PI / 2], ['compact', 1458, 1180, -Math.PI / 2],
    ['taxi', 1422, 1210, Math.PI / 2],
  ];
  for (const [kind, x, y, angle] of spots) {
    const car = createCar(kind, x, y, angle, G.rng);
    car.traffic = { vertical: Math.abs(angle) === Math.PI / 2, dir: 1, speed: 110, turnCooldown: 9 };
    car.driver = { civilian: true };
    G.cars.push(car);
  }
  ringOfPeds(G, 1440, 1010, 11, 170);
  G.shotTarget = objectiveTarget(G);
  centreCameraOn(G, 1440, 1010);
  return SCREEN_PLAY;
}

function stageChase(G) {
  // Five stars on Street 1440: Rio's sedan fleeing east, patrol cars on his
  // bumper with light bars lit, an interceptor alongside, skid marks behind.
  const playerCar = createCar('sedan', 1560, 1458, 0, G.rng);
  playerCar.color = '#e74c3c';
  playerCar.speed = 265;
  playerCar.driver = { player: true };
  G.cars.push(playerCar);
  G.player.car = playerCar;
  G.player.x = playerCar.x; G.player.y = playerCar.y;
  G.wanted = 5;
  G.player.money = 1875;
  G.activeMission = { def: MISSIONS[5], stage: 2, wrecked: 0, timer: 0 };
  G.heist = { kind: 'marina', lootGrabbed: true, getaway: true, def: { lootX: 3020, lootY: 840, lootTimer: 45, spike: 4, label: 'WAREHOUSE LOOT' } };
  const cop1 = createCar('police', 1438, 1452, 0.06, G.rng); cop1.speed = 272; cop1.lightPhase = 0;
  const cop2 = createCar('police', 1330, 1470, -0.04, G.rng); cop2.speed = 268; cop2.lightPhase = 3.4;
  const cop3 = createCar('interceptor', 1470, 1396, 0.1, G.rng); cop3.speed = 280; cop3.lightPhase = 1.6;
  for (const cop of [cop1, cop2, cop3]) { cop.driver = { officer: true }; G.cars.push(cop); }
  const traffic1 = createCar('compact', 1900, 1422, Math.PI, G.rng); traffic1.driver = { civilian: true };
  const traffic2 = createCar('taxi', 2050, 1458, 0, G.rng); traffic2.driver = { civilian: true };
  G.cars.push(traffic1, traffic2);
  for (let i = 0; i < 12; i += 1) G.effects.addSkid(1540 - i * 26, 1466 + Math.sin(i * 0.8) * 5, 0);
  G.effects.burst(1500, 1440, 10, '#ffd23e');
  ringOfPeds(G, 1700, 1330, 6, 120);
  G.shotTarget = objectiveTarget(G);
  centreCameraOn(G, 1560, 1458);
  return SCREEN_PLAY;
}

function stageMission(G) {
  // Marina boardwalk: Rio meets Mara beside the docks, heist briefing open.
  G.player.x = 2968; G.player.y = 1152;
  G.player.car = null;
  G.player.money = 640;
  G.progress.missionIndex = 5;
  if (G.mara) { G.mara.x = 3020; G.mara.y = 1180; }
  G.dialogue = { lines: MISSIONS[5].intro, index: 0, missionStart: false };
  G.activeMission = null;
  const car = createCar('sedan', 2790, 1060, Math.PI / 2, G.rng);
  car.parked = true;
  G.cars.push(car);
  const taxi = createCar('taxi', 2790, 1330, -Math.PI / 2, G.rng);
  taxi.parked = true;
  G.cars.push(taxi);
  ringOfPeds(G, 2880, 1240, 7, 150);
  G.shotTarget = { x: 3020, y: 1180 };
  centreCameraOn(G, 2980, 1160);
  return SCREEN_DIALOGUE;
}

export function stageShot(name, G) {
  if (name === 'play') return stagePlay(G);
  if (name === 'chase') return stageChase(G);
  if (name === 'mission') return stageMission(G);
  return stageStart(G);
}
