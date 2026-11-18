// Vice Harbor — roadblocks: two angled police cars and a spike strip across the road ahead of the player.
function placeRoadblock(state, x, y, angle) {
  const cls = VH.cars.byId('sedan');
  const left = VH.cars.spawn(Math.random, x - Math.sin(angle) * 30, y + Math.cos(angle) * 30, angle + 0.6, cls);
  const right = VH.cars.spawn(Math.random, x + Math.sin(angle) * 30, y - Math.cos(angle) * 30, angle - 0.6, cls);
  left.driver = 'police'; left.kind = 'roadblock'; left.hp = 120; left.color = '#f4f6f8'; left.speed = 0;
  right.driver = 'police'; right.kind = 'roadblock'; right.hp = 120; right.color = '#f4f6f8'; right.speed = 0;
  const block = { x: x, y: y, angle: angle, cars: [left, right], spikes: { x: x, y: y, angle: angle, len: 120 }, hitPlayer: false };
  state.roadblocks.push(block);
  state.policeCars.push(left, right);
  return block;
}
function maybePlaceRoadblock(state) {
  state.roadblockT = (state.roadblockT || 0);
  const px = state.player.x, py = state.player.y;
  for (const b of state.roadblocks) if (Math.hypot(b.x - px, b.y - py) < 700) return null;
  const heading = state.player.car ? state.player.car.angle : state.player.angle;
  let x = px + Math.cos(heading) * 460, y = py + Math.sin(heading) * 460;
  x = Math.max(70, Math.min(VH.world.WATER_X - 80, x));
  y = Math.max(70, Math.min(VH.world.H - 340, y));
  if (VH.city.buildingAt(state.layout, x, y, 30)) return null;
  return placeRoadblock(state, x, y, heading + Math.PI / 2);
}
function clearRoadblocks(state) {
  for (const b of state.roadblocks) {
    for (const c of b.cars) {
      const i = state.policeCars.indexOf(c);
      if (i >= 0) state.policeCars.splice(i, 1);
    }
  }
  state.roadblocks = [];
}
function checkSpikeStrips(state, dt) {
  if (!state.player.car) return;
  const car = state.player.car;
  for (const b of state.roadblocks) {
    if (b.hitPlayer) continue;
    const d = Math.hypot(car.x - b.spikes.x, car.y - b.spikes.y);
    if (d < 52 && Math.abs(car.speed) > 30) {
      b.hitPlayer = true;
      car.hp -= 16;
      car.speed *= 0.35;
      VH.fx.burst(state.fx, car.x, car.y, '#ffe9a8', 14, 130, 0.5, 3);
      VH.fx.shake = 6; VH.audio.crash();
      state.banner = { title: 'SPIKE STRIP!', sub: 'Tyres shredded — the car is limping.', t: 2.2 };
    }
  }
  for (let i = state.roadblocks.length - 1; i >= 0; i--) {
    const b = state.roadblocks[i];
    if (Math.hypot(b.x - state.player.x, b.y - state.player.y) > 950) {
      for (const c of b.cars) { const j = state.policeCars.indexOf(c); if (j >= 0) state.policeCars.splice(j, 1); }
      state.roadblocks.splice(i, 1);
    }
  }
}
function drawSpikeStrip(ctx, block, cam) {
  const x = block.spikes.x - cam.x, y = block.spikes.y - cam.y;
  if (x < -120 || y < -120 || x > cam.vw + 120 || y > cam.vh + 120) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(block.spikes.angle);
  ctx.fillStyle = '#2b2b30'; ctx.fillRect(-block.spikes.len / 2, -6, block.spikes.len, 12);
  ctx.fillStyle = '#ffd23f';
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 11 - 4, 0); ctx.lineTo(i * 11 + 4, 0); ctx.lineTo(i * 11, -11); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
window.VH = window.VH || {};
VH.roadblocks = { place: placeRoadblock, maybePlace: maybePlaceRoadblock, clearAll: clearRoadblocks, checkSpikes: checkSpikeStrips, drawSpikes: drawSpikeStrip };
