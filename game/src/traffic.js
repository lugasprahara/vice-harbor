// Traffic: the cars that fill the roads, and the parked cars waiting to be
// stolen. Traffic cars drive in lanes (right-hand side), slow for the car
// ahead, and sometimes turn at an intersection. Parked cars sit at the kerb.

import { CAR_COLORS, TRAFFIC } from './config.js';
import { randomPick, randomRange } from './random.js';
import { distance } from './geo.js';

function nextCarId(game) {
  game.carSeq = (game.carSeq ?? 0) + 1;
  return game.carSeq;
}

/** Build a car object; `opts` marks it parked, traffic or police. */
export function makeCar(game, x, y, angle, opts) {
  return {
    id: nextCarId(game),
    x, y, angle,
    speed: opts.speed ?? 0,
    color: opts.color ?? randomPick(game.rng, CAR_COLORS),
    length: 46,
    width: 22,
    parked: opts.parked ?? false,
    traffic: opts.traffic ?? false,
    police: opts.police ?? false,
    driver: opts.driver ?? null,
    axis: opts.axis ?? 'v',
    dir: opts.dir ?? 1,
    lastIntersection: '',
    ramCooldown: 0,
    leaveTimer: 0,
  };
}

/** Parked cars along the kerbs, ready to be taken. */
export function spawnParkedCars(game) {
  const { city, rng } = game;
  for (let i = 0; i < TRAFFIC.parkedCount; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical
      ? randomPick(rng, city.roadsV)
      : randomPick(rng, city.roadsH);
    const along = randomRange(rng, 200, vertical ? 2200 : 2200);
    const side = randomPick(rng, [-1, 1]);
    const x = vertical ? road + side * 56 : along;
    const y = vertical ? along : road + side * 56;
    const angle = vertical ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
    const car = makeCar(game, x, y, angle, { parked: true });
    game.cars.push(car);
  }
}

/** Moving traffic, spread over the road grid. */
export function spawnTrafficCars(game) {
  const { city, rng } = game;
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical
      ? randomPick(rng, city.roadsV)
      : randomPick(rng, city.roadsH);
    const dir = randomPick(rng, [-1, 1]);
    const along = randomRange(rng, 200, 2200);
    const lane = dir > 0 ? 24 : -24;
    const x = vertical ? road + lane : along;
    const y = vertical ? along : road + lane;
    const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const speed = randomRange(rng, TRAFFIC.cruiseMin, TRAFFIC.cruiseMax);
    game.cars.push(makeCar(game, x, y, angle, {
      traffic: true, speed, axis: vertical ? 'v' : 'h', dir,
    }));
  }
}

/** Is there a car ahead of `car` within `range`, along its heading? */
function carAhead(game, car, range) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let nearest = null;
  let nearestDist = range;
  for (const other of game.cars) {
    if (other === car || other.parked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    if (along <= 10 || along >= nearestDist) continue;
    const side = Math.abs(-dx * fy + dy * fx);
    if (side > 26) continue;
    nearest = other;
    nearestDist = along;
  }
  return nearest;
}

function turnAtIntersection(game, car, dt) {
  const { city } = game;
  const cross = car.axis === 'v' ? city.roadsH : city.roadsV;
  const along = car.axis === 'v' ? car.y : car.x;
  for (const road of cross) {
    if (Math.abs(along - road) > 22) continue;
    const key = `${car.axis}:${road}`;
    if (car.lastIntersection === key) return;
    car.lastIntersection = key;
    if (game.rng() > 0.3) return;
    const newDir = randomPick(game.rng, [-1, 1]);
    if (car.axis === 'v') {
      car.axis = 'h';
      car.dir = newDir;
      car.y = road + (newDir > 0 ? 24 : -24);
      car.angle = newDir > 0 ? 0 : Math.PI;
    } else {
      car.axis = 'v';
      car.dir = newDir;
      car.x = road + (newDir > 0 ? 24 : -24);
      car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    return;
  }
}

function edgeTurn(car) {
  // Reached the edge of the city: turn around and head back along the same road.
  if (car.axis === 'v') {
    if (car.y < 160 || car.y > 2240) {
      car.dir *= -1;
      car.angle += Math.PI;
      car.x += car.dir > 0 ? 48 : -48;
    }
  } else if (car.x < 160 || car.x > 3040) {
    car.dir *= -1;
    car.angle += Math.PI;
    car.y += car.dir > 0 ? 48 : -48;
  }
}

/** Advance every traffic car one step. */
export function stepTraffic(game, dt) {
  for (const car of game.cars) {
    if (!car.traffic) continue;
    const ahead = carAhead(game, car, 90);
    let target = car.cruiseSpeed ?? (car.cruiseSpeed = TRAFFIC.cruiseMin + game.rng() * (TRAFFIC.cruiseMax - TRAFFIC.cruiseMin));
    if (ahead) {
      const gap = distance(car.x, car.y, ahead.x, ahead.y);
      target = gap < 44 ? 0 : Math.min(target, ahead.speed * 0.85);
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
    turnAtIntersection(game, car, dt);
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    car.x += fx * car.speed * dt;
    car.y += fy * car.speed * dt;
    edgeTurn(car);
  }
}
