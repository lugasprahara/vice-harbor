// Vice Harbor — the live minimap: a scaled plan of the whole city (roads, beach
// and water) with blips for Rio, the objective, police (flashing), Mara, taxi
// fares and unfound packages, plus a north marker and district tint.

import { AVENUES, STREETS, WATER_X, WORLD } from './config.js';
import { objectiveTarget } from './missions.js';

const MAP_W = 196;
const MAP_H = 150;
const MAP_X = 1280 - MAP_W - 16;
const MAP_Y = 720 - MAP_H - 16;

export function minimapRect() { return { x: MAP_X, y: MAP_Y, w: MAP_W, h: MAP_H }; }

function toMap(x, y) {
  return { x: MAP_X + (x / WORLD.width) * MAP_W, y: MAP_Y + (y / WORLD.height) * MAP_H };
}

function blip(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, size, 0, 6.29); ctx.fill();
}

export function drawMinimap(ctx, G, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(7,12,26,0.88)';
  ctx.beginPath(); ctx.roundRect(MAP_X - 3, MAP_Y - 3, MAP_W + 6, MAP_H + 6, 8); ctx.fill();
  ctx.fillStyle = '#182238';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  // Water and beach on the east edge.
  const wx = MAP_X + (WATER_X / WORLD.width) * MAP_W;
  ctx.fillStyle = '#0d3550';
  ctx.fillRect(wx, MAP_Y, MAP_X + MAP_W - wx, MAP_H);
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(wx - 4, MAP_Y, 4, MAP_H);
  // Roads.
  ctx.strokeStyle = '#5a6280'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const ax of AVENUES) { const p = toMap(ax, 0); ctx.moveTo(p.x, MAP_Y); ctx.lineTo(p.x, MAP_Y + MAP_H); }
  for (const sy of STREETS) { const p = toMap(0, sy); ctx.moveTo(MAP_X, p.y); ctx.lineTo(MAP_X + MAP_W, p.y); }
  ctx.stroke();
  // Unfound packages as faint gold dots.
  for (const pack of G.packages) if (!pack.taken) { const p = toMap(pack.x, pack.y); blip(ctx, p.x, p.y, 'rgba(255,210,62,0.75)', 1.8); }
  // Police blips flash red/blue with the light bars.
  const flash = Math.floor(time * 5) % 2 === 0;
  for (const car of G.cars) if (car.police && !car.dead) { const p = toMap(car.x, car.y); blip(ctx, p.x, p.y, flash ? '#ff2e4d' : '#2e7bff', 3); }
  // Mara / objective / taxi blips.
  if (G.mara) { const p = toMap(G.mara.x, G.mara.y); blip(ctx, p.x, p.y, '#ffd23e', 3.4); }
  const target = objectiveTarget(G);
  if (target) { const p = toMap(target.x, target.y); ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + Math.sin(time * 4) * 1.4, 0, 6.29); ctx.stroke(); }
  if (G.taxi) { const p = toMap(G.taxi.target.x, G.taxi.target.y); blip(ctx, p.x, p.y, '#ff6bde', 3.4); }
  // Player arrow.
  const pp = toMap(G.player.x, G.player.y);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  ctx.rotate(G.player.car ? G.player.car.angle : G.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -3.6); ctx.lineTo(-4, 3.6); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f2f5ff';
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('N', MAP_X + MAP_W - 4, MAP_Y + 11);
  ctx.restore();
}
