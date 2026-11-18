// Vice Harbor — authored buildings, storefronts, palms and landmarks laid over the road grid.
function buildCityLayout(rng) {
  const buildings = [], palms = [], signs = [];
  const namesA = ['Cafe', 'Hotel', 'Bar', 'Banco', 'Taller', 'Diner', 'Club', 'Farmacia'];
  const namesB = ['Sol', 'Coral', 'Azul', 'Palma', 'Brisa', 'Oro', 'Mar', 'Faro'];
  let ni = 0;
  for (let bx = 0; bx < VH.world.W / VH.world.BLOCK; bx++) {
    for (let by = 0; by < 7; by++) {
      const x0 = bx * VH.world.BLOCK + 118, y0 = by * VH.world.BLOCK + 118;
      if (x0 > VH.world.WATER_X - 260) continue;
      const w = 130 + rng() * 80, h = 110 + rng() * 80;
      const d = VH.districts.at(x0, y0);
      const tall = d.id === 'downtown' ? 3 + Math.floor(rng() * 4) : 1 + Math.floor(rng() * 2);
      const sign = namesA[ni % namesA.length] + ' ' + namesB[Math.floor(ni / namesA.length) % namesB.length]; ni++;
      buildings.push({ x: x0, y: y0, w: w, h: h, floors: tall, roof: rng() > 0.5 ? d.roofA : d.roofB, sign: sign, district: d.id, awning: rng() > 0.4, tank: rng() > 0.6, ac: rng() > 0.5 });
      signs.push({ x: x0 + w / 2, y: y0 + h + 14, text: sign, color: d.accent });
      if (rng() > 0.35) palms.push({ x: x0 - 26, y: y0 + h * (0.3 + rng() * 0.5), s: 0.8 + rng() * 0.5 });
      if (rng() > 0.5) palms.push({ x: x0 + w + 24, y: y0 + 20 + rng() * 40, s: 0.8 + rng() * 0.5 });
    }
  }
  const landmarks = [
    { name: 'Faro de Solmar Lighthouse', x: 2900, y: 420, w: 54, h: 54, kind: 'lighthouse' },
    { name: 'Solmar Grand Hotel', x: 420, y: 430, w: 210, h: 160, kind: 'hotel' },
    { name: 'Coral Ferris Wheel', x: 1900, y: 330, w: 120, h: 120, kind: 'wheel' },
    { name: 'Ironhook Crane Yard', x: 420, y: 1560, w: 260, h: 150, kind: 'crane' },
    { name: 'Marina Azul Clubhouse', x: 1900, y: 1560, w: 200, h: 130, kind: 'clubhouse' },
    { name: 'Palmera Fountain', x: 900, y: 2420, w: 110, h: 80, kind: 'fountain' }
  ];
  for (const lm of landmarks) buildings.push({ x: lm.x, y: lm.y, w: lm.w, h: lm.h, floors: 2, roof: '#e8e3d5', sign: lm.name, district: 'landmark', awning: false, tank: false, ac: false, landmark: lm.kind });
  return { buildings: buildings, palms: palms, signs: signs, landmarks: landmarks };
}
function buildingAtPoint(layout, x, y, pad) {
  const p = pad || 0;
  for (const b of layout.buildings) {
    if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
  }
  return null;
}
function drawBuilding(ctx, b, cam, t) {
  const x = b.x - cam.x, y = b.y - cam.y;
  if (x + b.w < -80 || y + b.h < -80 || x > cam.vw + 80 || y > cam.vh + 80) return;
  ctx.fillStyle = 'rgba(90,50,20,0.35)';
  ctx.fillRect(x + 10 + b.floors * 3, y + 12 + b.floors * 3, b.w, b.h);
  ctx.fillStyle = b.roof;
  ctx.fillRect(x, y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,235,200,0.25)';
  ctx.fillRect(x, y, b.w, 8);
  ctx.strokeStyle = 'rgba(60,35,20,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const cols = Math.max(2, Math.floor(b.w / 44)), rows = Math.max(2, Math.floor(b.h / 40));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if ((i * 7 + j * 13 + b.x) % 3 !== 0) ctx.fillRect(x + 12 + i * 42, y + 12 + j * 38, 20, 16);
  }
  if (b.tank) { ctx.fillStyle = '#8a6f4d'; ctx.beginPath(); ctx.arc(x + b.w - 26, y + 24, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5d4a30'; ctx.stroke(); }
  if (b.ac) { ctx.fillStyle = '#cfd6da'; ctx.fillRect(x + 16, y + b.h - 30, 22, 16); }
  if (b.awning) {
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(x + 6, y + b.h - 4, b.w - 12, 10);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 10 + i * ((b.w - 20) / 5), y + b.h - 4, (b.w - 20) / 10, 10);
  }
  if (b.sign) {
    ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    const glow = 0.65 + 0.35 * Math.sin(t * 2 + b.x);
    ctx.fillStyle = 'rgba(20,16,24,0.85)';
    const tw = ctx.measureText(b.sign).width + 14;
    ctx.fillRect(x + b.w / 2 - tw / 2, y + b.h + 3, tw, 16);
    ctx.globalAlpha = glow; ctx.fillStyle = '#ffd76a';
    ctx.fillText(b.sign, x + b.w / 2, y + b.h + 15);
    ctx.globalAlpha = 1;
  }
  if (b.landmark === 'lighthouse') {
    ctx.fillStyle = '#f4f1e6'; ctx.fillRect(x + 14, y - 44, 26, 60);
    ctx.fillStyle = '#d84f3a'; ctx.fillRect(x + 14, y - 26, 26, 12);
    ctx.fillStyle = '#ffd76a'; ctx.beginPath(); ctx.arc(x + 27, y - 50, 9, 0, Math.PI * 2); ctx.fill();
  }
  if (b.landmark === 'wheel') {
    ctx.strokeStyle = '#ff6b9d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, 52, t * 0.25, t * 0.25 + Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, 8, 0, Math.PI * 2); ctx.stroke();
  }
}
function drawPalm(ctx, p, cam, t) {
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -60 || y < -60 || x > cam.vw + 60 || y > cam.vh + 60) return;
  ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5 * p.s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6 * p.s, y - 16 * p.s, x + 12 * p.s, y - 30 * p.s); ctx.stroke();
  ctx.strokeStyle = '#3f9e4d'; ctx.lineWidth = 3.4 * p.s;
  const sway = Math.sin(t * 1.3 + p.x * 0.05) * 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + sway * 0.04;
    ctx.beginPath(); ctx.moveTo(x + 12 * p.s, y - 30 * p.s);
    ctx.quadraticCurveTo(x + 12 * p.s + Math.cos(a) * 16 * p.s, y - 30 * p.s + Math.sin(a) * 8 * p.s - 4, x + 12 * p.s + Math.cos(a) * 26 * p.s, y - 30 * p.s + Math.sin(a) * 13 * p.s + 7); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,40,15,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 3, 16 * p.s, 6 * p.s, 0, 0, Math.PI * 2); ctx.fill();
}
window.VH = window.VH || {};
VH.city = { build: buildCityLayout, buildingAt: buildingAtPoint, drawBuilding: drawBuilding, drawPalm: drawPalm };
