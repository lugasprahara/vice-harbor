// Vice Harbor — traffic AI. Civilian cars pick an avenue or street, drive the
// correct lane, slow for the car ahead, brake at junctions when cross traffic is
// passing, and turn at intersections. When the player steals one, its driver
// bails out and flees on foot (handled by main through the flee flag here).

import { AVENUES, STREETS, WORLD } from './config.js';
import { angleLerp, clamp, distance, laneOffset, nearestAvenue, nearestStreet } from './geo.js';
import { createCar } from './vehicles.js';

const KINDS = ['compact', 'sedan', 'sedan', 'taxi', 'compact', 'truck'];

export function spawnTrafficCar(rng, nearX, nearY) {
  const vertical = rng.chance(0.5);
  const dir = rng.chance(0.5) ? 1 : -1;
  let x; let y; let angle;
  if (vertical) {
    const av = rng.pick(AVENUES);
    x = av + laneOffset(dir);
    y = clamp(nearY + rng.range(-700, 700), 90, WORLD.height - 90);
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    const st = rng.pick(STREETS);
    y = st + laneOffset(dir);
    x = clamp(nearX + rng.range(-700, 700), 90, 2780);
    angle = dir > 0 ? 0 : Math.PI;
  }
  const car = createCar(rng.pick(KINDS), x, y, angle, rng);
  car.traffic = { vertical, dir, speed: rng.range(95, 150), turnCooldown: rng.range(1, 4) };
  car.driver = { civilian: true };
  return car;
}

export function maintainTraffic(G, dt) {
  const p = G.player;
  let near = 0;
  for (const car of G.cars) if (car.traffic && distance(car.x, car.y, p.x, p.y) < 900) near += 1;
  G.spawnTimer -= dt;
  if (near < 15 && G.spawnTimer <= 0) {
    G.spawnTimer = 0.7;
    const car = spawnTrafficCar(G.rng, p.x, p.y);
    if (distance(car.x, car.y, p.x, p.y) > 260) G.cars.push(car);
  }
  // Despawn far-away traffic so the streets near the player stay dense.
  G.cars = G.cars.filter((car) => !car.traffic || car === p.car || distance(car.x, car.y, p.x, p.y) < 1150);
}

export function updateTrafficCar(G, car, dt) {
  const t = car.traffic;
  if (!t) return;
  t.turnCooldown -= dt;
  let targetSpeed = t.speed;
  // Slow for whoever is ahead in the same lane.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const aheadX = car.x + Math.cos(car.angle) * 58;
    const aheadY = car.y + Math.sin(car.angle) * 58;
    if (distance(aheadX, aheadY, other.x, other.y) < 34) targetSpeed = Math.min(targetSpeed, Math.abs(other.speed) * 0.8);
  }
  if (G.player.car === null && distance(car.x, car.y, G.player.x, G.player.y) < 52) targetSpeed = 0;
  // Brake at junctions when cross traffic crosses.
  const junctionX = nearestAvenue(car.x); const junctionY = nearestStreet(car.y);
  if (Math.abs(car.x - junctionX) < 74 && Math.abs(car.y - junctionY) < 74) {
    for (const other of G.cars) {
      if (other !== car && Math.abs(other.x - junctionX) < 60 && Math.abs(other.y - junctionY) < 60 && Math.abs(other.speed) > 12) { targetSpeed = Math.min(targetSpeed, 20); break; }
    }
  }
  car.speed += clamp(targetSpeed - Math.abs(car.speed), -260 * dt, 120 * dt) * Math.sign(car.speed || 1);
  if (Math.abs(car.speed) < 4 && targetSpeed > 0) car.speed = 30 * (t.dir > 0 ? 1 : 1);
  const want = t.vertical ? (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (t.dir > 0 ? 0 : Math.PI);
  // Occasionally turn at a junction: swap axis, keep right-hand lane.
  if (t.turnCooldown <= 0 && Math.abs(car.x - junctionX) < 10 && Math.abs(car.y - junctionY) < 10 && G.rng.chance(0.4)) {
    t.vertical = !t.vertical;
    t.dir = G.rng.chance(0.5) ? 1 : -1;
    t.turnCooldown = 3;
  }
  const laneTarget = t.vertical ? junctionX + laneOffset(t.dir) : junctionY + laneOffset(t.dir);
  const drift = t.vertical ? (laneTarget - car.x) * 0.02 : (laneTarget - car.y) * 0.02;
  car.angle = angleLerp(car.angle, want + (t.vertical ? drift : -drift) * 0.4, dt * 3);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (car.x < 60 || car.x > 2840 || car.y < 60 || car.y > WORLD.height - 60) { t.dir *= -1; }
}
