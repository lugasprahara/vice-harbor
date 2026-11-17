// Vice Harbor — side activities: repeatable taxi fares (pick up a marked
// passenger, deliver them across the city, fare scales with distance) and the
// fourteen hidden packages, whose progress is tracked in the pause menu and
// pays a bonus for every five found.

import { distance } from './geo.js';

const FARE_SPOTS = [
  { x: 480, y: 330 }, { x: 1640, y: 1010 }, { x: 2330, y: 330 }, { x: 700, y: 2070 },
  { x: 2050, y: 1330 }, { x: 3020, y: 1340 }, { x: 900, y: 560 }, { x: 2500, y: 2070 },
];

export function maybeOfferTaxiFare(G) {
  if (G.taxi || G.activeMission || !G.player.car || G.player.car.kind !== 'taxi') return;
  if (G.rng.chance(0.006)) {
    const from = G.rng.pick(FARE_SPOTS);
    G.taxi = { phase: 'Pick up the passenger', target: from, fare: 0, passengerIn: false };
    G.hudFlash = 'TAXI FARE — pick up the passenger (pink marker)';
    G.hudFlashTimer = 2;
  }
}

export function updateTaxiFare(G, dt) {
  const taxi = G.taxi;
  if (!taxi) return;
  if (!G.player.car) { G.taxi = null; G.hudFlash = 'FARE LOST — stay in the taxi'; G.hudFlashTimer = 1.6; return; }
  const d = distance(G.player.x, G.player.y, taxi.target.x, taxi.target.y);
  if (!taxi.passengerIn && d < 60 && Math.abs(G.player.car.speed) < 30) {
    let dest = G.rng.pick(FARE_SPOTS);
    if (dest === taxi.target) dest = FARE_SPOTS[(FARE_SPOTS.indexOf(dest) + 3) % FARE_SPOTS.length];
    taxi.fare = Math.round(distance(taxi.target.x, taxi.target.y, dest.x, dest.y) / 14);
    taxi.target = dest;
    taxi.passengerIn = true;
    taxi.phase = 'Drop off the passenger';
    G.audio.playPickup();
    G.hudFlash = 'PASSENGER IN — fare $' + taxi.fare;
    G.hudFlashTimer = 1.6;
  } else if (taxi.passengerIn && d < 60 && Math.abs(G.player.car.speed) < 30) {
    G.player.money += taxi.fare;
    G.progress.faresDone += 1;
    G.audio.playCashRegister();
    G.hudFlash = 'FARE COMPLETE + $' + taxi.fare;
    G.hudFlashTimer = 2;
    G.taxi = null;
    G.saveGame();
  }
}

export function updateCollectibleProgress(G) {
  for (const pack of G.packages) {
    if (pack.taken) continue;
    if (distance(G.player.x, G.player.y, pack.x, pack.y) < 30) {
      pack.taken = true;
      G.progress.packagesFound += 1;
      G.player.money += 50;
      G.audio.playPickup();
      G.effects.burst(pack.x, pack.y, 16, '#ffd23e');
      G.hudFlash = 'HIDDEN PACKAGE ' + G.progress.packagesFound + '/14 + $50';
      G.hudFlashTimer = 2;
      if (G.progress.packagesFound % 5 === 0) { G.player.money += 200; G.hudFlash += ' — BONUS $200'; }
      G.saveGame();
    }
  }
}

export function drawPackages(ctx, G, time) {
  for (const pack of G.packages) {
    if (pack.taken) continue;
    const bobY = Math.sin(time * 2.4 + pack.bob) * 4;
    ctx.save();
    ctx.translate(pack.x, pack.y + bobY);
    ctx.shadowBlur = 16; ctx.shadowColor = '#ffd23e';
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(-9, -7, 18, 14);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(-9, -2, 18, 4);
    ctx.restore();
  }
}
