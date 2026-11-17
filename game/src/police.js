// The wanted system and the police. Crimes witnessed by a pedestrian or a
// police car put stars on the player; the stars call police cars, which chase
// and ram. Stay out of sight and the heat cools off, one star at a time.
// Caught on foot, the player is busted; out of health, wasted.

import { CAR, POLICE, WANTED } from './config.js';
import { angleTo, distance, nearestRoadPoint, resolveCircleVsCity, turnToward } from './geo.js';
import { makeCar } from './traffic.js';
import { setToast } from './world.js';

/** True when a living pedestrian or a police car is close enough to see a crime. */
export function witnessNear(game, x, y, range) {
  for (const ped of game.peds) {
    if (ped.state !== 'dead' && distance(ped.x, ped.y, x, y) < range) return true;
  }
  for (const car of game.cars) {
    if (car.police && distance(car.x, car.y, x, y) < range * 1.6) return true;
  }
  return false;
}

/** Add stars (capped at five) and restart the cooling-off clock. */
export function addWanted(game, stars) {
  const player = game.player;
  player.wanted = Math.min(5, player.wanted + stars);
  game.wantedHeat = 0;
  game.audio.siren(true, game.time);
}

function policeCars(game) {
  return game.cars.filter((car) => car.police);
}

function spawnPoliceCar(game) {
  const player = game.player;
  const angle = game.rng() * Math.PI * 2;
  const dist = 550 + game.rng() * 300;
  const point = nearestRoadPoint(game.city, player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist);
  const car = makeCar(game, point.x, point.y, angleTo(point.x, point.y, player.x, player.y), {
    police: true, speed: 200, color: '#e8ecf4',
  });
  game.cars.push(car);
  return car;
}

/** Advance the wanted level and every police car one step. */
export function stepPolice(game, dt) {
  const player = game.player;
  const wanted = player.wanted;

  // How many police cars the stars call for.
  const desired = wanted === 0 ? 0 : wanted >= 4 ? 3 : wanted >= 2 ? 2 : 1;
  const cars = policeCars(game);
  game.policeSpawnTimer = (game.policeSpawnTimer ?? 0) - dt;
  if (cars.length < desired && game.policeSpawnTimer <= 0) {
    spawnPoliceCar(game);
    game.policeSpawnTimer = 1.5;
  }

  for (const car of policeCars(game)) {
    car.ramCooldown = Math.max(0, car.ramCooldown - dt);
    const target = player.inCar ?? player;
    if (wanted === 0) {
      // The heat is off: drive away, then leave the city.
      car.leaveTimer += dt;
      car.speed = Math.min(car.speed + 300 * dt, 420);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.leaveTimer > 4) game.cars.splice(game.cars.indexOf(car), 1);
      continue;
    }
    const chaseAngle = angleTo(car.x, car.y, target.x, target.y);
    car.angle = turnToward(car.angle, chaseAngle, dt * 2.4);
    car.speed = Math.min(car.speed + 420 * dt, POLICE.chaseSpeed);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const crashed = resolveCircleVsCity(game.city, car, CAR.radius);
    if (crashed) car.speed *= 0.5;

    // Ramming the player's car hurts the player; touching the player on foot busts them.
    const dist = distance(car.x, car.y, target.x, target.y);
    if (player.inCar) {
      if (dist < 48 && car.ramCooldown <= 0) {
        car.ramCooldown = 1.2;
        player.inCar.speed *= 0.55;
        player.health -= POLICE.ramDamage;
        player.lastHurt = game.time;
        game.fx.sparks((car.x + target.x) / 2, (car.y + target.y) / 2);
        game.fx.addShake(8);
      }
    } else if (dist < POLICE.bustRange) {
      game.over = { kind: 'busted' };
      game.audio.busted();
      return;
    }
  }

  // Cooling off: unseen for long enough, one star fades.
  if (wanted > 0) {
    const seen = policeCars(game).some((car) => distance(car.x, car.y, player.x, player.y) < 500)
      || game.peds.some((ped) => ped.state !== 'dead' && distance(ped.x, ped.y, player.x, player.y) < 260);
    if (seen) game.wantedHeat = 0;
    else {
      game.wantedHeat += dt;
      if (game.wantedHeat > WANTED.decaySeconds) {
        player.wanted -= 1;
        game.wantedHeat = 0;
        setToast(game, player.wanted === 0 ? 'You lost the heat.' : 'Heat cooling off…');
      }
    }
  }

  if (player.health <= 0 && !game.over) {
    game.over = { kind: 'wasted' };
    game.audio.busted();
  }
}
