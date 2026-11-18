// Vice Harbor — ambient traffic: cars cruise the road grid, brake for trouble and flee gunfire.
function seedTraffic(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const horiz = rng() > 0.5;
    const lane = Math.floor(rng() * 7);
    let x, y, a;
    if (horiz) { y = lane * VH.world.BLOCK + 46 + (rng() > 0.5 ? 0 : 46); x = 60 + rng() * 2400; a = y % (VH.world.BLOCK * 2) < VH.world.BLOCK ? 0 : Math.PI; if ((Math.floor(y / VH.world.BLOCK) % 2) === 1) a = Math.PI; else a = 0; }
    else { x = lane * VH.world.BLOCK + 46 + (rng() > 0.5 ? 0 : 46); y = 60 + rng() * 2100; a = (Math.floor(x / VH.world.BLOCK) % 2) === 1 ? Math.PI / 2 : -Math.PI / 2; }
    const car = VH.cars.spawn(rng, x, y, a);
    car.speed = 60 + rng() * 60;
    cars.push(car);
  }
  return cars;
}
function roadDirectionAt(x, y) {
  const onH = (y % VH.world.BLOCK) < VH.world.ROAD;
  const onV = (x % VH.world.BLOCK) < VH.world.ROAD;
  return { h: onH, v: onV };
}
function updateTrafficCar(car, dt, world) {
  if (car.driver !== 'traffic') return;
  const threat = world.threatAt(car.x, car.y);
  let target = threat ? 0 : 95;
  const aheadX = car.x + Math.cos(car.angle) * 56, aheadY = car.y + Math.sin(car.angle) * 56;
  let blocked = !!VH.city.buildingAt(world.layout, aheadX, aheadY, 2);
  for (const o of world.cars) {
    if (o === car) continue;
    const d = Math.hypot(o.x - aheadX, o.y - aheadY);
    if (d < 30) blocked = true;
  }
  if (world.player && world.player.mode === 'foot') {
    if (Math.hypot(world.player.x - aheadX, world.player.y - aheadY) < 26) blocked = true;
  }
  if (blocked) target = 0;
  car.brakeLight = (target < car.speed - 4) ? 1 : 0;
  car.speed += Math.max(-260 * dt, Math.min(150 * dt, target - car.speed));
  let nx = car.x + Math.cos(car.angle) * car.speed * dt;
  let ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (blocked && car.speed < 8 && Math.random() < dt * 0.7) {
    car.angle += Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
    car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
  if (nx < 30 || nx > VH.world.WATER_X - 30 || ny < 30 || ny > VH.world.H - 300) { car.angle += Math.PI; nx = car.x; ny = car.y; }
  car.x = nx; car.y = ny;
}
function updateTraffic(cars, dt, world) {
  for (const c of cars) updateTrafficCar(c, dt, world);
}
window.VH = window.VH || {};
VH.traffic = { seed: seedTraffic, update: updateTraffic, roadAt: roadDirectionAt };
