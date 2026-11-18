// Vice Harbor — 18 hidden packages tucked across all five districts and the water; each pays cash.
function placeHiddenPackages() {
  const spots = [
    [300, 300], [880, 260], [1180, 900], [1500, 300], [2050, 500], [2400, 900],
    [420, 1300], [900, 1450], [1600, 1300], [2150, 1450], [2450, 1150], [700, 2050],
    [1100, 2000], [1750, 2100], [2300, 2000], [950, 2380], [2900, 480], [2980, 1900]
  ];
  return spots.map(function (s, i) { return { id: i, x: s[0], y: s[1], found: false }; });
}
function updatePackages(state) {
  for (const p of state.packages) {
    if (p.found) continue;
    const d = Math.hypot(state.player.x - p.x, state.player.y - p.y);
    if (d < 30) {
      p.found = true;
      state.player.money += 75;
      state.stats.packagesFound++;
      VH.audio.pickup();
      VH.fx.burst(state.fx, p.x, p.y, '#7dff8a', 10, 100, 0.5, 3);
      VH.fx.floater(state.fx, p.x, p.y - 20, 'PACKAGE ' + state.stats.packagesFound + '/18  +$75', '#7dff8a');
      if (state.stats.packagesFound === 18) state.banner = { title: 'ALL 18 PACKAGES FOUND!', sub: 'Vice Harbor holds no more secrets from you.', t: 5 };
    }
  }
}
function drawPackage(ctx, p, cam, t) {
  if (p.found) return;
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -30 || y < -30 || x > cam.vw + 30 || y > cam.vh + 30) return;
  const bob = Math.sin(t * 2.4 + p.id) * 3;
  ctx.fillStyle = 'rgba(60,40,15,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 8, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2fae5f';
  ctx.fillRect(x - 9, y - 8 + bob, 18, 15);
  ctx.fillStyle = '#7dff8a';
  ctx.fillRect(x - 9, y - 3 + bob, 18, 3);
  ctx.fillRect(x - 2, y - 8 + bob, 4, 15);
  ctx.fillStyle = '#eaffea'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('$', x, y + 3 + bob);
}
window.VH = window.VH || {};
VH.packages = { place: placeHiddenPackages, update: updatePackages, draw: drawPackage, TOTAL: 18 };
