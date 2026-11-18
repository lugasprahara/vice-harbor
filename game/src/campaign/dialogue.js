// Vice Harbor — dialogue: named characters speak in timed lines over the action.
function speak(state, who, text, color) {
  state.dialogue = { who: who, text: text, color: color || '#ffd76a', t: 3.6, queue: state.dialogue ? state.dialogue.queue : [] };
}
function queueDialogue(state, lines) {
  if (!state.dialogue) state.dialogue = { who: '', text: '', color: '#ffd76a', t: 0, queue: [] };
  for (const l of lines) state.dialogue.queue.push(l);
  if (state.dialogue.t <= 0) advanceDialogue(state);
}
function advanceDialogue(state) {
  const d = state.dialogue;
  if (!d || !d.queue.length) { if (d) d.t = 0; return; }
  const next = d.queue.shift();
  d.who = next[0]; d.text = next[1]; d.color = next[2] || '#ffd76a'; d.t = 3.6;
}
function updateDialogue(state, dt) {
  if (!state.dialogue) return;
  if (state.dialogue.t > 0) { state.dialogue.t -= dt; if (state.dialogue.t <= 0) advanceDialogue(state); }
}
function drawDialogue(ctx, state, vw) {
  const d = state.dialogue;
  if (!d || d.t <= 0 || !d.text) return;
  const w = Math.min(620, vw - 60), x = (vw - w) / 2, y = 168;
  ctx.fillStyle = 'rgba(12,14,22,0.88)';
  VH.cars.roundRect(ctx, x, y, w, 58, 10); ctx.fill();
  ctx.strokeStyle = d.color; ctx.lineWidth = 2; VH.cars.roundRect(ctx, x, y, w, 58, 10); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = d.color;
  ctx.fillText(d.who.toUpperCase(), x + 14, y + 20);
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#f7f3e8';
  wrapText(ctx, d.text, x + 14, y + 40, w - 28, 16);
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
window.VH = window.VH || {};
VH.dialogue = { speak: speak, queue: queueDialogue, update: updateDialogue, draw: drawDialogue, wrap: wrapText };
