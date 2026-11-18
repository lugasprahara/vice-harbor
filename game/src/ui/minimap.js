// Vice Harbor — live minimap: districts, water, roads and blips for player, objectives, police, packages and boats.
function drawMinimap(ctx, state, vw, vh) {
  const S = 168, x0 = vw - S - 14, y0 = vh - S - 76;
  const sx = S / VH.world.W, sy = S / VH.world.H;
  ctx.save();
  ctx.fillStyle = 'rgba(12,14,22,0.85)';
  VH.cars.roundRect(ctx, x0 - 5, y0 - 5, S + 10, S + 26, 10); ctx.fill();
  ctx.beginPath(); VH.cars.roundRect(ctx, x0, y0, S, S, 6); ctx.clip();
  for (const d of VH.districts.list) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(x0 + d.x * sx, y0 + d.y * sy, d.w * sx, d.h * sy);
  }
  ctx.fillStyle = '#2ea8c9';
  ctx.fillRect(x0 + VH.world.WATER_X * sx, y0, (VH.world.W - VH.world.WATER_X) * sx, S);
  ctx.fillRect(x0, y0 + (VH.world.H - 260) * sy, S, 260 * sy);
  ctx.strokeStyle = 'rgba(70,60,50,0.8)'; ctx.lineWidth = 1.6;
  for (let gx = 0; gx <= VH.world.W; gx += VH.world.BLOCK) {
    ctx.beginPath(); ctx.moveTo(x0 + gx * sx, y0); ctx.lineTo(x0 + gx * sx, y0 + S); ctx.stroke();
  }
  for (let gy = 0; gy <= VH.world.H; gy += VH.world.BLOCK) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + gy * sy); ctx.lineTo(x0 + S, y0 + gy * sy); ctx.stroke();
  }
  for (const p of state.packages) {
    if (p.found) continue;
    blip(ctx, x0 + p.x * sx, y0 + p.y * sy, 2, '#7dff8a');
  }
  for (const b of state.boats) blip(ctx, x0 + b.x * sx, y0 + b.y * sy, 2.4, '#bfe8f2');
  for (const c of state.policeCars) {
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    blip(ctx, x0 + c.x * sx, y0 + c.y * sy, 3.4, flash ? '#ff2a2a' : '#2a6bff');
  }
  const target = VH.missions.targetPoint(state);
  if (target) {
    const tx = x0 + target.x * sx, ty = y0 + target.y * sy;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(tx, ty, 5 + Math.sin(performance.now() / 240) * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#14100a'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  const px = x0 + state.player.x * sx, py = y0 + state.player.y * sy;
  ctx.save(); ctx.translate(px, py); ctx.rotate(state.player.angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.4, 5); ctx.lineTo(-4.4, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#14100a'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#cfe4ff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(VH.districts.nameAt(state.player.x, state.player.y).toUpperCase(), x0 + S / 2, y0 + S + 16);
  ctx.textAlign = 'left';
}
function blip(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
window.VH = window.VH || {};
VH.minimap = { draw: drawMinimap, blip: blip };
