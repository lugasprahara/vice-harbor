// Vice Harbor — seven stealable vehicle classes with distinct silhouettes, colours and handling.
function vehicleClassById(id) {
  for (const c of VH.carClasses) if (c.id === id) return c;
  return VH.carClasses[0];
}
function randomVehicleClass(rng) {
  const pool = ['compact', 'sedan', 'sedan', 'muscle', 'pickup', 'van', 'sport', 'taxi'];
  return vehicleClassById(pool[Math.floor(rng() * pool.length)]);
}
function spawnCar(rng, x, y, angle, cls) {
  const c = cls || randomVehicleClass(rng);
  const paints = ['#e84f3d', '#f2a65a', '#35c4d8', '#ffd23f', '#f4f1e6', '#7dff8a', '#a55eea', '#2f6fb2'];
  return {
    x: x, y: y, angle: angle || 0, speed: 0, cls: c, color: c.paint || paints[Math.floor(rng() * paints.length)],
    hp: 100, driver: 'traffic', steerVis: 0, brakeLight: 0, doorOpen: 0, id: Math.floor(rng() * 1e9)
  };
}
function drawCarShape(ctx, car, cam, isPolice, isTaxiTop) {
  const x = car.x - cam.x, y = car.y - cam.y;
  if (x < -90 || y < -90 || x > cam.vw + 90 || y > cam.vh + 90) return;
  const c = car.cls, L = c.len, W = c.wid;
  ctx.save(); ctx.translate(x, y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(60,35,10,0.35)';
  ctx.fillRect(-L / 2 + 6, -W / 2 + 7, L, W);
  ctx.fillStyle = '#1c1c22';
  const ww = 13, wh = 8;
  ctx.fillRect(-L / 2 + 7, -W / 2 - 3, ww, wh); ctx.fillRect(L / 2 - 7 - ww, -W / 2 - 3, ww, wh);
  ctx.fillRect(-L / 2 + 7, W / 2 - 5, ww, wh); ctx.fillRect(L / 2 - 7 - ww, W / 2 - 5, ww, wh);
  ctx.fillStyle = isPolice ? '#f4f6f8' : car.color;
  roundRectPath(ctx, -L / 2, -W / 2, L, W, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(20,15,10,0.55)'; ctx.lineWidth = 1.6; ctx.stroke();
  if (c.id === 'pickup') { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-L / 2 + 4, -W / 2 + 5, L * 0.36, W - 10); }
  if (c.id === 'van') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-L * 0.1, -W / 2 + 4, 3, W - 8); ctx.fillRect(L * 0.18, -W / 2 + 4, 3, W - 8); }
  if (c.id === 'sport') { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-L / 2 + 2, -W / 2 + 3, 8, W - 6); }
  if (c.id === 'muscle') { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-L / 2, -3, L, 6); }
  ctx.fillStyle = '#bfe8f2';
  roundRectPath(ctx, -L * 0.08, -W / 2 + 4, L * 0.3, W - 8, 5); ctx.fill();
  ctx.fillStyle = '#8fc3d4';
  roundRectPath(ctx, L * 0.26, -W / 2 + 5, L * 0.12, W - 10, 4); ctx.fill();
  ctx.fillStyle = car.brakeLight > 0 ? '#ff2a1a' : '#a32318';
  ctx.fillRect(-L / 2 - 2, -W / 2 + 3, 4, 7); ctx.fillRect(-L / 2 - 2, W / 2 - 10, 4, 7);
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(L / 2 - 1, -W / 2 + 3, 4, 7); ctx.fillRect(L / 2 - 1, W / 2 - 10, 4, 7);
  if (isTaxiTop || c.id === 'taxi') {
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-8, -9, 16, 18);
    ctx.fillStyle = '#14100a'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3);
  }
  if (isPolice) {
    ctx.fillStyle = '#1d3fbf'; ctx.fillRect(-L * 0.28, -W / 2, L * 0.56, W);
    ctx.fillStyle = '#f4f6f8'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillText('POLICE', 0, 4); ctx.restore();
    const phase = (performance.now() / 160 + car.id) % 2 < 1;
    ctx.fillStyle = phase ? '#ff2a2a' : '#ffe9e9'; ctx.fillRect(-13, -W / 2 - 4, 12, 6);
    ctx.fillStyle = phase ? '#cfe4ff' : '#2a6bff'; ctx.fillRect(1, -W / 2 - 4, 12, 6);
    ctx.fillStyle = phase ? '#2a6bff' : '#ff2a2a'; ctx.fillRect(-13, W / 2 - 2, 12, 6);
    ctx.fillStyle = phase ? '#ffe9e9' : '#2a6bff'; ctx.fillRect(1, W / 2 - 2, 12, 6);
  }
  if (car.hp < 45) { ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.beginPath(); ctx.arc(L * 0.32, 0, 9 + (100 - car.hp) * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
window.VH = window.VH || {};
VH.carClasses = [
  { id: 'compact', name: 'Brisa Compact', len: 52, wid: 27, top: 215, accel: 240, grip: 5.4, seats: 2 },
  { id: 'sedan', name: 'Solmar Sedan', len: 60, wid: 29, top: 245, accel: 230, grip: 5.0, seats: 4 },
  { id: 'muscle', name: 'Oro Muscle', len: 64, wid: 31, top: 285, accel: 300, grip: 3.9, seats: 2 },
  { id: 'sport', name: 'Faro GT Sport', len: 60, wid: 30, top: 330, accel: 340, grip: 5.8, seats: 2 },
  { id: 'pickup', name: 'Ironhook Pickup', len: 66, wid: 32, top: 225, accel: 215, grip: 4.4, seats: 3 },
  { id: 'van', name: 'Cargo Van', len: 70, wid: 33, top: 200, accel: 185, grip: 4.0, seats: 3 },
  { id: 'taxi', name: 'Solmar Taxi', len: 60, wid: 29, top: 240, accel: 235, grip: 5.0, seats: 4, paint: '#ffd23f' }
];
VH.cars = { byId: vehicleClassById, randomClass: randomVehicleClass, spawn: spawnCar, draw: drawCarShape, roundRect: roundRectPath };
