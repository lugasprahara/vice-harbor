// Vice Harbor — police pursuit: cruisers chase, interceptors cut you off, officers shoot at 3+ stars.
function dispatchInterceptor(state, x, y) {
  const cls = VH.cars.byId('sport');
  const car = VH.cars.spawn(Math.random, x, y, 0, cls);
  car.driver = 'police'; car.kind = 'interceptor'; car.hp = 130; car.color = '#f4f6f8';
  state.policeCars.push(car);
  return car;
}
function dispatchCruiser(state, x, y) {
  const cls = VH.cars.byId('sedan');
  const car = VH.cars.spawn(Math.random, x, y, 0, cls);
  car.driver = 'police'; car.kind = 'cruiser'; car.hp = 110; car.color = '#f4f6f8';
  state.policeCars.push(car);
  return car;
}
function spawnPointNearPlayer(state, minD, maxD) {
  const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
  let x = state.player.x + Math.cos(a) * d, y = state.player.y + Math.sin(a) * d;
  x = Math.max(50, Math.min(VH.world.WATER_X - 60, x));
  y = Math.max(50, Math.min(VH.world.H - 320, y));
  if (VH.city.buildingAt(state.layout, x, y, 20)) { x += 90; y += 40; }
  return { x: x, y: y };
}
function updatePursuit(state, dt) {
  const resp = VH.wanted.response(state.wanted.stars);
  const wantTotal = resp.cruisers + resp.interceptors;
  state.spawnT = (state.spawnT || 0) - dt;
  if (state.wanted.stars > 0 && state.policeCars.length < wantTotal && state.spawnT <= 0) {
    const p = spawnPointNearPlayer(state, 430, 560);
    if (state.policeCars.filter(function (c) { return c.kind === 'interceptor'; }).length < resp.interceptors) dispatchInterceptor(state, p.x, p.y);
    else dispatchCruiser(state, p.x, p.y);
    state.spawnT = 2.6;
  }
  const px = state.player.x, py = state.player.y;
  for (let i = state.policeCars.length - 1; i >= 0; i--) {
    const c = state.policeCars[i];
    if (c.hp <= 0) {
      VH.fx.burst(state.fx, c.x, c.y, '#ff9f43', 16, 140, 0.7, 4);
      state.policeCars.splice(i, 1); state.stats.copsWrecked++;
      VH.wanted.addHeat(state, 1, 'cop car wrecked');
      continue;
    }
    if (c.kind === 'roadblock') continue; // roadblock cars hold their angled position across the road
    const dist = Math.hypot(px - c.x, py - c.y);
    if (state.wanted.stars === 0 && dist > 700) { state.policeCars.splice(i, 1); continue; }
    let tx = px, ty = py;
    if (c.kind === 'interceptor' && state.player.car) {
      tx = px + Math.cos(state.player.car.angle) * 120;
      ty = py + Math.sin(state.player.car.angle) * 120;
    }
    const want = Math.atan2(ty - c.y, tx - c.x);
    let da = want - c.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    c.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, da * 3.2 * dt * 3));
    const top = resp.topSpeed * (c.kind === 'interceptor' ? 1.18 : 1) * resp.aggression + 60;
    const target = state.wanted.stars === 0 ? 0 : (dist > 46 ? top : top * 0.25);
    c.speed += Math.max(-300 * dt, Math.min(240 * dt, target - c.speed));
    c.brakeLight = target < c.speed - 4 ? 1 : 0;
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (!VH.city.buildingAt(state.layout, nx, ny, 8) && !VH.districts.isWater(nx, ny)) { c.x = nx; c.y = ny; }
    else c.speed *= 0.3;
    if (state.player.car && Math.hypot(state.player.car.x - c.x, state.player.car.y - c.y) < 34 && Math.abs(c.speed) > 60) {
      state.player.car.hp -= 9 * dt * 4;
      c.speed *= 0.82;
      if (Math.random() < dt * 3) { VH.fx.burst(state.fx, c.x, c.y, '#ffd76a', 4, 110, 0.3, 3); VH.fx.shake = 3; }
    }
    c.shootT = (c.shootT || 0) - dt;
    if (state.wanted.stars >= 3 && dist < 300 && dist > 40 && c.shootT <= 0 && state.player.mode !== 'boat') {
      c.shootT = 1.1 + Math.random() * 0.9;
      const a = Math.atan2(py - c.y, px - c.x) + (Math.random() - 0.5) * 0.16;
      state.projectiles.push({ x: c.x, y: c.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.5, dmg: 6, friendly: false });
      VH.audio.shot();
    }
  }
  if (resp.roadblocks) VH.roadblocks.maybePlace(state);
  else VH.roadblocks.clearAll(state);
}
window.VH = window.VH || {};
VH.pursuit = { dispatchInterceptor: dispatchInterceptor, dispatchCruiser: dispatchCruiser, update: updatePursuit, spawnNear: spawnPointNearPlayer };
