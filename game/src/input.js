// Keyboard and mouse input. Held keys give a steering vector; one-shot presses
// (enter a car, punch, pause, mute, switch weapon, confirm) are queued and taken
// once by the loop, so a press between two frames is never lost or counted twice.
// The mouse position is tracked in canvas pixels; the game turns it into world
// coordinates with the camera, for aiming the pistol.

const MOVE_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, run: false };
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false };

  window.addEventListener('keydown', (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) {
      held[move] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      held.run = true;
      return;
    }
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') pressed.add('confirm');
    else if (event.code === 'KeyE') pressed.add('enter');
    else if (event.code === 'KeyF') pressed.add('punch');
    else if (event.code === 'KeyM') pressed.add('mute');
    else if (event.code === 'KeyP' || event.code === 'Escape') pressed.add('pause');
    else if (event.code === 'Digit1') pressed.add('weapon1');
    else if (event.code === 'Digit2') pressed.add('weapon2');
    else if (event.code === 'KeyQ') pressed.add('quit');
    else if (event.code === 'KeyN') pressed.add('newgame');
    else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    const move = MOVE_KEYS[event.code];
    if (move) held[move] = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.run = false;
  });

  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.run = false;
  });

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  canvas.addEventListener('pointermove', trackMouse);
  canvas.addEventListener('pointerdown', (event) => {
    trackMouse(event);
    mouse.clicked = true;
    pressed.add('confirm');
  });

  return {
    /** The steering vector: -1..1 on each axis, from WASD or the arrow keys. */
    axes() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** True while Shift is held (run on foot). */
    running() {
      return held.run;
    },
    /** True once for each press of the named one-shot key since the last check. */
    takePressed(name) {
      if (!pressed.has(name)) return false;
      pressed.delete(name);
      return true;
    },
    /** True once for each mouse click since the last check. */
    takeClick() {
      if (!mouse.clicked) return false;
      mouse.clicked = false;
      return true;
    },
    /** The mouse position in canvas pixels (the game maps it to the world). */
    mouse,
  };
}

/** A fake input for the deterministic screenshot scenes: same shape, scripted values. */
export function createScriptedInput() {
  const pressed = new Set();
  return {
    axesValue: { x: 0, y: 0 },
    runValue: false,
    mouse: { x: 640, y: 360, clicked: false },
    axes() {
      return this.axesValue;
    },
    running() {
      return this.runValue;
    },
    takePressed(name) {
      if (!pressed.has(name)) return false;
      pressed.delete(name);
      return true;
    },
    takeClick() {
      return false;
    },
    press(name) {
      pressed.add(name);
    },
  };
}
