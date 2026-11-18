// Vice Harbor — menus: golden-hour title screen, pause menu, busted and wasted overlays, help panel.
function drawTitleScreen(ctx, state, vw, vh, t) {
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, 'rgba(255,120,60,0.16)');
  g.addColorStop(0.55, 'rgba(255,60,110,0.05)');
  g.addColorStop(1, 'rgba(20,10,30,0.30)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffd76a';
  ctx.font = '900 62px system-ui, sans-serif';
  ctx.fillText('VICE HARBOR', vw / 2, 74);
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('A golden-hour crime story on the Solmar coast — steal it, drive it, boat it, own it.', vw / 2, 102);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const strip = '10 MISSIONS · 3 HEISTS · 5 DISTRICTS · 7 CAR CLASSES · DRIVABLE BOATS · 4 WEAPONS · 4 RADIO STATIONS · 18 PACKAGES · TAXI FARES · POLICE ROADBLOCKS';
  ctx.fillStyle = 'rgba(10,10,18,0.88)';
  VH.cars.roundRect(ctx, 26, vh - 108, vw - 52, 62, 12); ctx.fill();
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
  VH.cars.roundRect(ctx, 26, vh - 108, vw - 52, 62, 12); ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  let stripSize = 13;
  ctx.font = 'bold ' + stripSize + 'px system-ui, sans-serif';
  while (ctx.measureText(strip).width > vw - 100 && stripSize > 9) { stripSize -= 0.5; ctx.font = 'bold ' + stripSize + 'px system-ui, sans-serif'; }
  ctx.fillText(strip, vw / 2, vh - 82);
  ctx.fillStyle = '#f7f3e8'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY   ·   WASD move · E enter car/boat · F or click shoot · Q weapon · N radio · T taxi · H heist board · Esc pause', vw / 2, vh - 60);
  ctx.restore();
}
function drawPauseMenu(ctx, state, vw, vh) {
  ctx.fillStyle = 'rgba(8,8,16,0.72)'; ctx.fillRect(0, 0, vw, vh);
  const w = 460, h = 400, x = (vw - w) / 2, y = (vh - h) / 2;
  ctx.fillStyle = 'rgba(14,16,26,0.97)';
  VH.cars.roundRect(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2; VH.cars.roundRect(ctx, x, y, w, h, 14); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = '900 30px system-ui'; ctx.fillText('PAUSED', vw / 2, y + 46);
  ctx.fillStyle = '#f7f3e8'; ctx.font = '14px system-ui'; ctx.textAlign = 'left';
  const lines = [
    'Esc / P — resume', 'WASD / arrows — move & drive', 'E — enter / exit car or boat', 'F or mouse click — attack / shoot (aim with mouse)',
    'Q — switch weapon   ·   N — radio station', 'T — start a taxi fare   ·   H — heist board (near a gold marker)',
    'F5 / F6 / F7 — save to slot 1 / 2 / 3', 'F9 / F10 / F11 — load slot 1 / 2 / 3', 'M — mute radio',
    '', 'SAVE SLOTS:  1: ' + VH.save.summary(1) + '   2: ' + VH.save.summary(2) + '   3: ' + VH.save.summary(3),
    'Missions done: ' + Object.keys(state.campaign.done).length + '/10 · Heists: ' + state.stats.heistsDone + '/3 · Packages: ' + state.stats.packagesFound + '/18'
  ];
  lines.forEach(function (ln, i) { ctx.fillText(ln, x + 28, y + 84 + i * 23); });
  ctx.textAlign = 'left';
}
function drawHeistBoard(ctx, state, vw, vh) {
  ctx.fillStyle = 'rgba(8,8,16,0.7)'; ctx.fillRect(0, 0, vw, vh);
  const w = 520, h = 250, x = (vw - w) / 2, y = (vh - h) / 2;
  ctx.fillStyle = 'rgba(14,16,26,0.97)'; VH.cars.roundRect(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2; VH.cars.roundRect(ctx, x, y, w, h, 14); ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffd76a'; ctx.font = '900 24px system-ui';
  ctx.fillText('HEIST BOARD', vw / 2, y + 40);
  ctx.font = '14px system-ui'; ctx.fillStyle = '#f7f3e8'; ctx.textAlign = 'left';
  VH.heists.list.forEach(function (hh, i) {
    ctx.fillText((i + 1) + ' — ' + hh.name + '   ·   payout $' + hh.payout + '   ·   ' + hh.targetName, x + 30, y + 82 + i * 34);
  });
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText('Press 1, 2 or 3 to plan a heist · H or Esc to close', x + 30, y + 210);
  ctx.textAlign = 'left';
}
function drawEndOverlay(ctx, state, vw, vh) {
  const busted = state.mode === 'busted';
  ctx.fillStyle = busted ? 'rgba(20,30,90,0.55)' : 'rgba(90,10,10,0.55)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = busted ? '#9fd8ff' : '#ff6b5e';
  ctx.font = '900 64px system-ui';
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', vw / 2, vh / 2 - 10);
  ctx.fillStyle = '#ffffff'; ctx.font = '16px system-ui';
  ctx.fillText(busted ? 'The Solmar PD fines you $150 and lets you walk.' : 'You wake up outside Coral Clinic, lighter by $100.', vw / 2, vh / 2 + 26);
  ctx.textAlign = 'left';
}
window.VH = window.VH || {};
VH.menus = { title: drawTitleScreen, pause: drawPauseMenu, heistBoard: drawHeistBoard, end: drawEndOverlay };
