// Vice Harbor — deterministic screenshot scenes for ?shot=start|play|chase|boat&seed=1.
function seededRandom(seed) {
  let s = (seed * 2654435761) >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function parseShotRequest() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { name: shot, seed: parseInt(q.get('seed') || '1', 10) || 1 };
}
function stageShotScene(state, shot) {
  const rng = seededRandom(shot.seed);
  if (shot.name === 'start') {
    state.mode = 'title';
    state.player.x = 1060; state.player.y = 620; state.player.angle = 0.4;
    crowdAround(state, 1060, 620, 26, rng);
    trafficAround(state, 1060, 620, rng);
    state.camera.x = state.player.x; state.camera.y = state.player.y;
    return;
  }
  state.mode = 'playing';
  if (shot.name === 'play') {
    state.player.x = 1560; state.player.y = 690; state.player.mode = 'foot'; state.player.angle = 0.5;
    const car = VH.cars.spawn(rng, 1648, 726, 0.12, VH.cars.byId('sport'));
    car.driver = 'parked'; car.color = '#e84f3d';
    state.cars.push(car);
    state.shotCar = car;
    state.campaign.active = true; state.campaign.index = 0; state.campaign.stage = 1;
    crowdAround(state, 1560, 690, 20, rng);
    trafficAround(state, 1560, 690, rng);
    state.banner = { title: 'MISSION 1 — FIRST LIGHT FREIGHT', sub: 'Deliver the crate to Ironhook Docks', t: 9999 };
    return;
  }
  if (shot.name === 'chase') {
    // Staged for the ~3 s capture: the player starts at full speed and coasts
    // (285 -> ~54, covering ~416 px), the interceptors start far behind and
    // only close to ~250/360 px behind the player at capture time, and the
    // roadblock sits 680 ahead — inside the 700 spawn-suppression range and
    // still ~264 ahead, unreached, in the capture frame. spawnT is held high
    // so no extra police spawn into the staged scene.
    state.player.x = 1250; state.player.y = 1030;
    const car = VH.cars.spawn(rng, 1250, 1030, 0, VH.cars.byId('muscle'));
    car.driver = 'player'; car.color = '#ffd23f'; car.speed = 285;
    state.cars.push(car);
    state.player.mode = 'car'; state.player.car = car; state.player.angle = 0;
    const i1 = VH.pursuit.dispatchInterceptor(state, 164, 1016);
    const i2 = VH.pursuit.dispatchInterceptor(state, 54, 1044);
    i1.angle = 0; i1.speed = 185; i2.angle = 0; i2.speed = 185;
    VH.roadblocks.place(state, 1930, 1030, Math.PI / 2);
    state.wanted.stars = 4; state.wanted.heat = 300; state.wanted.lastCrime = 0; state.wanted.reason = 'heist getaway';
    state.heist = { active: true, id: 'h1', stage: 'getaway', stageT: 0, loot: 900, planX: 0, planY: 0 };
    state.radio.index = 0;
    state.spawnT = 999;
    for (let i = 0; i < 54; i++) VH.fx.skid(state.fx, 1652 - i * 15, 1015 + Math.sin(i) * 2, 0);
    for (let i = 0; i < 54; i++) VH.fx.skid(state.fx, 1652 - i * 15, 1045 - Math.sin(i) * 2, 0);
    crowdAround(state, 1900, 900, 8, rng);
    state.banner = { title: 'GETAWAY!', sub: 'Lose the heat — reach the Marina Azul safehouse', t: 9999 };
    state.camera.x = state.player.x; state.camera.y = state.player.y;
    return;
  }
  if (shot.name === 'boat') {
    state.player.x = 2800; state.player.y = 1560;
    const boat = VH.boats.spawn(rng, 2800, 1560, Math.PI / 2, 'speedboat');
    boat.driver = 'player'; boat.speed = 130;
    state.boats.push(boat);
    state.player.mode = 'boat'; state.player.boat = boat; state.player.angle = Math.PI / 2;
    for (let i = 0; i < 16; i++) VH.wake.emit(state.wake, { x: boat.x, y: boat.y - i * 15, angle: Math.PI / 2, spec: boat.spec });
    const other = VH.boats.spawn(rng, 2920, 1330, Math.PI / 2, 'cruiser');
    other.driver = 'traffic'; other.speed = 40; other.dir = 1;
    state.boats.push(other);
    state.smuggler = { active: true, stage: 'deliver', pickup: { x: 2570, y: 620 }, drop: { x: 2570, y: 2050 }, dropName: 'Ironhook Water Gate', payout: 300 };
    state.banner = { title: 'SMUGGLER RUN', sub: 'Deliver the cargo to Ironhook Water Gate', t: 9999 };
    return;
  }
}
function crowdAround(state, x, y, n, rng) {
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 620, py = y + (rng() - 0.5) * 420;
    if (VH.city.buildingAt(state.layout, px, py, 8) || VH.districts.isWater(px, py)) continue;
    state.peds.push(VH.population.spawn(rng, px, py));
  }
}
function trafficAround(state, cx, cy, rng) {
  const spots = [[-260, -46], [240, 46], [-80, -46], [120, 46], [-420, 46], [420, -46], [40, -386], [-300, 386]];
  for (const s of spots) {
    const horiz = Math.abs(s[1]) < 100;
    const car = VH.cars.spawn(rng, cx + s[0], cy + s[1], horiz ? (s[1] < 0 ? Math.PI : 0) : Math.PI / 2);
    car.driver = 'traffic'; car.speed = 70;
    state.cars.push(car);
  }
}
window.VH = window.VH || {};
VH.shots = { parse: parseShotRequest, stage: stageShotScene, rng: seededRandom };
