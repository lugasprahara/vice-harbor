// Vice Harbor — pedestrians. Civilians stroll the sidewalks in crowds, each with
// their own shirt colour and pace; they panic and flee from gunfire, crashes and
// speeding cars, and some drop cash when knocked down. Mara, the story fixer, is
// a special pedestrian who waits at mission markers and delivers dialogue.

import { STREETS, AVENUES, WORLD } from './config.js';
import { angleLerp, clamp, distance } from './geo.js';

const SHIRTS = ['#ff6b81', '#f7c948', '#2ee6a8', '#54a0ff', '#eccc68', '#ff9ff3', '#48dbfb', '#f368e0', '#c8d6e5', '#ff9f43'];
let nextPedId = 1;

export function createPedestrian(rng, x, y) {
  return {
    id: nextPedId++, x, y, angle: rng.range(0, 6.28),
    speed: rng.range(38, 66), walkPhase: rng.range(0, 6.28),
    shirt: rng.pick(SHIRTS), skin: rng.pick(['#f1c27d', '#e0ac69', '#8d5524', '#ffdbac', '#6b4423']),
    pants: rng.pick(['#2f3542', '#57606f', '#3b3b98', '#222f3e']),
    panic: 0, health: 60, dead: false, fleeFrom: null, mara: false, name: '',
  };
}

export function spawnCrowds(G) {
  for (let i = 0; i < 64; i += 1) {
    const onAvenue = G.rng.chance(0.55);
    let x; let y;
    if (onAvenue) { const av = G.rng.pick(AVENUES); x = av + (G.rng.chance(0.5) ? -82 : 82); y = G.rng.range(90, WORLD.height - 90); }
    else { const st = G.rng.pick(STREETS); y = st + (G.rng.chance(0.5) ? -82 : 82); x = G.rng.range(90, 2780); }
    G.peds.push(createPedestrian(G.rng, x, y));
  }
}

export function maintainCrowds(G, dt) {
  G.pedTimer -= dt;
  if (G.pedTimer <= 0) {
    G.pedTimer = 1.1;
    let near = 0;
    for (const ped of G.peds) if (!ped.mara && distance(ped.x, ped.y, G.player.x, G.player.y) < 800) near += 1;
    if (near < 26) {
      const a = G.rng.range(0, Math.PI * 2);
      const d = G.rng.range(480, 720);
      const x = clamp(G.player.x + Math.cos(a) * d, 70, 2820);
      const y = clamp(G.player.y + Math.sin(a) * d, 70, WORLD.height - 70);
      G.peds.push(createPedestrian(G.rng, x, y));
    }
    G.peds = G.peds.filter((ped) => ped.mara || distance(ped.x, ped.y, G.player.x, G.player.y) < 1000);
  }
}

export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (ped.mara || ped.dead) continue;
    if (distance(ped.x, ped.y, x, y) < radius) { ped.panic = G.rng.range(2.2, 4); ped.fleeFrom = { x, y }; }
  }
}

export function updatePedestrian(G, ped, dt) {
  if (ped.dead || ped.mara) return;
  ped.walkPhase += dt * (ped.panic > 0 ? 13 : 7);
  let want = ped.angle;
  let speed = ped.speed;
  if (ped.panic > 0 && ped.fleeFrom) {
    ped.panic -= dt;
    want = Math.atan2(ped.y - ped.fleeFrom.y, ped.x - ped.fleeFrom.x);
    speed = 175;
  } else if (G.rng.chance(dt * 0.14)) {
    want = G.rng.range(0, Math.PI * 2);
  }
  ped.angle = angleLerp(ped.angle, want, dt * 5);
  const nx = ped.x + Math.cos(ped.angle) * speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * speed * dt;
  let blocked = false;
  for (const b of G.world.buildings) if (nx > b.x - 8 && nx < b.x + b.w + 8 && ny > b.y - 8 && ny < b.y + b.h + 8) { blocked = true; break; }
  if (!blocked && nx > 40 && nx < 2880 && ny > 40 && ny < WORLD.height - 40) { ped.x = nx; ped.y = ny; }
  else ped.angle += 2.4 * dt;
}

export function drawPedestrian(ctx, ped, time) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  const bob = Math.sin(ped.walkPhase) * 1.6;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 5, 8, 4, 0, 0, 6.29); ctx.fill();
  if (ped.dead) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = ped.shirt; ctx.fillRect(-10, -4, 20, 8);
    ctx.fillStyle = ped.skin; ctx.beginPath(); ctx.arc(13, 0, 5, 0, 6.29); ctx.fill();
    ctx.restore();
    return;
  }
  // Legs scissor as they walk, torso, head.
  ctx.strokeStyle = ped.pants; ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ped.walkPhase) * 5, 8);
  ctx.moveTo(0, 0); ctx.lineTo(-Math.sin(ped.walkPhase) * 5, 8);
  ctx.stroke();
  ctx.fillStyle = ped.mara ? '#ffd23e' : ped.shirt;
  ctx.beginPath(); ctx.roundRect(-5.5, -6 + bob * 0.3, 11, 12, 4); ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(0, -10 + bob * 0.3, 5.2, 0, 6.29); ctx.fill();
  if (ped.mara) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', 0, -24 + Math.sin(time * 3) * 2);
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('MARA', 0, -34);
  }
  ctx.restore();
}
