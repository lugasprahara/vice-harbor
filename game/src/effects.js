// Vice Harbor — visual effects: a pooled particle system (sparks, smoke, muzzle
// smoke, cash sparkles), fading skid marks laid by drifting tyres, and screen
// shake that decays after crashes and gunfire. Pure presentation: no game rules.

import { clamp } from './geo.js';

export function createEffects(rng) {
  const particles = [];
  const skids = [];
  let shake = 0;

  function burst(x, y, count, color, speed) {
    for (let i = 0; i < count; i += 1) {
      if (particles.length > 420) particles.shift();
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(20, speed || 170);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rng.range(0.25, 0.8), max: 0.8, color, size: rng.range(1.5, 3.6) });
    }
  }

  function smoke(x, y, count) {
    for (let i = 0; i < (count || 1); i += 1) {
      if (particles.length > 420) particles.shift();
      particles.push({ x: x + rng.range(-5, 5), y: y + rng.range(-5, 5), vx: rng.range(-9, 9), vy: rng.range(-24, -8), life: rng.range(0.7, 1.5), max: 1.5, color: 'rgba(120,126,148,0.5)', size: rng.range(4, 9) });
    }
  }

  function addSkid(x, y, angle) {
    skids.push({ x, y, angle, life: 5 });
    if (skids.length > 300) skids.shift();
  }

  function addShake(amount) { shake = clamp(shake + amount, 0, 13); }

  function update(dt) {
    shake = Math.max(0, shake - dt * 22);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
    for (let i = skids.length - 1; i >= 0; i -= 1) { skids[i].life -= dt; if (skids[i].life <= 0) skids.splice(i, 1); }
  }

  function shakeOffset() {
    if (shake <= 0.1) return { x: 0, y: 0 };
    return { x: rng.range(-shake, shake), y: rng.range(-shake, shake) };
  }

  function drawUnder(ctx) {
    for (const s of skids) {
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.angle);
      ctx.fillStyle = `rgba(10,10,14,${clamp(s.life / 5, 0, 0.55)})`;
      ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
    }
  }

  function drawOver(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  return { burst, smoke, addSkid, addShake, update, shakeOffset, drawUnder, drawOver };
}
