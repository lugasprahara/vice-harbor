// Vice Harbor — keyboard and mouse input: one shared key map the whole game reads.
function createInputState() {
  return { keys: {}, mouseX: 0, mouseY: 0, mouseDown: false, pressed: {} };
}
function bindInputHandlers(state, canvas) {
  window.addEventListener('keydown', function (e) {
    if (!state.keys[e.code]) state.pressed[e.code] = true;
    state.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (/^F([5-9]|1[01])$/.test(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { state.keys[e.code] = false; });
  canvas.addEventListener('mousemove', function (e) {
    const r = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - r.left; state.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', function () { state.mouseDown = true; });
  window.addEventListener('mouseup', function () { state.mouseDown = false; });
  window.addEventListener('blur', function () { state.keys = {}; state.mouseDown = false; });
}
function wasPressed(state, code) { return !!state.pressed[code]; }
function clearPressedKeys(state) { state.pressed = {}; }
function moveAxis(state) {
  let x = 0, y = 0;
  if (state.keys.KeyA || state.keys.ArrowLeft) x -= 1;
  if (state.keys.KeyD || state.keys.ArrowRight) x += 1;
  if (state.keys.KeyW || state.keys.ArrowUp) y -= 1;
  if (state.keys.KeyS || state.keys.ArrowDown) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
}
window.VH = window.VH || {};
VH.input = { createInputState: createInputState, bind: bindInputHandlers, wasPressed: wasPressed, clearPressed: clearPressedKeys, moveAxis: moveAxis };
