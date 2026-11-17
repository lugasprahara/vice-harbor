// Side work: the repeatable taxi fares and the glowing packages scattered
// around the city, plus the green ammo crates. Fares pay when the passenger
// reaches their destination; packages pay when walked or driven over.

import { PACKAGE_BONUS, PACKAGE_CASH, PACKAGE_COUNT, PISTOL, TAXI } from './config.js';
import { randomInt, randomRange } from './random.js';
import { distance } from './geo.js';
import { setToast } from './world.js';

/** A random point on a road, for fares, packages and crates. */
function roadPoint(game, minDistFromPlayer) {
  const { city, rng } = game;
  for (let tries = 0; tries < 20; tries += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? city.roadsV[Math.floor(rng() * city.roadsV.length)] : city.roadsH[Math.floor(rng() * city.roadsH.length)];
    const along = randomRange(rng, 220, 2180);
    const x = vertical ? road + randomRange(rng, -30, 30) : along;
    const y = vertical ? along : road + randomRange(rng, -30, 30);
    if (minDistFromPlayer && distance(x, y, game.player.x, game.player.y) < minDistFromPlayer) continue;
    return { x, y };
  }
  return { x: 700, y: 700 };
}

/** Scatter the collectible packages around the city. */
export function spawnPackages(game) {
  for (let i = 0; i < PACKAGE_COUNT; i += 1) {
    const point = roadPoint(game, 300);
    game.packages.push({ id: i, x: point.x, y: point.y, taken: false });
  }
}

/** Three ammo crates, each refilling the pistol. */
export function spawnAmmoCrates(game) {
  for (let i = 0; i < 3; i += 1) {
    const point = roadPoint(game, 400);
    game.ammoCrates.push({ x: point.x, y: point.y, taken: false });
  }
}

function offerFare(game) {
  const pickup = roadPoint(game, 320);
  const taxi = game.taxi;
  taxi.state = 'pickup';
  taxi.pickup = pickup;
  taxi.fare = randomInt(game.rng, TAXI.fareMin, TAXI.fareMax);
  // A waiting passenger stands at the kerb.
  const ped = {
    x: pickup.x + 30, y: pickup.y + 30, angle: 0, speed: 0,
    state: 'wait', targetX: pickup.x, targetY: pickup.y,
    fleeX: 0, fleeY: 0, fleeTimer: 0, deadTimer: 0,
    shirt: '#ffd23f', radius: 11, isPassenger: true,
  };
  game.peds.push(ped);
  taxi.passenger = ped;
  setToast(game, `Taxi fare $${taxi.fare} — drive to the blue marker.`);
}

function stepTaxi(game, dt) {
  const taxi = game.taxi;
  const player = game.player;
  if (taxi.state === 'idle') {
    taxi.cooldown -= dt;
    if (taxi.cooldown <= 0 && player.inCar) offerFare(game);
    return;
  }
  if (taxi.state === 'pickup') {
    if (taxi.pickup && distance(player.x, player.y, taxi.pickup.x, taxi.pickup.y) < TAXI.pickupRange) {
      if (taxi.passenger) {
        const index = game.peds.indexOf(taxi.passenger);
        if (index !== -1) game.peds.splice(index, 1);
        taxi.passenger = null;
      }
      taxi.state = 'dropoff';
      taxi.dest = roadPoint(game, 420);
      setToast(game, 'Passenger aboard — take them to the blue marker.');
    }
    return;
  }
  if (taxi.state === 'dropoff') {
    if (taxi.dest && distance(player.x, player.y, taxi.dest.x, taxi.dest.y) < TAXI.pickupRange) {
      player.money += taxi.fare;
      game.stats.earned += taxi.fare;
      game.stats.fares += 1;
      game.audio.cash();
      setToast(game, `Fare complete! +$${taxi.fare}`);
      taxi.state = 'idle';
      taxi.cooldown = TAXI.cooldown;
      taxi.dest = null;
      taxi.pickup = null;
    }
  }
}

/** Advance the side activities one step: fares, packages, ammo crates. */
export function stepSide(game, dt) {
  const player = game.player;
  stepTaxi(game, dt);

  for (const pack of game.packages) {
    if (pack.taken) continue;
    if (distance(player.x, player.y, pack.x, pack.y) > 30) continue;
    pack.taken = true;
    game.stats.packages += 1;
    player.money += PACKAGE_CASH;
    game.stats.earned += PACKAGE_CASH;
    game.audio.pickup();
    game.fx.sparkle(pack.x, pack.y, '#39ff88');
    const found = game.stats.packages;
    if (found >= PACKAGE_COUNT && !game.packageBonusPaid) {
      game.packageBonusPaid = true;
      player.money += PACKAGE_BONUS;
      game.stats.earned += PACKAGE_BONUS;
      setToast(game, `All ${PACKAGE_COUNT} packages found! Bonus +$${PACKAGE_BONUS}`);
    } else {
      setToast(game, `Package found! +$${PACKAGE_CASH} (${found}/${PACKAGE_COUNT})`);
    }
  }

  for (const crate of game.ammoCrates) {
    if (crate.taken) continue;
    if (distance(player.x, player.y, crate.x, crate.y) > 34) continue;
    crate.taken = true;
    player.ammo += PISTOL.pickupAmmo;
    game.audio.pickup();
    setToast(game, `Ammo +${PISTOL.pickupAmmo}`);
  }
}
