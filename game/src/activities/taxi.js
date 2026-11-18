// Vice Harbor — repeatable taxi fares: hail, pick up a named rider, drop them off, get paid by distance and speed.
function startTaxiFare(state) {
  if (state.taxi.active) return false;
  const spots = [
    { name: 'Solmar Grand Hotel', x: 520, y: 640 }, { name: 'Coral Boardwalk', x: 1560, y: 640 },
    { name: 'Marina Azul Clubhouse', x: 1960, y: 1660 }, { name: 'Ironhook Docks Gate', x: 640, y: 1700 },
    { name: 'Palmera Fountain', x: 950, y: 2380 }, { name: 'Downtown Solmar', x: 600, y: 600 }
  ];
  const riders = ['Lucia Prado', 'Old Man Ferreira', 'DJ Brisa', 'Sister Ana', 'Tomas the Fisher', 'Valentina Ruiz'];
  let a = spots[Math.floor(Math.random() * spots.length)], b = spots[Math.floor(Math.random() * spots.length)];
  if (a === b) b = spots[(spots.indexOf(a) + 2) % spots.length];
  state.taxi = {
    active: true, stage: 'pickup', pickup: { x: a.x, y: a.y }, drop: { x: b.x, y: b.y },
    riderName: riders[Math.floor(Math.random() * riders.length)], destName: b.name,
    fare: 40 + Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 22), timer: 150
  };
  state.banner = { title: 'TAXI FARE', sub: 'Pick up ' + state.taxi.riderName + ' at ' + a.name, t: 3.4 };
  return true;
}
function updateTaxi(state, dt) {
  const t = state.taxi;
  if (!t.active) return;
  t.timer -= dt;
  if (t.timer <= 0) { t.active = false; state.banner = { title: 'FARE LOST', sub: 'The rider gave up waiting.', t: 2.4 }; return; }
  const target = t.stage === 'pickup' ? t.pickup : t.drop;
  const d = Math.hypot(state.player.x - target.x, state.player.y - target.y);
  const inVehicle = state.player.mode === 'car' || state.player.mode === 'boat';
  if (t.stage === 'pickup' && d < 62 && inVehicle) {
    t.stage = 'dropoff';
    state.banner = { title: 'RIDER ABOARD', sub: t.riderName + ': take me to ' + t.destName + '!', t: 3 };
    VH.audio.pickup();
  } else if (t.stage === 'dropoff' && d < 62 && inVehicle) {
    const tip = Math.max(0, Math.floor(t.timer / 6));
    const pay = t.fare + tip;
    state.player.money += pay;
    state.stats.taxiFares++;
    t.active = false;
    VH.audio.cash();
    VH.fx.floater(state.fx, state.player.x, state.player.y - 26, '+$' + pay + ' FARE', '#ffd23f');
    state.banner = { title: 'FARE COMPLETE', sub: '+$' + pay + ' (tip $' + tip + ') — press T for another fare', t: 3.4 };
  }
}
function createTaxiState() { return { active: false, stage: '', pickup: null, drop: null, riderName: '', destName: '', fare: 0, timer: 0 }; }
function drawFareMarker(ctx, state, cam, t) {
  if (!state.taxi.active) return;
  const target = state.taxi.stage === 'pickup' ? state.taxi.pickup : state.taxi.drop;
  drawBeacon(ctx, target.x, target.y, cam, t, '#ffd23f', 'TAXI');
}
function drawBeacon(ctx, x, y, cam, t, color, label) {
  const sx = x - cam.x, sy = y - cam.y;
  const bob = Math.sin(t * 3) * 6;
  ctx.fillStyle = color; ctx.globalAlpha = 0.22;
  ctx.beginPath(); ctx.arc(sx, sy, 30 + Math.sin(t * 3) * 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(sx, sy - 26 + bob); ctx.lineTo(sx - 10, sy - 44 + bob); ctx.lineTo(sx + 10, sy - 44 + bob); ctx.closePath(); ctx.fill();
  if (label) { ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#14100a'; ctx.fillText(label, sx, sy - 48 + bob); ctx.fillStyle = color; }
}
window.VH = window.VH || {};
VH.taxi = { create: createTaxiState, start: startTaxiFare, update: updateTaxi, drawMarker: drawFareMarker, beacon: drawBeacon };
