// Vice Harbor — tiny geometry helpers shared by every system: distances, angles,
// rectangle overlap for buildings, and road queries the traffic and police AI use
// to stay in lanes and find the nearest junction.

import { AVENUES, ROAD_WIDTH, STREETS, WATER_X, WORLD } from './config.js';

export function clamp(value, min, max) { return value < min ? min : value > max ? max : value; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function distance(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
export function distanceSq(ax, ay, bx, by) { const dx = bx - ax; const dy = by - ay; return dx * dx + dy * dy; }

export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

export function angleLerp(from, to, t) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * clamp(t, 0, 1);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function isOnRoad(x, y) {
  if (x > WATER_X) return false;
  for (const ax of AVENUES) if (Math.abs(x - ax) < ROAD_WIDTH / 2) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) < ROAD_WIDTH / 2) return true;
  return false;
}

export function isWater(x, y) { return x >= WATER_X && x < WORLD.width; }
export function isBeach(x, y) { return x >= WATER_X - 130 && x < WATER_X; }

export function nearestAvenue(x) {
  let best = AVENUES[0];
  for (const ax of AVENUES) if (Math.abs(ax - x) < Math.abs(best - x)) best = ax;
  return best;
}

export function nearestStreet(y) {
  let best = STREETS[0];
  for (const sy of STREETS) if (Math.abs(sy - y) < Math.abs(best - y)) best = sy;
  return best;
}

/** Lane centre offset: traffic drives on the right, so eastbound uses the lower lane. */
export function laneOffset(directionSign) { return directionSign >= 0 ? 18 : -18; }

export function clampToWorld(x, y, margin) {
  return { x: clamp(x, margin, WORLD.width - margin), y: clamp(y, margin, WORLD.height - margin) };
}
