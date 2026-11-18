// Vice Harbor — HUD: health, money, wanted stars, weapon and ammo, objective banner, district and radio lines.
function drawHUD(ctx, state, vw, vh) {
  const p = state.player;
  ctx.save();
  ctx.textAlign = 'left';
  panel(ctx, 14, 14, 218, 64, 'rgba(12,14,22,0.78)');
  ctx.fillStyle = '#3a0f0f'; ctx.fillRect(26, 30, 150, 13);
  ctx.fillStyle = p.hp > 30 ? '#e84f3d' : '#ff2a1a';
  ctx.fillRect(26, 30, 150 * Math.max(0, p.hp) / 100, 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(26, 30, 150, 13);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.fillText('HEALTH', 26, 25);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 19px system-ui';
  ctx.fillText('$' + Math.floor(p.money), 26, 68);
  if (state.wanted.stars > 0) {
    panel(ctx, vw - 196, 10, 182, 62, 'rgba(12,14,22,0.78)');
    drawStars(ctx, state.wanted.stars, vw - 182, 27);
    ctx.fillStyle = '#ffb3ab'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(state.wanted.reason || 'wanted', vw - 26, 62);
    ctx.textAlign = 'left';
    if (state.wanted.bustTimer > 0.15) {
      ctx.fillStyle = '#ff2a1a'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('BUSTED IN ' + (2.2 - state.wanted.bustTimer).toFixed(1), vw / 2, 92);
      ctx.textAlign = 'left';
    }
  }
  const w = VH.weapons.byId(state.loadout.current);
  panel(ctx, 14, vh - 62, 250, 48, 'rgba(12,14,22,0.78)');
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 15px system-ui';
  const ammo = w.id === 'fists' ? '—' : String(state.loadout.ammo[w.id] || 0);
  const mode = p.mode === 'car' ? 'DRIVING · ' + p.car.cls.name : (p.mode === 'boat' ? 'BOATING · ' + p.boat.spec.name : 'ON FOOT');
  ctx.fillText(w.name.toUpperCase() + '  ' + ammo, 26, vh - 32);
  ctx.fillStyle = '#cfe4ff'; ctx.font = '11px system-ui';
  ctx.fillText(mode + '  ·  Q switch weapon', 26, vh - 18);
  panel(ctx, 276, vh - 62, 330, 48, 'rgba(12,14,22,0.66)');
  ctx.fillStyle = '#9fd8ff'; ctx.font = 'bold 12px system-ui';
  ctx.fillText('♪ ' + VH.radio.label(state.radio), 288, vh - 40);
  ctx.fillStyle = '#f7f3e8'; ctx.font = '11px system-ui';
  ctx.fillText('DISTRICT · ' + VH.districts.nameAt(p.x, p.y).toUpperCase(), 288, vh - 24);
  if (state.banner && state.banner.t > 0) drawBanner(ctx, state.banner, vw);
  ctx.restore();
}
function drawStars(ctx, stars, x, y) {
  for (let i = 0; i < 5; i++) {
    drawStarShape(ctx, x + i * 30, y, 12, i < stars ? '#ffd23f' : 'rgba(255,255,255,0.22)', i < stars);
  }
}
function drawStarShape(ctx, cx, cy, r, color, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (filled) { ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 1; ctx.stroke(); }
}
function drawBanner(ctx, banner, vw) {
  const w = Math.min(680, vw - 80), x = (vw - w) / 2;
  panel(ctx, x, 64, w, banner.sub ? 56 : 38, 'rgba(12,14,22,0.88)');
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
  VH.cars.roundRect(ctx, x, 64, w, banner.sub ? 56 : 38, 10); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 17px system-ui';
  ctx.fillText(banner.title, vw / 2, 88);
  if (banner.sub) { ctx.fillStyle = '#f7f3e8'; ctx.font = '13px system-ui'; ctx.fillText(banner.sub, vw / 2, 108); }
  ctx.textAlign = 'left';
}
function drawObjective(ctx, state, vw) {
  const text = VH.missions.objectiveText(state);
  ctx.save();
  ctx.font = 'bold 13px system-ui';
  const w = Math.min(700, ctx.measureText(text).width + 34);
  panel(ctx, (vw - w) / 2, 128, w, 30, 'rgba(12,14,22,0.72)');
  ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
  ctx.fillText('◎ ' + text, vw / 2, 148);
  ctx.restore();
}
function panel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  VH.cars.roundRect(ctx, x, y, w, h, 10); ctx.fill();
}
window.VH = window.VH || {};
VH.hud = { draw: drawHUD, stars: drawStars, star: drawStarShape, banner: drawBanner, objective: drawObjective, panel: panel };
