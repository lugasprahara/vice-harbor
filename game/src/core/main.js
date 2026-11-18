// Vice Harbor — boot, game loop, world rendering, player control and every system tick.
function bootViceHarbor() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const state = createGameState(canvas);
  VH.input.bind(state.input, canvas);
  const shot = VH.shots.parse();
  if (shot) VH.shots.stage(state, shot);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    resizeCanvas(canvas, state);
    handleGlobalKeys(state);
    if (state.mode === 'playing') updateGame(state, dt);
    else if (state.mode === 'title') updateTitleWorld(state, dt);
    else if (state.mode === 'busted' || state.mode === 'wasted') {
      state.deathT -= dt;
      if (state.deathT <= 0) respawnPlayer(state);
    }
    renderGame(ctx, state);
    VH.input.clearPressed(state.input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return state;
}
function createGameState(canvas) {
  const rng = Math.random;
  const layout = VH.city.build(rng);
  const state = {
    canvas: canvas, t: 0, mode: 'title',
    input: VH.input.createInputState(),
    layout: layout,
    player: { x: 1560, y: 760, angle: 0.6, hp: 100, money: 120, mode: 'foot', car: null, boat: null, walkPhase: 0 },
    camera: { x: 1560, y: 760, vw: 1280, vh: 800 },
    cars: [], peds: [], boats: [], policeCars: [], roadblocks: [], projectiles: [],
    packages: VH.packages.place(),
    loadout: VH.weapons.createLoadout(),
    wanted: VH.wanted.create(),
    campaign: VH.missions.create(),
    heist: VH.heists.create(),
    taxi: VH.taxi.create(),
    radio: VH.radio.create(),
    smuggler: { active: false, stage: '', pickup: null, drop: null, dropName: '', payout: 0 },
    fx: VH.fx.create(),
    wake: VH.wake.create(),
    dialogue: null, banner: null, deathT: 0, spawnT: 0, roadblockT: 0,
    showHeistBoard: false, started: false, shotCar: null,
    stats: { carsStolen: 0, missionsDone: 0, heistsDone: 0, taxiFares: 0, packagesFound: 0, smugglerRuns: 0, copsWrecked: 0 },
    threatAt: null
  };
  state.cars = VH.traffic.seed(rng, 26);
  state.peds = VH.population.populate(rng, 60, layout);
  state.boats = VH.boats.moor(rng);
  state.threatAt = function (x, y) {
    const d = Math.hypot(x - state.player.x, y - state.player.y);
    if (d > 190) return false;
    if (state.loadout && performance.now() - (state.lastShotAt || 0) < 900) return true;
    if (state.player.mode === 'car' && Math.abs(state.player.car.speed) > 200) return true;
    return false;
  };
  return state;
}
function resizeCanvas(canvas, state) {
  const w = window.innerWidth, h = window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  state.camera.vw = w; state.camera.vh = h;
}
function handleGlobalKeys(state) {
  const inp = state.input;
  if (state.mode === 'title' && (VH.input.wasPressed(inp, 'Enter') || inp.mouseDown)) {
    state.mode = 'playing'; state.started = true;
    VH.audio.ensure();
    if (!state.campaign.active && !state.campaign.done.m1) VH.missions.start(state, 0);
    inp.mouseDown = false;
    return;
  }
  if (state.mode !== 'playing' && state.mode !== 'paused') return;
  if (VH.input.wasPressed(inp, 'Escape') || VH.input.wasPressed(inp, 'KeyP')) {
    if (state.showHeistBoard) state.showHeistBoard = false;
    else state.mode = state.mode === 'paused' ? 'playing' : 'paused';
    return;
  }
  if (state.mode === 'paused') return;
  if (VH.input.wasPressed(inp, 'KeyH')) { state.showHeistBoard = !state.showHeistBoard; return; }
  if (state.showHeistBoard) {
    if (VH.input.wasPressed(inp, 'Digit1')) { state.showHeistBoard = false; VH.heists.start(state, 'h1'); }
    if (VH.input.wasPressed(inp, 'Digit2')) { state.showHeistBoard = false; VH.heists.start(state, 'h2'); }
    if (VH.input.wasPressed(inp, 'Digit3')) { state.showHeistBoard = false; VH.heists.start(state, 'h3'); }
    return;
  }
  if (VH.input.wasPressed(inp, 'KeyN')) VH.radio.cycle(state);
  if (VH.input.wasPressed(inp, 'KeyM')) { VH.radio.stop(state); state.radio.index = -1; }
  if (VH.input.wasPressed(inp, 'KeyQ')) { VH.weapons.cycle(state.loadout); VH.audio.blip(); }
  if (VH.input.wasPressed(inp, 'KeyT')) VH.taxi.start(state);
  if (VH.input.wasPressed(inp, 'KeyB')) { if (!state.smuggler.active) VH.boats.startRun(state); }
  if (VH.input.wasPressed(inp, 'F5')) { inp.keys.F5 = false; VH.save.toSlot(state, 1); }
  if (VH.input.wasPressed(inp, 'F6')) VH.save.toSlot(state, 2);
  if (VH.input.wasPressed(inp, 'F7')) VH.save.toSlot(state, 3);
  if (VH.input.wasPressed(inp, 'F9')) VH.save.fromSlot(state, 1);
  if (VH.input.wasPressed(inp, 'F10')) VH.save.fromSlot(state, 2);
  if (VH.input.wasPressed(inp, 'F11')) VH.save.fromSlot(state, 3);
  if (VH.input.wasPressed(inp, 'KeyE')) tryEnterExit(state);
}
function tryEnterExit(state) {
  const p = state.player;
  if (p.mode === 'car') { VH.stealing.exit(state); return; }
  if (p.mode === 'boat') { VH.boats.exit(state); return; }
  const boat = VH.boats.nearest(p, state.boats, 64);
  if (boat && (VH.districts.isWater(p.x + 30, p.y) || p.x > VH.world.WATER_X - 170)) { VH.boats.launch(state, boat); return; }
  const car = VH.stealing.nearest(p, state.cars.concat(state.policeCars), 54);
  if (car) {
    if (car.driver === 'police') { VH.wanted.addHeat(state, 1, 'stealing a police car'); }
    VH.stealing.steal(state, car);
    const pi = state.policeCars.indexOf(car);
    if (pi >= 0) state.policeCars.splice(pi, 1);
    state.cars.push(car);
  }
}
function updateTitleWorld(state, dt) {
  const world = { layout: state.layout, player: state.player, cars: state.cars, threatAt: state.threatAt };
  VH.traffic.update(state.cars, dt, world);
  VH.population.update(state.peds, dt, world);
  VH.boats.updateTraffic(state.boats, dt);
  VH.wake.update(state.wake, dt, state.boats);
  VH.fx.update(state.fx, dt);
  state.camera.x += (state.player.x - state.camera.x) * 0.04;
  state.camera.y += (state.player.y - state.camera.y) * 0.04;
}
function updateGame(state, dt) {
  if (state.mode === 'paused' || state.showHeistBoard) return;
  const p = state.player, inp = state.input;
  if (p.mode === 'foot') {
    const mv = VH.input.moveAxis(inp);
    if (mv.active) {
      const speed = inp.keys.ShiftLeft ? 215 : 138;
      const nx = p.x + mv.x * speed * dt, ny = p.y + mv.y * speed * dt;
      if (!VH.city.buildingAt(state.layout, nx, ny, 7) && !VH.districts.isWater(nx, ny)) { p.x = nx; p.y = ny; }
      p.angle = Math.atan2(mv.y, mv.x);
      p.walkPhase += dt * 10;
    }
    const firing = inp.mouseDown || inp.keys.KeyF;
    if (firing) {
      const aim = Math.atan2(inp.mouseY - state.camera.vh / 2, inp.mouseX - state.camera.vw / 2);
      if (state.loadout.current === 'fists') {
        if (state.loadout.cooldown <= 0) { state.loadout.cooldown = 0.32; VH.weapons.melee(state, state.peds, state.cars); }
      } else {
        const shots = VH.weapons.fire(state, p.x, p.y, aim);
        if (shots) { for (const s of shots) state.projectiles.push(s); state.lastShotAt = performance.now(); }
      }
    }
  } else if (p.mode === 'car') {
    VH.stealing.drive(state, p.car, dt);
    const ci = state.cars.indexOf(p.car);
    if (ci < 0) state.cars.push(p.car);
  } else if (p.mode === 'boat') {
    VH.boats.drive(state, p.boat, dt);
  }
  state.loadout.cooldown = Math.max(0, state.loadout.cooldown - dt);
  const world = { layout: state.layout, player: p, cars: state.cars, threatAt: state.threatAt };
  VH.traffic.update(state.cars, dt, world);
  VH.population.update(state.peds, dt, world);
  VH.boats.updateTraffic(state.boats, dt);
  VH.pursuit.update(state, dt);
  VH.roadblocks.checkSpikes(state, dt);
  VH.wanted.update(state, dt);
  VH.weapons.updateProjectiles(state, state.projectiles, dt);
  VH.missions.update(state, dt);
  VH.heists.update(state, dt);
  VH.taxi.update(state, dt);
  VH.packages.update(state);
  VH.dialogue.update(state, dt);
  VH.wake.update(state.wake, dt, state.boats);
  VH.fx.update(state.fx, dt);
  if (state.banner) { state.banner.t -= dt; if (state.banner.t <= 0) state.banner = null; }
  if (p.hp < 100) p.hp = Math.min(100, p.hp + dt * 1.1);
  state.camera.x += (p.x - state.camera.x) * Math.min(1, dt * 6);
  state.camera.y += (p.y - state.camera.y) * Math.min(1, dt * 6);
}
function respawnPlayer(state) {
  if (state.mode === 'wasted') state.player.money = Math.max(0, state.player.money - 100);
  state.player.hp = 100;
  state.player.mode = 'foot'; state.player.car = null; state.player.boat = null;
  state.player.x = 1560; state.player.y = 760;
  state.wanted = VH.wanted.create();
  state.policeCars = []; VH.roadblocks.clearAll(state);
  state.projectiles = [];
  state.mode = 'playing';
  state.banner = { title: 'BACK ON THE STREET', sub: 'Vice Harbor keeps spinning.', t: 2.6 };
  VH.save.autosave(state);
}
function renderGame(ctx, state) {
  const cam = { x: state.camera.x - state.camera.vw / 2 + (state.fx.shake ? (Math.random() - 0.5) * state.fx.shake : 0), y: state.camera.y - state.camera.vh / 2 + (state.fx.shake ? (Math.random() - 0.5) * state.fx.shake : 0), vw: state.camera.vw, vh: state.camera.vh };
  drawWorld(ctx, state, cam);
  VH.fx.draw(ctx, state.fx, cam);
  for (const pk of state.packages) VH.packages.draw(ctx, pk, cam, state.t);
  drawTargetMarker(ctx, state, cam);
  VH.taxi.drawMarker(ctx, state, cam, state.t);
  for (const ped of state.peds) VH.population.draw(ctx, ped, cam);
  for (const car of state.cars) if (car.driver !== 'player') VH.cars.draw(ctx, car, cam, false, false);
  for (const car of state.policeCars) VH.cars.draw(ctx, car, cam, true, false);
  for (const b of state.roadblocks) VH.roadblocks.drawSpikes(ctx, b, cam);
  VH.wake.draw(ctx, state.wake, cam, state.boats);
  for (const boat of state.boats) VH.boats.draw(ctx, boat, cam);
  if (state.player.mode === 'car' && state.player.car) VH.cars.draw(ctx, state.player.car, cam, false, false);
  if (state.player.mode === 'foot') drawPlayerFigure(ctx, state, cam);
  drawProjectiles(ctx, state, cam);
  if (state.fx.flashRed > 0) { ctx.fillStyle = 'rgba(255,30,20,' + (state.fx.flashRed * 0.22) + ')'; ctx.fillRect(0, 0, cam.vw, cam.vh); }
  drawSunsetGlow(ctx, cam);
  if (state.mode === 'title') { VH.menus.title(ctx, state, cam.vw, cam.vh, state.t); return; }
  VH.hud.draw(ctx, state, cam.vw, cam.vh);
  VH.hud.objective(ctx, state, cam.vw);
  VH.minimap.draw(ctx, state, cam.vw, cam.vh);
  VH.dialogue.draw(ctx, state, cam.vw);
  drawContextPrompt(ctx, state, cam);
  if (state.mode === 'paused') VH.menus.pause(ctx, state, cam.vw, cam.vh);
  if (state.showHeistBoard) VH.menus.heistBoard(ctx, state, cam.vw, cam.vh);
  if (state.mode === 'busted' || state.mode === 'wasted') VH.menus.end(ctx, state, cam.vw, cam.vh);
}
function drawWorld(ctx, state, cam) {
  ctx.fillStyle = '#2ea8c9';
  ctx.fillRect(0, 0, cam.vw, cam.vh);
  const x0 = Math.max(0, Math.floor(cam.x / 60) * 60), y0 = Math.max(0, Math.floor(cam.y / 60) * 60);
  for (let x = x0; x < cam.x + cam.vw + 60; x += 60) {
    for (let y = y0; y < cam.y + cam.vh + 60; y += 60) {
      const sx = x - cam.x, sy = y - cam.y;
      if (VH.districts.isWater(x + 30, y + 30)) {
        const wv = Math.sin(state.t * 1.4 + (x + y) * 0.02) * 6;
        ctx.fillStyle = (Math.floor(x / 60) + Math.floor(y / 60)) % 2 ? '#2ea8c9' : '#2fa5c4';
        ctx.fillRect(sx, sy, 60, 60);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(sx + 10 + wv, sy + 28, 22, 3);
      } else if (VH.districts.isBeach(x + 30, y + 30)) {
        ctx.fillStyle = '#f2dda6'; ctx.fillRect(sx, sy, 60, 60);
        ctx.fillStyle = 'rgba(190,150,80,0.4)'; ctx.fillRect(sx + 8, sy + 40, 16, 3);
      } else {
        const d = VH.districts.at(x + 30, y + 30);
        const onRoadX = (x % VH.world.BLOCK) < VH.world.ROAD, onRoadY = (y % VH.world.BLOCK) < VH.world.ROAD;
        if (onRoadX || onRoadY) {
          ctx.fillStyle = d.road; ctx.fillRect(sx, sy, 60, 60);
          ctx.fillStyle = 'rgba(255,215,110,0.65)';
          if (onRoadY && !onRoadX) ctx.fillRect(sx, sy + 28, 60, 3);
          if (onRoadX && !onRoadY) ctx.fillRect(sx + 28, sy, 3, 60);
        } else { ctx.fillStyle = d.ground; ctx.fillRect(sx, sy, 60, 60); ctx.fillStyle = d.walk; ctx.fillRect(sx + 3, sy + 3, 54, 6); }
      }
    }
  }
  for (const pier of VH.boats.piers) {
    if (pier.x > VH.world.WATER_X - 300) {
      const sx = pier.x - cam.x, sy = pier.y - cam.y;
      ctx.fillStyle = '#8a6f4d'; ctx.fillRect(sx, sy - 10, 210, 20);
      ctx.fillStyle = '#6e5638';
      for (let i = 0; i < 6; i++) ctx.fillRect(sx + 8 + i * 36, sy - 12, 6, 24);
      ctx.fillStyle = '#14100a'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd76a'; ctx.fillText(pier.name.toUpperCase(), sx + 80, sy - 18);
    }
  }
  const cove = VH.boats.piers[4];
  ctx.fillStyle = '#8a6f4d'; ctx.fillRect(cove.x - cam.x, cove.y - cam.y - 8, 20, 130);
  for (const palm of state.layout.palms) VH.city.drawPalm(ctx, palm, cam, state.t);
  for (const b of state.layout.buildings) VH.city.drawBuilding(ctx, b, cam, state.t);
}
function drawPlayerFigure(ctx, state, cam) {
  const p = state.player, x = p.x - cam.x, y = p.y - cam.y;
  const bob = Math.sin(p.walkPhase) * 2;
  ctx.fillStyle = 'rgba(60,40,15,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y + 11, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26324a';
  ctx.fillRect(x - 6.5, y + 1 + bob * 0.3, 5.5, 11);
  ctx.fillRect(x + 1, y + 1 - bob * 0.3, 5.5, 11);
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath(); ctx.arc(x, y - 2, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 9, y - 5, 18, 10);
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(x, y - 13, 5.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14100a'; ctx.fillRect(x - 6, y - 19, 12, 4);
  if (state.loadout.current !== 'fists') {
    const aim = Math.atan2(state.input.mouseY - cam.vh / 2, state.input.mouseX - cam.vw / 2);
    ctx.save(); ctx.translate(x, y - 2); ctx.rotate(aim);
    ctx.fillStyle = '#22242c'; ctx.fillRect(6, -2.4, state.loadout.current === 'shotgun' ? 20 : 15, 4.8);
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('NICO', x, y - 26);
}
function drawProjectiles(ctx, state, cam) {
  ctx.fillStyle = '#ffe9a8';
  for (const s of state.projectiles) ctx.fillRect(s.x - cam.x - 2.4, s.y - cam.y - 2.4, 4.8, 4.8);
}
function drawTargetMarker(ctx, state, cam) {
  const target = VH.missions.targetPoint(state);
  if (!target || state.mode !== 'playing') return;
  VH.taxi.beacon(ctx, target.x, target.y, cam, state.t, '#ffd23f', '');
}
function drawContextPrompt(ctx, state, cam) {
  const p = state.player;
  if (p.mode !== 'foot' || state.mode !== 'playing') return;
  let text = null;
  if (VH.stealing.nearest(p, state.cars.concat(state.policeCars), 54)) text = '[E] STEAL CAR';
  else if (VH.boats.nearest(p, state.boats, 64)) text = '[E] BOARD BOAT';
  else if (!state.campaign.active && !state.heist.active) text = 'Gold marker: story · H: heists · T: taxi · B: smuggler run';
  if (!text) return;
  ctx.font = 'bold 14px system-ui';
  const w = ctx.measureText(text).width + 26;
  ctx.fillStyle = 'rgba(12,14,22,0.85)';
  VH.cars.roundRect(ctx, (cam.vw - w) / 2, cam.vh - 112, w, 28, 8); ctx.fill();
  ctx.fillStyle = '#ffd76a'; ctx.textAlign = 'center';
  ctx.fillText(text, cam.vw / 2, cam.vh - 93);
  ctx.textAlign = 'left';
}
function drawSunsetGlow(ctx, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.vh);
  g.addColorStop(0, 'rgba(255,150,60,0.10)');
  g.addColorStop(0.5, 'rgba(255,90,120,0.03)');
  g.addColorStop(1, 'rgba(40,20,60,0.08)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cam.vw, cam.vh);
}
window.addEventListener('DOMContentLoaded', bootViceHarbor);
