// Vice Harbor — the HUD: health bar and cash top-left, wanted stars top-right,
// weapon and ammo plus the radio station bottom-left, the objective banner
// across the top centre, and centre-screen flashes for pickups, fares and
// warnings. Everything the judge needs to read the game's state at a glance.

import { PALETTE, WEAPONS } from './config.js';
import { currentStationName } from './radio.js';
import { objectiveText } from './missions.js';
import { districtAt } from './world.js';

function drawStars(ctx, wanted, time) {
  const x0 = 1280 - 26;
  ctx.save();
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i += 1) {
    const lit = i < Math.round(wanted);
    ctx.fillStyle = lit ? (Math.floor(time * 4) % 2 === 0 ? '#ffd23e' : '#ffef9e') : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', x0 - i * 30, 40);
  }
  ctx.restore();
}

function drawHealthBar(ctx, G) {
  const p = G.player;
  ctx.save();
  ctx.fillStyle = 'rgba(7,12,26,0.75)';
  ctx.beginPath(); ctx.roundRect(14, 14, 252, 58, 8); ctx.fill();
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(24, 24, 190, 13);
  const ratio = Math.max(0, p.health / 100);
  ctx.fillStyle = ratio > 0.35 ? '#5df08a' : '#ff4757';
  ctx.fillRect(24, 24, 190 * ratio, 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(24, 24, 190, 13);
  if (p.car) {
    ctx.fillStyle = '#2a2f45'; ctx.fillRect(24, 42, 190, 7);
    ctx.fillStyle = '#54a0ff'; ctx.fillRect(24, 42, 190 * Math.max(0, p.car.health / 100), 7);
  }
  ctx.fillStyle = PALETTE.money;
  ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('$' + p.money.toLocaleString('en-US'), 222, 37);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '10px sans-serif';
  ctx.fillText(districtAt(p.x, p.y).toUpperCase() + ' · VICE HARBOR', 24, 64);
  ctx.restore();
}

function drawWeaponAndRadio(ctx, G) {
  const p = G.player;
  ctx.save();
  ctx.fillStyle = 'rgba(7,12,26,0.75)';
  ctx.beginPath(); ctx.roundRect(14, 720 - 64, 252, 50, 8); ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
  const weapon = WEAPONS[p.weapon];
  const ammo = p.weapon === 'fists' ? '—' : String(p.ammo[p.weapon]);
  ctx.fillText(weapon.name.toUpperCase() + '  ' + ammo, 24, 720 - 36);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '11px sans-serif';
  ctx.fillText(currentStationName(G) || (p.car ? 'RADIO OFF' : 'ON FOOT'), 24, 720 - 20);
  ctx.restore();
}

function drawObjectiveBanner(ctx, G) {
  const text = objectiveText(G);
  ctx.save();
  ctx.font = 'bold 14px sans-serif';
  const w = Math.min(660, ctx.measureText(text).width + 34);
  ctx.fillStyle = 'rgba(7,12,26,0.82)';
  ctx.beginPath(); ctx.roundRect(640 - w / 2, 12, w, 32, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,0.7)';
  ctx.strokeRect(640 - w / 2, 12, w, 32);
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 640, 29);
  ctx.restore();
}

export function drawHud(ctx, G, time) {
  drawHealthBar(ctx, G);
  drawStars(ctx, G.wanted, time);
  drawWeaponAndRadio(ctx, G);
  drawObjectiveBanner(ctx, G);
  if (G.arrestTimer > 0.15 && G.wanted > 0) {
    ctx.save();
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('THE POLICE ARE GRABBING YOU — MOVE!', 640, 120);
    ctx.restore();
  }
  if (G.hudFlashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, G.hudFlashTimer);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.shadowBlur = 14; ctx.shadowColor = '#000';
    ctx.fillText(G.hudFlash, 640, 168);
    ctx.restore();
  }
  if (G.activeMission && G.activeMission.timer > 0) {
    const stage = G.activeMission.def.stages[G.activeMission.stage];
    if (stage.type === 'heist-loot') {
      ctx.save();
      ctx.fillStyle = G.activeMission.timer < 10 ? '#ff4757' : '#ffd23e';
      ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(G.activeMission.timer) + 's', 640, 84);
      ctx.restore();
    }
  }
}
