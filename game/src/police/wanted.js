// Vice Harbor — wanted level 1–5 stars: heat, decay, and what each star level sends after you.
function addHeat(state, amount, reason) {
  if (state.mode !== 'playing' || amount <= 0) return;
  state.wanted.heat += amount * 26;
  state.wanted.lastCrime = 0;
  state.wanted.reason = reason || state.wanted.reason;
  const stars = starsForHeat(state.wanted.heat);
  if (stars > state.wanted.stars) {
    state.wanted.stars = stars;
    if (stars >= 2) VH.audio.sirenStart();
  }
}
function starsForHeat(heat) {
  if (heat <= 0) return 0;
  if (heat < 55) return 1;
  if (heat < 120) return 2;
  if (heat < 210) return 3;
  if (heat < 320) return 4;
  return 5;
}
function createWantedState() {
  return { stars: 0, heat: 0, lastCrime: 99, reason: '', bustTimer: 0, escapeT: 0 };
}
function updateWanted(state, dt) {
  const w = state.wanted;
  w.lastCrime += dt;
  if (w.stars > 0 && w.lastCrime > 6) {
    w.heat = Math.max(0, w.heat - dt * 7.5);
    const s = starsForHeat(w.heat);
    if (s < w.stars) { w.stars = s; if (s === 0) { VH.audio.sirenStop(); state.banner = { title: 'YOU LOST THE COPS', sub: 'Heat is off — for now.', t: 2.4 }; } }
  }
  const nearCop = state.policeCars.some(function (c) { return Math.hypot(c.x - state.player.x, c.y - state.player.y) < 54 && Math.abs(c.speed) < 26; });
  const slow = state.player.mode === 'foot' || Math.abs((state.player.car || state.player.boat || { speed: 0 }).speed || 0) < 30;
  if (w.stars > 0 && nearCop && slow && state.player.mode === 'foot') {
    w.bustTimer += dt;
    if (w.bustTimer > 2.2) triggerBusted(state);
  } else w.bustTimer = Math.max(0, w.bustTimer - dt * 2);
}
function triggerBusted(state) {
  state.mode = 'busted'; state.deathT = 3.2;
  state.player.money = Math.max(0, state.player.money - 150);
  VH.audio.sirenStop(); VH.audio.engineSet(0, false);
}
function responseForStars(stars) {
  return {
    cruisers: [0, 1, 2, 3, 4, 5][stars] || 0,
    interceptors: stars >= 3 ? (stars >= 5 ? 3 : stars - 2) : 0,
    roadblocks: stars >= 4,
    aggression: 0.55 + stars * 0.13,
    topSpeed: 225 + stars * 26
  };
}
window.VH = window.VH || {};
VH.wanted = { addHeat: addHeat, starsFor: starsForHeat, create: createWantedState, update: updateWanted, busted: triggerBusted, response: responseForStars };
