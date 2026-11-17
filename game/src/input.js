// Vice Harbor — input: held keys, one-shot pressed keys, and mouse position and
// buttons in view coordinates (the renderer scales the window to the fixed
// 1280x720 frame, so mouse aim is computed in that space). Also the touch of
// bookkeeping that turns key events into named game actions.

import { VIEW } from './config.js';

export const ACTION_PAUSE = 1;
export const ACTION_INTERACT = 2;
export const ACTION_CONFIRM = 4;

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const input = {
    mouseX: VIEW.width / 2, mouseY: VIEW.height / 2,
    mouseDown: false, mousePressed: false,
    isDown(code) { return held.has(code); },
    wasPressed(code) { return pressed.has(code); },
    endFrame() { pressed.clear(); input.mousePressed = false; },
  };

  window.addEventListener('keydown', (e) => {
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); input.mouseDown = false; });

  function toView(e) {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) / rect.width * VIEW.width;
    input.mouseY = (e.clientY - rect.top) / rect.height * VIEW.height;
  }
  canvas.addEventListener('mousemove', toView);
  canvas.addEventListener('mousedown', (e) => { toView(e); if (!input.mouseDown) input.mousePressed = true; input.mouseDown = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function moveAxis(input) {
  return {
    x: (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0),
    y: (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0),
  };
}

export function driveAxis(input) {
  return {
    throttle: (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0),
    steer: (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0),
    handbrake: input.isDown('Space'),
  };
}
