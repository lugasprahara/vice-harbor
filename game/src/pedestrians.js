// Pedestrians: the people on the sidewalks. They stroll between sidewalk
// points, run away from gunfire, crashes and the player swinging fists, and
// fall when they are hit. The city keeps its count topped up.

import { PEDS, PED_SHIRTS } from './config.js';
import { randomPick, randomRange } from './random.js';
import { angleTo, distance, resolveCircleVsCity } from './geo.js';

/** A random sidewalk point: just off a road, never inside a building. */
function sidewalkPoint(game) {
  const { city, rng } = game;
  for (let tries = 0; tries < 12; tries += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? randomPick(rng, city.roadsV) : randomPick(rng, city.roadsH);
    const along = randomRange(rng, 160, 2240);
    const side = randomPick(rng, [-1, 1]);
    const x = vertical ? road + side * randomRange(rng, 58, 74) : along;
    const y = vertical ? along : road + side * randomRange(rng, 58, 74);
    if (x < 60 || x > 3060 || y < 60 || y > 2340) continue;
    if (game.city.buildings.some((b) => x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8)) continue;
    return { x, y };
  }
  return { x: 700, y: 700 };
}

/** The next place a pedestrian strolls to: usually further along the same road's sidewalk. */
function nextWalkTarget(game, ped) {
  const { city, rng } = game;
  let bestV = city.roadsV[0];
  for (let i = 1; i < city.roadsV.length; i += 1) {
    if (Math.abs(city.roadsV[i] - ped.x) < Math.abs(bestV - ped.x)) bestV = city.roadsV[i];
  }
  let bestH = city.roadsH[0];
  for (let i = 1; i < city.roadsH.length; i += 1) {
    if (Math.abs(city.roadsH[i] - ped.y) < Math.abs(bestH - ped.y)) bestH = city.roadsH[i];
  }
  const vertical = Math.abs(bestV - ped.x) <= Math.abs(bestH - ped.y);
  const side = vertical
    ? (ped.x >= bestV ? 1 : -1)
    : (ped.y >= bestH ? 1 : -1);
  const offset = 58 + rng() * 12;
  const along = (vertical ? ped.y : ped.x) + (rng() < 0.5 ? -1 : 1) * (150 + rng() * 300);
  if (vertical) {
    return { x: bestV + side * offset, y: Math.max(120, Math.min(2280, along)) };
  }
  return { x: Math.max(120, Math.min(3080, along)), y: bestH + side * offset };
}

function makePed(game, x, y) {
  const target = sidewalkPoint(game);
  return {
    x, y,
    angle: randomRange(game.rng, 0, Math.PI * 2),
    speed: randomRange(game.rng, PEDS.walkMin, PEDS.walkMax),
    state: 'walk',
    targetX: target.x,
    targetY: target.y,
    fleeX: 0,
    fleeY: 0,
    fleeTimer: 0,
    deadTimer: 0,
    shirt: randomPick(game.rng, PED_SHIRTS),
    radius: 11,
  };
}

export function spawnPedestrians(game) {
  for (let i = 0; i < PEDS.count; i += 1) {
    const point = sidewalkPoint(game);
    game.peds.push(makePed(game, point.x, point.y));
  }
}

/** Every pedestrian within `radius` of (x, y) runs away from it. */
export function scatterPeds(game, x, y, radius) {
  for (const ped of game.peds) {
    if (ped.state === 'dead') continue;
    if (distance(ped.x, ped.y, x, y) < radius) {
      ped.state = 'flee';
      ped.fleeX = x;
      ped.fleeY = y;
      ped.fleeTimer = 2.5;
    }
  }
}

/** Advance every pedestrian one step. */
export function stepPedestrians(game, dt) {
  for (const ped of game.peds) {
    if (ped.state === 'dead') {
      ped.deadTimer -= dt;
      if (ped.deadTimer <= 0) {
        // A fresh face takes their place, far from the player.
        const point = sidewalkPoint(game);
        const fresh = makePed(game, point.x, point.y);
        Object.assign(ped, fresh);
      }
      continue;
    }
    if (ped.state === 'wait') {
      // A waiting taxi passenger: stands at the kerb until picked up.
      continue;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const away = angleTo(ped.fleeX, ped.fleeY, ped.x, ped.y);
      ped.angle = away;
      ped.x += Math.cos(away) * PEDS.fleeSpeed * dt;
      ped.y += Math.sin(away) * PEDS.fleeSpeed * dt;
      resolveCircleVsCity(game.city, ped, ped.radius);
      if (ped.fleeTimer <= 0) {
        ped.state = 'walk';
        const target = nextWalkTarget(game, ped);
        ped.targetX = target.x;
        ped.targetY = target.y;
      }
      continue;
    }
    const targetAngle = angleTo(ped.x, ped.y, ped.targetX, ped.targetY);
    ped.angle = targetAngle;
    ped.x += Math.cos(targetAngle) * ped.speed * dt;
    ped.y += Math.sin(targetAngle) * ped.speed * dt;
    resolveCircleVsCity(game.city, ped, ped.radius);
    if (distance(ped.x, ped.y, ped.targetX, ped.targetY) < 14) {
      const target = nextWalkTarget(game, ped);
      ped.targetX = target.x;
      ped.targetY = target.y;
    }
  }
}
