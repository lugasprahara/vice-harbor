// Vice Harbor — drivable boats: moored at the marina piers, drift physics, smuggler runs on the water.
function launchBoat(state, boat) {
  boat.driver = 'player';
  state.player.mode = 'boat'; state.player.boat = boat;
  VH.audio.ensure(); VH.audio.blip();
  return boat;
}
function deliverSmugglerCargo(state) {
  const run = state.smuggler;
  if (!run || !run.active || run.stage !== 'deliver') return false;
  const d = Math.hypot(state.player.x - run.drop.x, state.player.y - run.drop.y);
  if (d > 90) return false;
  run.active = false; run.stage = 'done';
  state.player.money += run.payout;
  state.stats.smugglerRuns++;
  VH.audio.cash();
  VH.fx.floater(state.fx, state.player.x, state.player.y - 30, '+$' + run.payout + ' SMUGGLER RUN', '#7dff8a');
  VH.wanted.addHeat(state, 1, 'smuggling');
  state.banner = { title: 'SMUGGLER RUN COMPLETE', sub: 'Cargo delivered to ' + run.dropName + ' · +$' + run.payout, t: 4 };
  return true;
}
function startSmugglerRun(state) {
  const a = VH.boats.piers[Math.floor(Math.random() * 2)];
  const b = VH.boats.piers[2 + Math.floor(Math.random() * 2)];
  state.smuggler = { active: true, stage: 'pickup', pickup: { x: a.x + 70, y: a.y }, drop: { x: b.x + 70, y: b.y }, dropName: b.name, payout: 220 + Math.floor(Math.random() * 160) };
  state.banner = { title: 'SMUGGLER RUN', sub: 'Pick up the cargo at ' + a.name, t: 4 };
  return state.smuggler;
}
function moorBoats(rng) {
  const boats = [];
  for (const pier of VH.boats.piers) {
    boats.push(spawnBoat(rng, pier.x + 56, pier.y - 20, -Math.PI / 2, 'speedboat'));
    if (rng() > 0.4) boats.push(spawnBoat(rng, pier.x + 56, pier.y + 44, -Math.PI / 2, rng() > 0.5 ? 'dinghy' : 'yacht'));
  }
  for (let i = 0; i < 4; i++) {
    const b = spawnBoat(rng, 2820 + rng() * 420, 300 + rng() * 1800, Math.PI / 2, 'cruiser');
    b.driver = 'traffic'; b.speed = 34 + rng() * 26; b.laneY = b.y;
    boats.push(b);
  }
  return boats;
}
function spawnBoat(rng, x, y, angle, kind) {
  const kinds = {
    dinghy: { name: 'Dinghy', len: 40, wid: 18, top: 120, color: '#f4f1e6' },
    speedboat: { name: 'Marlin Speedboat', len: 56, wid: 22, top: 215, color: '#e84f3d' },
    cruiser: { name: 'Azul Cruiser', len: 66, wid: 26, top: 150, color: '#35c4d8' },
    yacht: { name: 'Solmar Yacht', len: 84, wid: 30, top: 110, color: '#ffffff' }
  };
  const k = kinds[kind] || kinds.speedboat;
  return { x: x, y: y, angle: angle || 0, speed: 0, kind: kind, spec: k, driver: 'moored', drift: 0, id: Math.floor(rng() * 1e9) };
}
function nearestBoat(player, boats, maxDist) {
  let best = null, bd = maxDist || 58;
  for (const b of boats) {
    if (b.driver === 'player' || b.driver === 'traffic') continue;
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function exitBoat(state) {
  const boat = state.player.boat;
  if (!boat) return;
  boat.driver = 'moored'; boat.speed = 0;
  state.player.mode = 'foot'; state.player.boat = null;
  for (const pier of VH.boats.piers) {
    if (Math.abs(boat.y - pier.y) < 130 && boat.x < VH.world.WATER_X + 130) {
      state.player.x = pier.x - 26; state.player.y = pier.y; return;
    }
  }
  state.player.x = VH.world.WATER_X - 60; state.player.y = boat.y;
}
function driveBoat(state, boat, dt) {
  const input = state.input;
  const fwd = (input.keys.KeyW || input.keys.ArrowUp) ? 1 : 0;
  const back = (input.keys.KeyS || input.keys.ArrowDown) ? 1 : 0;
  const left = (input.keys.KeyA || input.keys.ArrowLeft) ? 1 : 0;
  const right = (input.keys.KeyD || input.keys.ArrowRight) ? 1 : 0;
  if (fwd) boat.speed += 120 * dt;
  if (back) boat.speed -= 90 * dt;
  boat.speed -= boat.speed * 0.35 * dt;
  boat.speed = Math.max(-45, Math.min(boat.spec.top, boat.speed));
  boat.drift = (right - left) * Math.min(1, Math.abs(boat.speed) / 70);
  boat.angle += boat.drift * 1.25 * dt;
  const nx = boat.x + Math.cos(boat.angle) * boat.speed * dt + Math.cos(boat.angle + Math.PI / 2) * boat.drift * 22 * dt;
  const ny = boat.y + Math.sin(boat.angle) * boat.speed * dt + Math.sin(boat.angle + Math.PI / 2) * boat.drift * 22 * dt;
  if (VH.districts.isWater(nx, ny) || (nx > VH.world.WATER_X - 90 && Math.abs(boat.speed) < 60)) { boat.x = nx; boat.y = ny; }
  else { boat.speed *= 0.4; VH.fx.shake = 3; }
  boat.x = Math.max(VH.world.WATER_X - 130, Math.min(VH.world.W - 30, boat.x));
  boat.y = Math.max(40, Math.min(VH.world.H - 40, boat.y));
  state.player.x = boat.x; state.player.y = boat.y; state.player.angle = boat.angle;
  if (Math.abs(boat.speed) > 12) {
    VH.wake.emit(state.wake, boat);
    if (state.smuggler && state.smuggler.active) {
      if (state.smuggler.stage === 'pickup' && Math.hypot(boat.x - state.smuggler.pickup.x, boat.y - state.smuggler.pickup.y) < 80) {
        state.smuggler.stage = 'deliver';
        state.banner = { title: 'CARGO ABOARD', sub: 'Deliver it to ' + state.smuggler.dropName, t: 4 };
        VH.audio.pickup();
      } else if (state.smuggler.stage === 'deliver') deliverSmugglerCargo(state);
    }
  }
}
function updateTrafficBoats(boats, dt) {
  for (const b of boats) {
    if (b.driver !== 'traffic') continue;
    if (b.dir === undefined) b.dir = b.id % 2 === 0 ? 1 : -1;
    b.angle = b.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    b.y += b.dir * b.speed * dt;
    b.x += Math.sin(b.y * 0.004 + b.id) * 6 * dt;
    if (b.y > VH.world.H - 140) { b.y = VH.world.H - 140; b.dir = -1; }
    if (b.y < 140) { b.y = 140; b.dir = 1; }
    b.x = Math.max(VH.world.WATER_X + 100, Math.min(VH.world.W - 70, b.x));
    VH.wake.emit(null, b);
  }
}
function drawBoatShape(ctx, boat, cam) {
  const x = boat.x - cam.x, y = boat.y - cam.y;
  if (x < -100 || y < -100 || x > cam.vw + 100 || y > cam.vh + 100) return;
  const L = boat.spec.len, W = boat.spec.wid;
  ctx.save(); ctx.translate(x, y); ctx.rotate(boat.angle);
  ctx.fillStyle = 'rgba(10,60,80,0.35)';
  ctx.beginPath(); ctx.ellipse(4, 5, L * 0.55, W * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = boat.spec.color;
  ctx.beginPath();
  ctx.moveTo(L / 2, 0); ctx.lineTo(L * 0.18, -W / 2); ctx.lineTo(-L / 2, -W / 2 + 3);
  ctx.lineTo(-L / 2, W / 2 - 3); ctx.lineTo(L * 0.18, W / 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(15,40,55,0.6)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#bfe8f2'; ctx.fillRect(-L * 0.12, -W * 0.28, L * 0.3, W * 0.56);
  ctx.fillStyle = '#e84f3d'; ctx.fillRect(-L / 2 + 3, -3, L * 0.2, 6);
  if (boat.kind === 'yacht') { ctx.fillStyle = '#dfe9ee'; ctx.fillRect(-L * 0.3, -W * 0.3, L * 0.24, W * 0.6); }
  ctx.restore();
}
window.VH = window.VH || {};
VH.boats = {
  piers: [
    { name: 'Marina Azul Pier 1', x: 2500, y: 1420 }, { name: 'Marina Azul Pier 2', x: 2500, y: 1700 },
    { name: 'Coral Bay Pier', x: 2500, y: 620 }, { name: 'Ironhook Water Gate', x: 2500, y: 2050 },
    { name: 'Palmera Cove Dock', x: 1700, y: 2400 }
  ],
  launch: launchBoat, deliverCargo: deliverSmugglerCargo, startRun: startSmugglerRun,
  moor: moorBoats, spawn: spawnBoat, nearest: nearestBoat, exit: exitBoat, drive: driveBoat,
  updateTraffic: updateTrafficBoats, draw: drawBoatShape
};
