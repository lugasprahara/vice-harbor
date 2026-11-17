// The player, on foot and behind the wheel. On foot: walk and run, facing the
// way they move. In a car: acceleration, braking, steering that bites harder
// the faster the car goes, and crashes that stop it dead. E gets in and out;
// stealing a car somebody watches is a crime.

import { CAR, PLAYER, WANTED } from './config.js';
import { distance, resolveCircleVsCity, turnToward } from './geo.js';
import { scatterPeds } from './pedestrians.js';
import { addWanted, witnessNear } from './police.js';
import { setToast } from './world.js';

/** The nearest car the player could get into, or null. */
export function nearestCar(game, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.cars) {
    if (car.police) continue;
    const d = distance(x, y, car.x, car.y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

/** Climb into a car. A witnessed theft puts a star on the player. */
export function enterCar(game, car) {
  if (!car || car.police) return;
  const stolen = car.traffic || car.parked;
  car.traffic = false;
  car.parked = false;
  car.driver = 'player';
  car.speed = 0;
  game.player.inCar = car;
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
  if (stolen) {
    game.stats.carsStolen += 1;
    if (witnessNear(game, car.x, car.y, WANTED.witnessRange)) {
      addWanted(game, 1);
      setToast(game, 'Car stolen — someone saw you! The police are coming.');
    } else {
      setToast(game, 'Car stolen. Nobody saw a thing.');
    }
  }
}

/** Step out beside the car. */
export function exitCar(game) {
  const car = game.player.inCar;
  if (!car) return;
  const side = car.angle + Math.PI / 2;
  game.player.x = car.x + Math.cos(side) * 34;
  game.player.y = car.y + Math.sin(side) * 34;
  resolveCircleVsCity(game.city, game.player, PLAYER.radius);
  game.player.angle = car.angle;
  car.parked = true;
  car.speed = 0;
  car.driver = null;
  game.player.inCar = null;
}

function driveCar(game, car, input, dt) {
  const axes = input.axes();
  const forward = Math.cos(car.angle);
  const right = Math.sin(car.angle);
  if (axes.y < 0) car.speed += CAR.accel * dt;
  else if (axes.y > 0) {
    car.speed -= (car.speed > 10 ? CAR.brake : CAR.accel * 0.6) * dt;
  } else {
    // Rolling resistance: ease toward a stop.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 220 * dt);
  }
  car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, car.speed));
  const grip = Math.min(1, Math.abs(car.speed) / 220);
  car.angle += axes.x * CAR.turnRate * grip * dt * Math.sign(car.speed || 1);

  const stepX = Math.cos(car.angle) * car.speed * dt;
  const stepY = Math.sin(car.angle) * car.speed * dt;
  car.x += stepX;
  car.y += stepY;
  const crashed = resolveCircleVsCity(game.city, car, CAR.radius);
  if (crashed && Math.abs(car.speed) > 140) {
    game.fx.sparks(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20);
    game.fx.addShake(7);
    car.speed *= -0.25;
  } else if (crashed) {
    car.speed *= 0.4;
  }

  // Bumping other cars: shove them and slow down.
  for (const other of game.cars) {
    if (other === car) continue;
    const d = distance(car.x, car.y, other.x, other.y);
    if (d >= 46 || d <= 0.01) continue;
    const push = (46 - d) / 2;
    const nx = (other.x - car.x) / d;
    const ny = (other.y - car.y) / d;
    other.x += nx * push;
    other.y += ny * push;
    if (Math.abs(car.speed) > 120) {
      game.fx.sparks((car.x + other.x) / 2, (car.y + other.y) / 2);
      game.fx.addShake(4);
    }
    car.speed *= 0.82;
    if (other.traffic) other.speed *= 0.7;
  }

  // Running a pedestrian over is a serious crime when anyone sees it.
  for (const ped of game.peds) {
    if (ped.state === 'dead') continue;
    if (distance(car.x, car.y, ped.x, ped.y) > 30) continue;
    if (Math.abs(car.speed) < 60) continue;
    ped.state = 'dead';
    ped.deadTimer = 6;
    game.fx.burst(ped.x, ped.y, '#e05a5a', 12, 200, 0.6, 3);
    game.fx.addShake(5);
    scatterPeds(game, ped.x, ped.y, 320);
    if (witnessNear(game, ped.x, ped.y, WANTED.witnessRange)) {
      addWanted(game, 2);
      setToast(game, 'You ran someone over — the police are coming!');
    }
  }

  // Hard cornering at speed leaves rubber on the road.
  if (Math.abs(axes.x) > 0.6 && Math.abs(car.speed) > 260 && game.rng() < 0.6) {
    game.fx.addSkid(car.x - forward * 18, car.y - right * 18, car.angle);
  }

  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
  game.player.speed = car.speed;
}

function walkPlayer(game, input, dt) {
  const player = game.player;
  const axes = input.axes();
  const length = Math.hypot(axes.x, axes.y);
  player.moving = length > 0;
  if (!player.moving) return;
  const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const nx = axes.x / length;
  const ny = axes.y / length;
  const targetAngle = Math.atan2(ny, nx);
  player.angle = turnToward(player.angle, targetAngle, dt * 12);
  player.x += nx * speed * dt;
  player.y += ny * speed * dt;
  resolveCircleVsCity(game.city, player, PLAYER.radius);
  player.speed = speed;
}

/** Advance the player one step, on foot or in a car. */
export function stepPlayer(game, input, dt) {
  const player = game.player;
  if (player.inCar) {
    driveCar(game, player.inCar, input, dt);
    if (input.takePressed('enter')) exitCar(game);
    return;
  }
  walkPlayer(game, input, dt);
  if (input.takePressed('enter')) {
    const car = nearestCar(game, player.x, player.y, CAR.enterRange);
    if (car) enterCar(game, car);
    else setToast(game, 'No car close enough — walk up to one and press E.');
  }
}
