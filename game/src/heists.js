// Vice Harbor — the heist chain. Two big jobs (the marina warehouse and Banco
// del Mar) share one stage machine: approach quietly, grab the loot against a
// countdown, then a getaway under an instant 4–5 star wanted spike to a hideout.
// Loot piles are drawn in the world while a heist is live.

import { reportCrime } from './police.js';

export const HEIST_DEFS = {
  marina: { lootX: 3020, lootY: 840, lootTimer: 45, spike: 4, label: 'WAREHOUSE LOOT' },
  bank: { lootX: 1240, lootY: 1180, lootTimer: 40, spike: 5, label: 'VAULT CASH' },
};

export function startHeist(G, mission) {
  const def = HEIST_DEFS[mission.heist];
  G.heist = { kind: mission.heist, def, lootGrabbed: false, getaway: false, startedAt: G.time };
}

export function advanceHeistStage(G, action) {
  if (!G.heist) return;
  if (action === 'heist-loot') {
    G.activeMission.timer = G.heist.def.lootTimer;
    G.hudFlash = G.heist.def.label + ' — GRAB IT';
    G.hudFlashTimer = 1.6;
  } else if (action === 'grab') {
    G.heist.lootGrabbed = true;
    G.player.money += 250;
    G.audio.playCashRegister();
    G.effects.burst(G.heist.def.lootX, G.heist.def.lootY, 26, '#5df08a');
    G.wanted = Math.max(G.wanted, G.heist.def.spike);
    G.heatTimer = 30;
    G.audio.playWantedBlip();
    G.hudFlash = 'LOOT GRABBED — ' + G.heist.def.spike + ' STARS. RUN!';
    G.hudFlashTimer = 2.2;
  } else if (action === 'heist-getaway') {
    G.heist.getaway = true;
    G.wanted = Math.max(G.wanted, G.heist.def.spike - 1);
    G.heatTimer = Math.max(G.heatTimer, 20);
  } else if (action === 'escaped') {
    G.heist = null;
    G.wanted = Math.max(0, G.wanted - 2);
  }
}

export function drawHeistLoot(ctx, G, time) {
  if (!G.heist || G.heist.lootGrabbed) return;
  const { lootX, lootY, label } = G.heist.def;
  const pulse = 1 + Math.sin(time * 5) * 0.12;
  ctx.save();
  ctx.translate(lootX, lootY);
  ctx.scale(pulse, pulse);
  ctx.shadowBlur = 22; ctx.shadowColor = '#5df08a';
  ctx.fillStyle = '#14532d';
  ctx.fillRect(-18, -12, 36, 24);
  ctx.fillStyle = '#5df08a';
  ctx.fillRect(-18, -4, 36, 8);
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('$', 0, 4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5df08a';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(label, 0, -22);
  ctx.restore();
}

export function heistCrimePulse(G) {
  if (G.heist && !G.heist.lootGrabbed) reportCrime(G, G.heist.def.lootX, G.heist.def.lootY, 0);
}
