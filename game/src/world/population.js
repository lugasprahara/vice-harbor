// Vice Harbor — pedestrians: big readable walkers with clothing colours who flee crime and hail taxis.
function spawnPedestrian(rng, x, y) {
  const shirts = ['#ff5a5a', '#ffd23f', '#3ec1d3', '#ff6b9d', '#7dff8a', '#f4f1e6', '#ff9f43', '#a55eea'];
  const skins = ['#f2c79b', '#c68e5e', '#8a5a34', '#ffe0bd'];
  return {
    x: x, y: y, vx: 0, vy: 0, angle: rng() * Math.PI * 2, speed: 26 + rng() * 30,
    shirt: shirts[Math.floor(rng() * shirts.length)], skin: skins[Math.floor(rng() * skins.length)],
    pants: rng() > 0.5 ? '#2f3a56' : '#5d4a30', phase: rng() * 6.28, flee: 0, hail: 0, dead: false, hp: 30
  };
}
function populateStreets(rng, count, layout) {
  const peds = [];
  let guard = 0;
  while (peds.length < count && guard++ < count * 30) {
    const x = 80 + rng() * (VH.world.WATER_X - 220), y = 80 + rng() * (VH.world.H - 200);
    if (VH.city.buildingAt(layout, x, y, 6)) continue;
    if (VH.districts.isWater(x, y)) continue;
    peds.push(spawnPedestrian(rng, x, y));
  }
  return peds;
}
function updatePedestrians(peds, dt, world) {
  for (const p of peds) {
    if (p.dead) continue;
    p.phase += dt * 7;
    let tx = Math.cos(p.angle), ty = Math.sin(p.angle);
    const threat = world.threatAt(p.x, p.y);
    if (threat || p.flee > 0) {
      p.flee = Math.max(p.flee, 1.6);
      const dx = p.x - world.player.x, dy = p.y - world.player.y;
      const l = Math.hypot(dx, dy) || 1; tx = dx / l; ty = dy / l;
      p.x += tx * 120 * dt; p.y += ty * 120 * dt;
      p.flee -= dt; continue;
    }
    if (Math.random() < dt * 0.25) p.angle += (Math.random() - 0.5) * 1.6;
    const nx = p.x + tx * p.speed * dt, ny = p.y + ty * p.speed * dt;
    if (VH.city.buildingAt(world.layout, nx, ny, 4) || VH.districts.isWater(nx, ny)) { p.angle += 2.2; continue; }
    p.x = nx; p.y = ny;
    p.x = Math.max(20, Math.min(VH.world.W - 20, p.x));
    p.y = Math.max(20, Math.min(VH.world.H - 20, p.y));
  }
}
function drawPedestrian(ctx, p, cam) {
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -30 || y < -30 || x > cam.vw + 30 || y > cam.vh + 30) return;
  if (p.dead) {
    ctx.fillStyle = '#8a2f2a'; ctx.beginPath(); ctx.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const bob = Math.sin(p.phase) * 2;
  ctx.fillStyle = 'rgba(60,40,15,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.pants;
  ctx.fillRect(x - 6, y + 1 + bob * 0.3, 5, 10);
  ctx.fillRect(x + 1, y + 1 - bob * 0.3, 5, 10);
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.arc(x, y - 2, 8.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 8, y - 4, 16, 9);
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(x, y - 12, 5.4, 0, Math.PI * 2); ctx.fill();
  if (p.hail > 0) {
    ctx.strokeStyle = p.skin; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 7, y - 5); ctx.lineTo(x + 13, y - 16); ctx.stroke();
  }
  if (p.flee > 0) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 22);
  }
}
window.VH = window.VH || {};
VH.population = { spawn: spawnPedestrian, populate: populateStreets, update: updatePedestrians, draw: drawPedestrian };
