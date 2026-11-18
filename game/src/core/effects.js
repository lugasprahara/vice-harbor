// Vice Harbor — transient effects: skid marks, muzzle flashes, sparks, smoke, floating cash text.
function createEffectsSystem() {
  return { skids: [], particles: [], flashes: [], floaters: [], shake: 0, flashRed: 0 };
}
function addSkidMark(fx, x, y, angle) {
  fx.skids.push({ x: x, y: y, a: angle, life: 14 });
  if (fx.skids.length > 420) fx.skids.splice(0, fx.skids.length - 420);
}
function spawnParticles(fx, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random() * 0.7) * (speed || 90);
    fx.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life || 0.5, max: life || 0.5, color: color, size: size || 3 });
  }
}
function spawnMuzzleFlash(fx, x, y, angle) { fx.flashes.push({ x: x, y: y, a: angle, life: 0.06 }); }
function spawnFloater(fx, x, y, text, color) { fx.floaters.push({ x: x, y: y, text: text, color: color || '#7dff8a', life: 1.4 }); }
function updateEffects(fx, dt) {
  for (let i = fx.skids.length - 1; i >= 0; i--) { fx.skids[i].life -= dt; if (fx.skids[i].life <= 0) fx.skids.splice(i, 1); }
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt;
    if (p.life <= 0) fx.particles.splice(i, 1);
  }
  for (let i = fx.flashes.length - 1; i >= 0; i--) { fx.flashes[i].life -= dt; if (fx.flashes[i].life <= 0) fx.flashes.splice(i, 1); }
  for (let i = fx.floaters.length - 1; i >= 0; i--) { const f = fx.floaters[i]; f.y -= 34 * dt; f.life -= dt; if (f.life <= 0) fx.floaters.splice(i, 1); }
  fx.shake = Math.max(0, fx.shake - dt * 26);
  fx.flashRed = Math.max(0, fx.flashRed - dt * 2.4);
}
function drawEffects(ctx, fx, cam) {
  ctx.save();
  ctx.strokeStyle = 'rgba(30,26,24,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of fx.skids) {
    const x = s.x - cam.x, y = s.y - cam.y;
    ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(s.a) * 10, y + Math.cos(s.a) * 10);
  }
  ctx.stroke();
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of fx.flashes) {
    const x = f.x - cam.x, y = f.y - cam.y;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const f of fx.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = '#10231a'; ctx.fillText(f.text, f.x - cam.x + 1, f.y - cam.y + 1);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
window.VH = window.VH || {};
VH.fx = { create: createEffectsSystem, skid: addSkidMark, burst: spawnParticles, muzzle: spawnMuzzleFlash, floater: spawnFloater, update: updateEffects, draw: drawEffects };
