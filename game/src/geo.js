// Small geometry helpers shared by every system: distances, angles, and the
// collision rules of the city — buildings are solid, the water is not walkable
// or drivable, and everything stays inside the world.

import { WORLD } from './config.js';

/** Straight-line distance between two points. */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** The angle from (x1, y1) toward (x2, y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** The smallest signed turn from angle `from` to angle `to`. */
export function angleDifference(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Move `angle` toward `target` by at most `maxStep` radians. */
export function turnToward(angle, target, maxStep) {
  const diff = angleDifference(angle, target);
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

/** True when the point is inside any building of the city. */
export function pointInBuilding(city, x, y) {
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** True when the point is in the water on the east edge. */
export function inWater(city, x, y) {
  return x > city.waterX;
}

/**
 * Push a circle (entity with x, y and a radius) out of every building it overlaps
 * and out of the water, and clamp it inside the world. Returns true when anything
 * was pushed — a crash, for a car.
 */
export function resolveCircleVsCity(city, ent, radius) {
  let pushed = false;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    const nearestX = Math.max(b.x, Math.min(ent.x, b.x + b.w));
    const nearestY = Math.max(b.y, Math.min(ent.y, b.y + b.h));
    const dx = ent.x - nearestX;
    const dy = ent.y - nearestY;
    const dist = Math.hypot(dx, dy);
    if (dist < radius) {
      pushed = true;
      if (dist > 0.001) {
        ent.x = nearestX + (dx / dist) * radius;
        ent.y = nearestY + (dy / dist) * radius;
      } else {
        // Dead centre inside a building: shove it out along the shortest side.
        const left = ent.x - b.x;
        const right = b.x + b.w - ent.x;
        const top = ent.y - b.y;
        const bottom = b.y + b.h - ent.y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) ent.x = b.x - radius;
        else if (min === right) ent.x = b.x + b.w + radius;
        else if (min === top) ent.y = b.y - radius;
        else ent.y = b.y + b.h + radius;
      }
    }
  }
  if (ent.x > city.waterX - radius) {
    ent.x = city.waterX - radius;
    pushed = true;
  }
  if (ent.x < radius) { ent.x = radius; pushed = true; }
  if (ent.y < radius) { ent.y = radius; pushed = true; }
  if (ent.x > WORLD.width - radius) { ent.x = WORLD.width - radius; pushed = true; }
  if (ent.y > WORLD.height - radius) { ent.y = WORLD.height - radius; pushed = true; }
  return pushed;
}

/** True when the point is on a road (within the road's width of a road centre). */
export function onRoad(city, x, y) {
  for (let i = 0; i < city.roadsV.length; i += 1) {
    if (Math.abs(x - city.roadsV[i]) < 48) return true;
  }
  for (let i = 0; i < city.roadsH.length; i += 1) {
    if (Math.abs(y - city.roadsH[i]) < 48) return true;
  }
  return false;
}

/** The nearest road centre to a point, as {x, y} on the road grid. */
export function nearestRoadPoint(city, x, y) {
  let bestV = city.roadsV[0];
  for (let i = 1; i < city.roadsV.length; i += 1) {
    if (Math.abs(city.roadsV[i] - x) < Math.abs(bestV - x)) bestV = city.roadsV[i];
  }
  let bestH = city.roadsH[0];
  for (let i = 1; i < city.roadsH.length; i += 1) {
    if (Math.abs(city.roadsH[i] - y) < Math.abs(bestH - y)) bestH = city.roadsH[i];
  }
  // Prefer the closer of the two axes.
  if (Math.abs(bestV - x) <= Math.abs(bestH - y)) return { x: bestV, y };
  return { x, y: bestH };
}
