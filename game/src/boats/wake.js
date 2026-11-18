// Vice Harbor — boat wakes: fading foam trails behind every moving hull on the water.
function createWakeSystem() { return { trails: [] }; }
function emitWake(wake, boat) {
  const bx = boat.x - Math.cos(boat.angle) * boat.spec.len * 0.5;
  const by = boat.y - Math.sin(boat.angle) * boat.spec.len * 0.5;
  const trail = { x: bx, y: by, a: boat.angle, life: 2.6, max: 2.6, w: boat.spec.wid };
  if (wake) { wake.trails.push(trail); if (wake.trails.length > 500) wake.trails.splice(0, wake.trails.length - 500); }
  else if (boat._wake) { boat._wake.push(trail); if (boat._wake.length > 60) boat._wake.shift(); }
  else boat._wake = [trail];
}
function updateWakes(wake, dt, boats) {
  if (wake) for (let i = wake.trails.length - 1; i >= 0; i--) { wake.trails[i].life -= dt; if (wake.trails[i].life <= 0) wake.trails.splice(i, 1); }
  if (boats) for (const b of boats) {
    if (!b._wake) continue;
    for (let i = b._wake.length - 1; i >= 0; i--) { b._wake[i].life -= dt; if (b._wake[i].life <= 0) b._wake.splice(i, 1); }
  }
}
function drawWakeTrail(ctx, t, cam) {
  const age = 1 - t.life / t.max;
  ctx.save(); ctx.translate(t.x - cam.x, t.y - cam.y); ctx.rotate(t.a);
  ctx.globalAlpha = 0.5 * (1 - age);
  ctx.fillStyle = '#eafcff';
  const spread = t.w * (0.5 + age * 1.6), len = 26 + age * 46;
  ctx.beginPath();
  ctx.moveTo(0, -t.w * 0.3); ctx.lineTo(-len, -spread); ctx.lineTo(-len, spread); ctx.lineTo(0, t.w * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawWakes(ctx, wake, cam, boats) {
  if (boats) for (const b of boats) if (b._wake) for (const t of b._wake) drawWakeTrail(ctx, t, cam);
  if (wake) for (const t of wake.trails) drawWakeTrail(ctx, t, cam);
}
window.VH = window.VH || {};
VH.wake = { create: createWakeSystem, emit: emitWake, update: updateWakes, draw: drawWakes };
