// Vice Harbor — vehicles: the car factory, shared driving physics (acceleration,
// steering, drift and building collision) and the canvas drawing for every class —
// compact, sedan, taxi, truck, patrol car and interceptor, each with its own
// silhouette, plus flashing light bars and headlight glow for police units.

import { CAR_CLASSES } from './config.js';
import { clamp, rectsOverlap } from './geo.js';

let nextCarId = 1;

export function createCar(kind, x, y, angle, rng) {
  const spec = CAR_CLASSES[kind] || CAR_CLASSES.sedan;
  return {
    id: nextCarId++, kind, spec,
    x, y, angle: angle || 0, speed: 0,
    color: rng ? rng.pick(spec.colors) : spec.colors[0],
    health: 100, driver: null, parked: false, police: kind === 'police' || kind === 'interceptor',
    lightPhase: Math.random() * 6.28, skid: 0, doorOpen: 0, dead: false,
  };
}

export function carRect(car) {
  const hw = car.spec.length / 2; const hh = car.spec.width / 2;
  return { x: car.x - hw, y: car.y - hh, w: car.spec.length, h: car.spec.width };
}

/** Advance one car under throttle/steer input; returns true if it struck a building. */
export function driveCar(car, dt, throttle, steer, buildings) {
  const spec = car.spec;
  if (throttle > 0) car.speed += spec.accel * throttle * dt;
  else if (throttle < 0) car.speed += (car.speed > 4 ? -340 : spec.accel * 0.55 * throttle) * dt;
  car.speed -= car.speed * 0.55 * dt;
  if (throttle === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = clamp(car.speed, -spec.topSpeed * 0.38, spec.topSpeed);
  const steerAuthority = clamp(Math.abs(car.speed) / 60, 0, 1) * Math.sign(car.speed);
  car.angle += steer * spec.grip * 0.62 * steerAuthority * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.skid = Math.abs(steer) > 0.6 && Math.abs(car.speed) > 190 ? 1 : Math.max(0, car.skid - dt * 3);
  const probe = { x: nx - spec.length / 2, y: ny - spec.width / 2, w: spec.length, h: spec.width };
  for (const b of buildings) {
    if (rectsOverlap(probe, b)) {
      car.speed *= -0.25;
      return true;
    }
  }
  car.x = nx; car.y = ny;
  return false;
}

export function drawCar(ctx, car, time) {
  const spec = car.spec;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = spec.length; const W = spec.width;
  // Shadow, then headlight glow spilling ahead at night.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  const glow = ctx.createRadialGradient(L / 2, 0, 4, L / 2 + 46, 0, 74);
  glow.addColorStop(0, 'rgba(255,244,180,0.30)');
  glow.addColorStop(1, 'rgba(255,244,180,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(L / 2 - 6, -34, 96, 68);
  // Body and class silhouette.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 6);
  ctx.fill();
  if (car.kind === 'truck') {
    ctx.fillStyle = 'rgba(20,24,38,0.85)';
    ctx.fillRect(-L / 2 + 4, -W / 2 + 3, 16, W - 6);
    ctx.fillStyle = car.color === '#7f8c8d' ? '#aeb6bf' : car.color;
    ctx.fillRect(-L / 2 + 24, -W / 2 + 2, L - 28, W - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(-L / 2 + 24, -W / 2 + 2, L - 28, W - 4);
  } else {
    ctx.fillStyle = 'rgba(16,22,40,0.92)';
    ctx.beginPath();
    ctx.roundRect(-L * 0.16, -W / 2 + 3, L * 0.36, W - 6, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,200,255,0.5)';
    ctx.fillRect(L * 0.13, -W / 2 + 4, 4, W - 8);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#11131c';
    ctx.fillRect(-8, -7, 16, 14);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TAXI', 0, 0);
  }
  if (car.police) {
    ctx.fillStyle = car.kind === 'interceptor' ? '#f4f6f7' : '#1b2735';
    ctx.fillRect(-L * 0.2, -W / 2 + 2, L * 0.42, W - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('POLICE', 0, 0);
    drawLightBar(ctx, car, time, W);
  }
  // Wheels.
  ctx.fillStyle = '#0b0d14';
  for (const [wx, wy] of [[-L / 2 + 8, -W / 2 - 2], [L / 2 - 10, -W / 2 - 2], [-L / 2 + 8, W / 2 - 3], [L / 2 - 10, W / 2 - 3]]) ctx.fillRect(wx, wy, 9, 5);
  // Damage smoke tint.
  if (car.health < 45) { ctx.fillStyle = 'rgba(30,30,36,0.35)'; ctx.fillRect(L / 2 - 14, -W / 2 + 3, 12, W - 6); }
  ctx.restore();
}

function drawLightBar(ctx, car, time, W) {
  const phase = Math.floor((time * 6 + car.lightPhase)) % 2;
  const redOn = phase === 0;
  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = redOn ? '#ff2e4d' : '#2e7bff';
  ctx.fillStyle = redOn ? '#ff2e4d' : '#571b26';
  ctx.fillRect(-9, -W / 2 - 1, 8, 6);
  ctx.fillStyle = !redOn ? '#2e7bff' : '#1b2a57';
  ctx.fillRect(1, -W / 2 - 1, 8, 6);
  ctx.restore();
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
  halo.addColorStop(0, redOn ? 'rgba(255,46,77,0.35)' : 'rgba(46,123,255,0.35)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-44, -44, 88, 88);
}
