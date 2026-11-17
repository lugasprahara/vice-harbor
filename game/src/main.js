// Vice Harbor — boot and the one game loop. Owns the shared game state G that
// every system module reads and writes: Rio (on foot or in a car), the wanted
// level, the active mission/heist/taxi fare, dialogue, camera and screens.
// Fixed-step simulation at 60 Hz; rendering paints the state each frame.
// ?seed=N fixes the city. ?shot=start|play|chase|mission stages a screenshot
// scene instead of running the loop (see shots.js).

import { PLAYER, STEP, VIEW, WORLD } from './config.js';
import { createRandom } from './random.js';
import { clamp, distance, rectsOverlap } from './geo.js';
import { createWorld, packageSpots, parkedCarSpots, districtAt } from './world.js';
import { createCar, driveCar } from './vehicles.js';
import { maintainTraffic, spawnTrafficCar, updateTrafficCar } from './traffic.js';
import { createPedestrian, spawnCrowds, maintainCrowds, updatePedestrian, scarePeds } from './pedestrians.js';
import { checkArrest, reportCrime, updatePoliceCar, updateWanted } from './police.js';
import { createBullets, tryPlayerAttack, updateBullets, damagePedestrian } from './combat.js';
import { acceptNextMission, currentMission, objectiveTarget, updateMission, noteCarWrecked } from './missions.js';
import { maybeOfferTaxiFare, updateTaxiFare, updateCollectibleProgress } from './activities.js';
import { cycleRadioStation, updateRadio } from './radio.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { createInput, moveAxis, driveAxis } from './input.js';
import { applySave, hasSave, loadFromSlot, saveToSlot } from './save.js';
import { createRenderer, SCREEN_DIALOGUE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

export function createGameState(seedValue) {
  const rng = createRandom(seedValue);
  const world = createWorld(rng);
  const G = {
    rng, world, time: 0,
    packages: packageSpots(),
    cars: [], peds: [], bullets: createBullets(), muzzle: null,
    player: {
      x: 2990, y: 1210, angle: -Math.PI / 2, aimAngle: 0, moving: false,
      health: PLAYER.maxHealth, money: 80, car: null,
      weapon: 'pistol', weapons: { pistol: true, smg: false },
      ammo: { pistol: 60, smg: 0 }, fireCooldown: 0, carHitTimer: 0,
    },
    mara: null,
    wanted: 0, heatTimer: 0, dispatchTimer: 0, roadblockTimer: 18, arrestTimer: 0,
    progress: { missionIndex: 0, packagesFound: 0, faresDone: 0 },
    activeMission: null, dialogue: null, heist: null, taxi: null,
    radioIndex: 0, hudFlash: '', hudFlashTimer: 0,
    spawnTimer: 0, pedTimer: 0,
    camera: { x: 2360, y: 850 },
    effects: createEffects(rng),
    audio: createAudio(),
    input: null,
    screen: SCREEN_TITLE,
    overKind: 'wasted', overFine: 0,
    hasSave: hasSave(),
    shotMode: false, shotTarget: null,
    saveGame() { saveToSlot(G); G.hasSave = true; },
  };
  // Mara waits by the marina boardwalk, gold-shirted and impossible to miss.
  const mara = createPedestrian(rng, 3020, 1180);
  mara.mara = true; mara.name = 'Mara'; mara.shirt = '#ffd23e';
  G.mara = mara;
  // Parked cars along the kerbs, ready to steal.
  for (const spot of parkedCarSpots(rng)) {
    const kinds = ['compact', 'sedan', 'taxi', 'truck', 'sedan'];
    const car = createCar(rng.pick(kinds), spot.x, spot.y, spot.angle, rng);
    car.parked = true;
    G.cars.push(car);
  }
  // Opening traffic so the first street Rio sees is already alive.
  for (let i = 0; i < 16; i += 1) G.cars.push(spawnTrafficCar(rng, G.player.x, G.player.y));
  spawnCrowds(G);
  G.shotTarget = objectiveTarget(G);
  return G;
}

function resetProgress(G) {
  G.progress = { missionIndex: 0, packagesFound: 0, faresDone: 0 };
  G.packages = packageSpots();
  G.player.money = 80;
  G.player.health = PLAYER.maxHealth;
  G.player.weapons = { pistol: true, smg: false };
  G.player.ammo = { pistol: 60, smg: 0 };
  G.player.weapon = 'pistol';
  G.player.x = 2990; G.player.y = 1210; G.player.car = null;
  G.activeMission = null; G.heist = null; G.taxi = null; G.wanted = 0;
}

function respawnPlayer(G, kind) {
  const fine = Math.min(G.player.money, Math.round(G.player.money * 0.12) + 25);
  G.overFine = fine;
  G.player.money -= fine;
  G.overKind = kind;
  G.screen = SCREEN_OVER;
  G.audio.setEngine(false, 0);
  G.audio.setSiren(false);
  if (kind === 'busted') G.audio.playBustedSting();
}

function revivePlayer(G) {
  G.player.health = PLAYER.maxHealth;
  G.player.x = 2990; G.player.y = 1250;
  G.player.car = null;
  G.wanted = 0; G.heatTimer = 0; G.arrestTimer = 0;
  G.cars = G.cars.filter((car) => !car.police);
  G.activeMission = null; G.heist = null; G.taxi = null;
  G.screen = SCREEN_PLAY;
  G.saveGame();
}

function enterOrExitCar(G) {
  const p = G.player;
  if (p.car) {
    const car = p.car;
    p.x = car.x + Math.cos(car.angle - Math.PI / 2) * 30;
    p.y = car.y + Math.sin(car.angle - Math.PI / 2) * 30;
    p.car = null;
    car.driver = null;
    G.audio.playDoorSlam();
    G.audio.setEngine(false, 0);
    return;
  }
  let best = null; let bestD = 52;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = distance(p.x, p.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) return;
  const wasTraffic = !!best.traffic;
  if (best.driver && best.driver.civilian) {
    // The driver bails out and runs, screaming — stealing is a witnessed crime.
    const driver = createPedestrian(G.rng, best.x + 20, best.y + 10);
    driver.panic = 4; driver.fleeFrom = { x: p.x, y: p.y };
    G.peds.push(driver);
    scarePeds(G, p.x, p.y, 150);
  }
  best.driver = { player: true };
  best.parked = false;
  best.traffic = null;
  p.car = best;
  G.audio.playDoorSlam();
  if (wasTraffic || best.parked) reportCrime(G, p.x, p.y, 1);
  if (best.police) reportCrime(G, p.x, p.y, 1);
}

function updatePlayerOnFoot(G, dt) {
  const p = G.player;
  const axis = moveAxis(G.input);
  const running = G.input.isDown('ShiftLeft') || G.input.isDown('ShiftRight');
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  p.moving = axis.x !== 0 || axis.y !== 0;
  if (p.moving) {
    const len = Math.hypot(axis.x, axis.y);
    const nx = p.x + (axis.x / len) * speed * dt;
    const ny = p.y + (axis.y / len) * speed * dt;
    p.angle = Math.atan2(axis.y, axis.x);
    let blocked = false;
    for (const b of G.world.buildings) if (nx > b.x - 9 && nx < b.x + b.w + 9 && ny > b.y - 9 && ny < b.y + b.h + 9) { blocked = true; break; }
    if (!blocked && nx > 30 && nx < 2900 && ny > 30 && ny < WORLD.height - 30) { p.x = nx; p.y = ny; }
  }
  p.aimAngle = Math.atan2(G.input.mouseY - VIEW.height / 2, G.input.mouseX - VIEW.width / 2);
  // Traffic can still clip a careless pedestrian.
  for (const car of G.cars) {
    if (car.traffic && Math.abs(car.speed) > 130 && distance(p.x, p.y, car.x, car.y) < 24) {
      p.health -= 16 * dt * 4;
      G.effects.addShake(3);
    }
  }
}

function updatePlayerDriving(G, dt) {
  const p = G.player;
  const car = p.car;
  const { throttle, steer, handbrake } = driveAxis(G.input);
  const crashed = driveCar(car, dt, throttle, steer, G.world.buildings);
  if (handbrake) car.speed -= car.speed * 2.2 * dt;
  p.x = car.x; p.y = car.y;
  p.aimAngle = car.angle;
  if (crashed && Math.abs(car.speed) > 60) {
    G.effects.addShake(6);
    G.effects.burst(car.x, car.y, 10, '#ffd23e');
    G.audio.playCrash();
    car.health -= 4;
  }
  if (car.skid > 0.4) {
    G.effects.addSkid(car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, car.angle);
    if (G.rng.chance(0.3)) G.effects.smoke(car.x, car.y, 1);
  }
  // Car-to-car contact: shove, spark, damage.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const d = distance(car.x, car.y, other.x, other.y);
    if (d < 40 && d > 0.01) {
      const push = (40 - d) / 2;
      const ux = (other.x - car.x) / d; const uy = (other.y - car.y) / d;
      other.x += ux * push; other.y += uy * push;
      if (Math.abs(car.speed) > 120) {
        other.health -= 9; car.health -= 3;
        G.effects.burst(other.x, other.y, 8, '#ffd23e');
        G.effects.addShake(4);
        G.audio.playCrash();
        scarePeds(G, car.x, car.y, 200);
        if (other.police) reportCrime(G, car.x, car.y, 1);
        if (other.health <= 0 && !other.dead) { other.dead = true; noteCarWrecked(G, other); G.effects.burst(other.x, other.y, 22, '#ff7847'); }
      }
    }
  }
  // Running down a pedestrian is a serious witnessed crime.
  for (const ped of G.peds) {
    if (ped.dead || ped.mara) continue;
    if (Math.abs(car.speed) > 60 && distance(p.x, p.y, ped.x, ped.y) < 24) {
      damagePedestrian(G, ped, 70);
      reportCrime(G, ped.x, ped.y, 1);
      G.effects.addShake(3);
    }
  }
  G.audio.setEngine(true, car.speed / car.spec.topSpeed);
}

function updateCamera(G) {
  const p = G.player;
  const tx = clamp(p.x - VIEW.width / 2, 0, WORLD.width - VIEW.width);
  const ty = clamp(p.y - VIEW.height / 2, 0, WORLD.height - VIEW.height);
  G.camera.x += (tx - G.camera.x) * 0.12;
  G.camera.y += (ty - G.camera.y) * 0.12;
}

function stepGame(G, dt) {
  G.time += dt;
  if (G.hudFlashTimer > 0) G.hudFlashTimer -= dt;
  if (G.screen === SCREEN_PLAY) {
    if (G.player.car) updatePlayerDriving(G, dt);
    else { updatePlayerOnFoot(G, dt); G.audio.setEngine(false, 0); }
    tryPlayerAttack(G, dt);
    updateBullets(G, dt);
    updateMission(G, dt);
    maybeOfferTaxiFare(G);
    updateTaxiFare(G, dt);
    updateCollectibleProgress(G);
    if (checkArrest(G, dt)) { respawnPlayer(G, 'busted'); return; }
    if (G.player.health <= 0) { respawnPlayer(G, 'wasted'); return; }
  }
  maintainTraffic(G, dt);
  maintainCrowds(G, dt);
  for (const car of G.cars) {
    if (car === G.player.car || car.dead) continue;
    if (car.police) updatePoliceCar(G, car, dt);
    else if (car.traffic) updateTrafficCar(G, car, dt);
  }
  for (const ped of G.peds) updatePedestrian(G, ped, dt);
  updateWanted(G, dt);
  updateRadio(G, dt);
  G.audio.setSiren(G.wanted > 0 && G.cars.some((c) => c.police && !c.dead));
  G.effects.update(dt);
  G.shotTarget = objectiveTarget(G);
  updateCamera(G);
}

function handleKeys(G) {
  const input = G.input;
  if (G.screen === SCREEN_TITLE) {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      G.audio.ensureContext();
      const save = loadFromSlot();
      if (save && !input.wasPressed('KeyN')) applySave(G, save);
      else resetProgress(G);
      G.screen = SCREEN_PLAY;
      status.textContent = 'Vice Harbor. Find Mara at the marina.';
    }
    if (input.wasPressed('KeyN')) { G.audio.ensureContext(); resetProgress(G); G.screen = SCREEN_PLAY; }
    return;
  }
  if (G.screen === SCREEN_OVER) {
    if (input.wasPressed('Enter')) revivePlayer(G);
    return;
  }
  if (input.wasPressed('KeyM')) {
    const muted = G.audio.toggleMute();
    G.hudFlash = muted ? 'SOUND OFF' : 'SOUND ON';
    G.hudFlashTimer = 1;
  }
  if (G.screen === SCREEN_DIALOGUE) {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      G.dialogue.index += 1;
      G.audio.playPickup();
      if (G.dialogue.index >= G.dialogue.lines.length) {
        G.dialogue = null;
        G.screen = SCREEN_PLAY;
        G.hudFlash = 'MISSION: ' + (currentMission(G) ? G.activeMission.def.title : '');
        G.hudFlashTimer = 1.8;
      }
    }
    return;
  }
  if (input.wasPressed('Escape')) {
    G.screen = G.screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
    return;
  }
  if (G.screen === SCREEN_PAUSED) {
    if (input.wasPressed('KeyS')) { G.saveGame(); G.screen = SCREEN_TITLE; G.hasSave = true; }
    return;
  }
  if (G.screen !== SCREEN_PLAY) return;
  if (input.wasPressed('KeyF') || input.wasPressed('Enter')) enterOrExitCar(G);
  if (input.wasPressed('KeyR') && G.player.car) cycleRadioStation(G);
  if (input.wasPressed('Digit1')) G.player.weapon = 'fists';
  if (input.wasPressed('Digit2')) G.player.weapon = 'pistol';
  if (input.wasPressed('Digit3') && G.player.weapons.smg) G.player.weapon = 'smg';
  if (input.wasPressed('KeyE')) {
    if (!G.activeMission && G.mara && distance(G.player.x, G.player.y, G.mara.x, G.mara.y) < 56) acceptNextMission(G);
  }
}

function runShot(name) {
  const G = createGameState(seed);
  G.input = createInput(canvas);
  G.shotMode = true;
  const screen = stageShot(name, G);
  let painted = 0;
  function paint() {
    renderer.draw(G, screen, 2.4);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const G = createGameState(seed);
  G.input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let menuNote = 0;
  let menuTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleKeys(G);
    if (G.screen === SCREEN_TITLE) {
      menuTimer -= 1 / 60;
      if (menuTimer <= 0) { menuTimer = 0.42; G.audio.playMenuLoopNote(menuNote++); }
      // The title floats over a living city: traffic and crowds keep moving.
      maintainTraffic(G, 1 / 60);
      for (const car of G.cars) if (car.traffic) updateTrafficCar(G, car, 1 / 60);
      for (const ped of G.peds) updatePedestrian(G, ped, 1 / 60);
      G.time += 1 / 60;
      updateCamera(G);
    } else if (G.screen !== SCREEN_PAUSED) {
      while (accumulator >= STEP) { stepGame(G, STEP); accumulator -= STEP; if (G.screen === SCREEN_PAUSED) { accumulator = 0; break; } }
    } else accumulator = 0;
    renderer.draw(G, G.screen, G.time);
    G.input.endFrame();
  }
  status.textContent = 'Vice Harbor. Press Enter to start.';
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_DIALOGUE, SCREEN_OVER };
