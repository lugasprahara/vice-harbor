// Combat: fists and the pistol. F is a punch at close range; a mouse click
// fires the pistol toward the cursor, with a ray that stops at the first
// building. Hurting people in front of witnesses raises the wanted level,
// and every shot rings out across the street.

import { PISTOL, PLAYER, WANTED } from './config.js';
import { angleDifference, distance, pointInBuilding } from './geo.js';
import { scatterPeds } from './pedestrians.js';
import { addWanted, witnessNear } from './police.js';
import { setToast } from './world.js';

/** How far a ray from (x, y) along `angle` travels before a building stops it. */
function rayToBuilding(game, x, y, angle, maxRange) {
  for (let d = 12; d <= maxRange; d += 12) {
    if (pointInBuilding(game.city, x + Math.cos(angle) * d, y + Math.sin(angle) * d)) return d;
  }
  return maxRange;
}

function hurtPed(game, ped, damage, causeX, causeY) {
  ped.health = (ped.health ?? 100) - damage;
  ped.state = 'flee';
  ped.fleeX = causeX;
  ped.fleeY = causeY;
  ped.fleeTimer = 2.5;
  // Knock them away from the blow.
  const away = Math.atan2(ped.y - causeY, ped.x - causeX);
  ped.x += Math.cos(away) * 14;
  ped.y += Math.sin(away) * 14;
  game.fx.burst(ped.x, ped.y, '#e05a5a', 8, 160, 0.5, 3);
  if (ped.health <= 0) {
    ped.state = 'dead';
    ped.deadTimer = 6;
    scatterPeds(game, ped.x, ped.y, 320);
  }
  return ped.state === 'dead';
}

/** Advance combat one step: weapon switching, punches and pistol shots. */
export function stepCombat(game, input, dt) {
  const player = game.player;
  if (input.takePressed('weapon1')) player.weapon = 0;
  if (input.takePressed('weapon2')) player.weapon = 1;
  if (player.inCar) return;

  if (input.takePressed('punch')) {
    const reach = PLAYER.punchRange;
    let best = null;
    let bestDist = reach;
    for (const ped of game.peds) {
      if (ped.state === 'dead') continue;
      const d = distance(player.x, player.y, ped.x, ped.y);
      if (d >= bestDist) continue;
      const facing = Math.abs(angleDifference(player.angle, Math.atan2(ped.y - player.y, ped.x - player.x)));
      if (facing > 1.1) continue;
      best = ped;
      bestDist = d;
    }
    game.audio.punch();
    if (best) {
      const killed = hurtPed(game, best, PLAYER.punchDamage, player.x, player.y);
      game.fx.addShake(3);
      if (witnessNear(game, player.x, player.y, WANTED.witnessRange)) {
        addWanted(game, killed ? 2 : 1);
        setToast(game, killed ? 'You beat someone down — the police are coming!' : 'Assault! Someone called the police.');
      }
    }
    return;
  }

  if (!input.takeClick()) return;
  if (player.weapon !== 1) {
    // Fists only: a click without the pistol is a swing at the air.
    game.audio.punch();
    return;
  }
  if (player.ammo <= 0) {
    setToast(game, 'Out of ammo — find a green ammo crate.');
    game.audio.click();
    return;
  }
  player.ammo -= 1;
  const angle = Math.atan2(game.mouseWorld.y - player.y, game.mouseWorld.x - player.x);
  player.angle = angle;
  game.audio.gunshot();
  game.fx.muzzle(player.x, player.y, angle);
  game.fx.addShake(2);
  const range = rayToBuilding(game, player.x, player.y, angle, PISTOL.range);
  // A tracer of sparks along the bullet's path.
  for (let d = 30; d < range; d += 60) {
    game.fx.burst(player.x + Math.cos(angle) * d, player.y + Math.sin(angle) * d, '#ffe9a8', 1, 20, 0.12, 2);
  }
  let hit = null;
  let hitDist = range;
  for (const ped of game.peds) {
    if (ped.state === 'dead') continue;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 10 || along > hitDist) continue;
    const side = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (side > 26) continue;
    hit = ped;
    hitDist = along;
  }
  scatterPeds(game, player.x, player.y, 380);
  if (hit) {
    const killed = hurtPed(game, hit, PISTOL.damage, player.x, player.y);
    if (witnessNear(game, player.x, player.y, WANTED.witnessRange)) {
      addWanted(game, killed ? 2 : 1);
    }
  } else if (witnessNear(game, player.x, player.y, WANTED.witnessRange)) {
    addWanted(game, 1);
    setToast(game, 'Shots fired — someone called the police!');
  }
}
