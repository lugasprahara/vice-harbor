// Vice Harbor — the wanted system and police response. Crimes witnessed by
// pedestrians or police raise the heat (1–5 stars); staying out of sight lets it
// decay. Dispatch sends patrol cars, then faster interceptors at high heat, and
// at 3+ stars sets roadblocks across avenues. Officers pursue, ram, and arrest:
// surrounded at low speed means BUSTED.

import { WORLD } from './config.js';
import { angleLerp, clamp, distance, nearestAvenue } from './geo.js';
import { createCar } from './vehicles.js';
import { scarePeds } from './pedestrians.js';

export function reportCrime(G, x, y, severity) {
  let witnessed = G.wanted > 0;
  for (const ped of G.peds) if (!ped.dead && distance(ped.x, ped.y, x, y) < 240) witnessed = true;
  for (const car of G.cars) if (car.police && distance(car.x, car.y, x, y) < 420) witnessed = true;
  if (!witnessed) return false;
  const before = G.wanted;
  G.wanted = clamp(G.wanted + severity, 0, 5);
  G.heatTimer = Math.max(G.heatTimer, 14);
  if (G.wanted > before) { G.audio.playWantedBlip(); G.hudFlash = 'WANTED LEVEL ' + G.wanted; G.hudFlashTimer = 1.6; }
  scarePeds(G, x, y, 260);
  return true;
}

export function desiredPoliceCount(wanted) {
  return [0, 2, 3, 4, 6, 8][clamp(Math.round(wanted), 0, 5)] || 0;
}

export function dispatchPoliceBackup(G) {
  const p = G.player;
  const want = desiredPoliceCount(G.wanted);
  let active = 0;
  for (const car of G.cars) if (car.police && !car.dead) active += 1;
  if (active >= want) return;
  const angle = G.rng.range(0, Math.PI * 2);
  const dist = G.rng.range(560, 720);
  const x = clamp(p.x + Math.cos(angle) * dist, 80, 2820);
  const y = clamp(p.y + Math.sin(angle) * dist, 80, WORLD.height - 80);
  const kind = G.wanted >= 4 && active % 2 === 1 ? 'interceptor' : 'police';
  const car = createCar(kind, x, y, angle + Math.PI, G.rng);
  car.driver = { officer: true };
  G.cars.push(car);
}

export function placeRoadblock(G) {
  const p = G.player;
  const avenue = nearestAvenue(p.x + (p.car ? Math.cos(p.car.angle) * 420 : 200));
  const y = clamp(p.y + (p.car && Math.sin(p.car.angle) > 0 ? 380 : -380), 140, WORLD.height - 140);
  for (const side of [-26, 26]) {
    const car = createCar('police', avenue + side, y, side < 0 ? 0.5 : Math.PI - 0.5, G.rng);
    car.roadblock = true;
    car.driver = { officer: true };
    G.cars.push(car);
  }
  G.roadblockTimer = 26;
  G.hudFlash = 'ROADBLOCK AHEAD';
  G.hudFlashTimer = 1.6;
}

export function updateWanted(G, dt) {
  if (G.wanted <= 0) return;
  // Seen by any officer resets the decay clock.
  let seen = false;
  for (const car of G.cars) if (car.police && !car.dead && distance(car.x, car.y, G.player.x, G.player.y) < 430) seen = true;
  if (seen) G.heatTimer = Math.max(G.heatTimer, 6);
  else {
    G.heatTimer -= dt;
    if (G.heatTimer <= 0) {
      G.wanted = Math.max(0, G.wanted - 1);
      G.heatTimer = 12;
      if (G.wanted === 0) G.hudFlash = 'YOU LOST THE COPS';
      else G.hudFlash = 'HEAT COOLING…';
      G.hudFlashTimer = 1.6;
    }
  }
  G.dispatchTimer -= dt;
  if (G.dispatchTimer <= 0) { G.dispatchTimer = 1.4; dispatchPoliceBackup(G); }
  if (G.wanted >= 3) {
    G.roadblockTimer -= dt;
    if (G.roadblockTimer <= 0) placeRoadblock(G);
  }
  // Officers give up and leave when the heat is gone.
  if (G.wanted === 0) G.cars = G.cars.filter((car) => !car.police || distance(car.x, car.y, G.player.x, G.player.y) < 300);
}

export function updatePoliceCar(G, car, dt) {
  const p = G.player;
  const tx = p.car ? p.car.x : p.x;
  const ty = p.car ? p.car.y : p.y;
  if (car.roadblock) { car.speed *= 0.9; return; }
  const dist = distance(car.x, car.y, tx, ty);
  const aggression = 0.75 + G.wanted * 0.09;
  let targetSpeed = car.spec.topSpeed * aggression;
  // Aim slightly ahead of a moving target to intercept, not just follow.
  const lead = clamp(dist / 300, 0, 0.6);
  const aimX = tx + (p.car ? Math.cos(p.car.angle) * p.car.speed * lead : 0);
  const aimY = ty + (p.car ? Math.sin(p.car.angle) * p.car.speed * lead : 0);
  const want = Math.atan2(aimY - car.y, aimX - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle = angleLerp(car.angle, want, dt * (dist > 120 ? 2.6 : 4.2));
  if (Math.abs(diff) > 2.2) targetSpeed *= 0.3;
  if (dist < 46) targetSpeed = Math.min(targetSpeed, 60);
  car.speed += clamp(targetSpeed - car.speed, -420 * dt, car.spec.accel * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  let blocked = false;
  for (const b of G.world.buildings) if (nx > b.x - 20 && nx < b.x + b.w + 20 && ny > b.y - 14 && ny < b.y + b.h + 14) { blocked = true; break; }
  if (!blocked) { car.x = clamp(nx, 50, 2880); car.y = clamp(ny, 50, WORLD.height - 50); }
  else { car.speed *= -0.3; car.angle += dt * 2; }
  // Ramming: contact shoves the player's car and damages both.
  if (p.car && distance(car.x, car.y, p.car.x, p.car.y) < 40 && Math.abs(car.speed) > 90) {
    p.car.speed *= 0.72;
    p.car.health -= 3.2;
    car.health -= 2;
    G.effects.addShake(5);
    G.effects.burst(p.car.x, p.car.y, 8, '#ffd23e');
    G.audio.playCrash();
    G.player.carHitTimer = 0.5;
  }
  if (car.health <= 0 && !car.dead) { car.dead = true; G.effects.burst(car.x, car.y, 26, '#ff7847'); G.effects.addShake(7); }
}

/** Arrest check: on foot or crawling while an officer is close means busted. */
export function checkArrest(G, dt) {
  if (G.wanted <= 0 || G.screen !== 'play') return false;
  const p = G.player;
  const slow = !p.car || Math.abs(p.car.speed) < 26;
  if (!slow) { G.arrestTimer = 0; return false; }
  let near = 0;
  for (const car of G.cars) if (car.police && !car.dead && distance(car.x, car.y, p.x, p.y) < 74) near += 1;
  if (near > 0) {
    G.arrestTimer += dt;
    if (G.arrestTimer > 1.15) return true;
  } else G.arrestTimer = Math.max(0, G.arrestTimer - dt * 2);
  return false;
}
