// Vice Harbor — combat: fists, the pistol and the SMG. Mouse aims, bullets are
// fast tracers with spread, hits flash and knock health off pedestrians, drivers
// and police cars; every shot scares the crowd and, when witnessed, feeds the
// wanted system. Melee is a short-range arc in the aim direction.

import { PLAYER, WEAPONS } from './config.js';
import { distance } from './geo.js';
import { reportCrime } from './police.js';
import { scarePeds } from './pedestrians.js';

export function createBullets() { return []; }

export function tryPlayerAttack(G, dt) {
  const p = G.player;
  p.fireCooldown -= dt;
  const weapon = WEAPONS[p.weapon];
  const wantFire = p.weapon === 'fists' ? G.input.mouseDown : (weapon.auto ? G.input.mouseDown : G.input.mousePressed);
  if (!wantFire || p.fireCooldown > 0 || p.car) return;
  if (p.weapon !== 'fists' && p.ammo[p.weapon] <= 0) { p.fireCooldown = 0.3; G.hudFlash = 'NO AMMO — FISTS'; G.hudFlashTimer = 0.9; return; }
  p.fireCooldown = weapon.cooldown;
  p.aimAngle = Math.atan2(G.input.mouseY - 360, G.input.mouseX - 640);
  if (p.weapon === 'fists') {
    G.audio.playPunch();
    G.effects.burst(p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20, 3, '#ffffff', 60);
    meleeHit(G, p.aimAngle);
    return;
  }
  p.ammo[p.weapon] -= 1;
  if (p.weapon === 'smg') G.audio.playSmgShot(); else G.audio.playGunshot();
  G.effects.addShake(p.weapon === 'smg' ? 1.1 : 2);
  const spread = (G.rng.next() - 0.5) * 2 * weapon.spread;
  const angle = p.aimAngle + spread;
  G.bullets.push({
    x: p.x + Math.cos(p.aimAngle) * 16, y: p.y + Math.sin(p.aimAngle) * 16,
    vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed,
    life: weapon.range / weapon.speed, damage: weapon.damage, friendly: true,
  });
  G.muzzle = { x: p.x + Math.cos(p.aimAngle) * 22, y: p.y + Math.sin(p.aimAngle) * 22, life: 0.05 };
  scarePeds(G, p.x, p.y, 300);
  reportCrime(G, p.x, p.y, 1);
}

function meleeHit(G, angle) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.dead || ped.mara) continue;
    const d = distance(p.x, p.y, ped.x, ped.y);
    const a = Math.atan2(ped.y - p.y, ped.x - p.x);
    if (d < PLAYER.punchRange && Math.abs(((a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.1) {
      damagePedestrian(G, ped, PLAYER.punchDamage);
      reportCrime(G, p.x, p.y, 1);
      return;
    }
  }
  for (const car of G.cars) {
    if (distance(p.x, p.y, car.x, car.y) < 44) { car.health -= 6; G.effects.burst(car.x, car.y, 4, '#ffd23e', 90); }
  }
}

export function damagePedestrian(G, ped, damage) {
  ped.health -= damage;
  ped.panic = 3;
  ped.fleeFrom = { x: G.player.x, y: G.player.y };
  G.effects.burst(ped.x, ped.y, 6, '#ff4757', 110);
  if (ped.health <= 0 && !ped.dead) {
    ped.dead = true;
    G.player.money += 12;
    G.hudFlash = '+$12';
    G.hudFlashTimer = 0.8;
    reportCrime(G, ped.x, ped.y, 1);
  }
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let hit = b.life <= 0;
    for (const bld of G.world.buildings) {
      if (b.x > bld.x && b.x < bld.x + bld.w && b.y > bld.y && b.y < bld.y + bld.h) { hit = true; G.effects.burst(b.x, b.y, 3, '#ffeaa7', 70); break; }
    }
    if (!hit && b.friendly) {
      for (const ped of G.peds) {
        if (!ped.dead && !ped.mara && distance(b.x, b.y, ped.x, ped.y) < 11) { damagePedestrian(G, ped, b.damage); hit = true; break; }
      }
      if (!hit) for (const car of G.cars) {
        if (!car.dead && distance(b.x, b.y, car.x, car.y) < car.spec.width) {
          car.health -= b.damage;
          G.effects.burst(b.x, b.y, 5, '#ffd23e', 120);
          if (car.police) reportCrime(G, car.x, car.y, 1);
          if (car.health <= 0) { car.dead = true; G.effects.burst(car.x, car.y, 24, '#ff7847'); G.effects.smoke(car.x, car.y, 6); G.audio.playCrash(); }
          hit = true; break;
        }
      }
    }
    if (hit) G.bullets.splice(i, 1);
  }
  if (G.muzzle) { G.muzzle.life -= dt; if (G.muzzle.life <= 0) G.muzzle = null; }
}

export function drawBullets(ctx, G) {
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const b of G.bullets) { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018); }
  ctx.stroke();
  if (G.muzzle) {
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = '#ffd23e';
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(G.muzzle.x, G.muzzle.y, 7, 0, 6.29); ctx.fill();
    ctx.restore();
  }
}
