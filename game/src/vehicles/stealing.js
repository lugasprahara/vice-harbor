// Vice Harbor — entering, stealing and driving cars: E key, door animation, wanted heat for theft.
function nearestStealableCar(player, cars, maxDist) {
  let best = null, bd = maxDist || 52;
  for (const c of cars) {
    if (c.driver === 'police' || c.driver === 'player') continue;
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function stealCar(state, car) {
  car.driver = 'player'; car.doorOpen = 1;
  state.player.mode = 'car'; state.player.car = car;
  state.stats.carsStolen++;
  VH.audio.ensure(); VH.audio.blip();
  if (Math.random() < 0.55) VH.wanted.addHeat(state, 1, 'grand theft auto');
  return car;
}
function exitCar(state) {
  const car = state.player.car;
  if (!car) return;
  car.driver = 'parked'; car.speed = 0;
  state.player.x = car.x - Math.sin(car.angle) * 26;
  state.player.y = car.y + Math.cos(car.angle) * 26;
  state.player.mode = 'foot'; state.player.car = null;
  VH.audio.engineSet(0, false);
}
function driveCar(state, car, dt) {
  const input = state.input, c = car.cls;
  const fwd = (input.keys.KeyW || input.keys.ArrowUp) ? 1 : 0;
  const back = (input.keys.KeyS || input.keys.ArrowDown) ? 1 : 0;
  const left = (input.keys.KeyA || input.keys.ArrowLeft) ? 1 : 0;
  const right = (input.keys.KeyD || input.keys.ArrowRight) ? 1 : 0;
  if (fwd) car.speed += c.accel * dt;
  if (back) car.speed -= (car.speed > 4 ? 320 : 130) * dt;
  if (!fwd && !back) car.speed -= car.speed * 0.55 * dt;
  car.speed = Math.max(-95, Math.min(c.top, car.speed));
  car.brakeLight = back || Math.abs(car.speed) < 4 ? 1 : 0;
  const steer = (right - left) * Math.min(1, Math.abs(car.speed) / 60) * (car.speed < 0 ? -1 : 1);
  car.angle += steer * c.grip * 0.42 * dt * (Math.abs(car.speed) > 4 ? 1 : 0);
  car.steerVis = steer;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = VH.city.buildingAt(state.layout, nx, ny, 6) || nx < 24 || ny < 24 || nx > VH.world.W || ny > VH.world.H || VH.districts.isWater(nx, ny);
  if (hit) {
    if (Math.abs(car.speed) > 90) {
      VH.fx.burst(state.fx, car.x, car.y, '#ffb347', 12, 150, 0.5, 4);
      VH.fx.shake = 7; VH.audio.crash();
      car.hp -= 14; VH.wanted.addHeat(state, 1, 'reckless driving');
    }
    car.speed *= -0.25;
  } else { car.x = nx; car.y = ny; }
  const drifting = (left || right) && Math.abs(car.speed) > 150;
  if (drifting) {
    VH.fx.skid(state.fx, car.x - Math.cos(car.angle) * 20 - Math.sin(car.angle) * 12, car.y - Math.sin(car.angle) * 20 + Math.cos(car.angle) * 12, car.angle);
    VH.fx.skid(state.fx, car.x - Math.cos(car.angle) * 20 + Math.sin(car.angle) * 12, car.y - Math.sin(car.angle) * 20 - Math.cos(car.angle) * 12, car.angle);
  }
  state.player.x = car.x; state.player.y = car.y; state.player.angle = car.angle;
  VH.audio.engineSet(car.speed / c.top, true);
  if (car.hp <= 0) { car.hp = 0; VH.fx.burst(state.fx, car.x, car.y, '#666', 20, 120, 0.9, 5); exitCar(state); }
}
window.VH = window.VH || {};
VH.stealing = { nearest: nearestStealableCar, steal: stealCar, exit: exitCar, drive: driveCar };
