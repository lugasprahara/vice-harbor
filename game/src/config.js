// Vice Harbor — every tuning number, colour and catalogue in one place.
// The view is a fixed 1280x720 logical frame; the world is a much larger coastal
// city the camera roams over. Nothing below depends on the real window size.

export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const WORLD = { width: 3400, height: 2600 };

/** Avenues run north-south, streets east-west; blocks sit in the gaps between them. */
export const AVENUES = [240, 640, 1040, 1440, 1840, 2240, 2640];
export const STREETS = [240, 640, 1040, 1440, 1840, 2240];
export const ROAD_WIDTH = 128;
export const WATER_X = 2920;

export const PLAYER = {
  radius: 11,
  walkSpeed: 148,
  runSpeed: 252,
  maxHealth: 100,
  punchRange: 34,
  punchDamage: 34,
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 0, range: 34, cooldown: 0.32, spread: 0, speed: 0, auto: false },
  pistol: { name: 'Pistol', damage: 34, range: 460, cooldown: 0.26, spread: 0.02, speed: 780, auto: false },
  smg: { name: 'SMG', damage: 22, range: 420, cooldown: 0.09, spread: 0.07, speed: 820, auto: true },
};

export const CAR_CLASSES = {
  compact: { name: 'Compact', length: 44, width: 22, topSpeed: 300, accel: 210, grip: 3.4, colors: ['#e74c3c', '#f39c12', '#2ecc71', '#9b59b6'] },
  sedan: { name: 'Sedan', length: 52, width: 24, topSpeed: 340, accel: 230, grip: 3.1, colors: ['#ecf0f1', '#34495e', '#16a085', '#c0392b'] },
  taxi: { name: 'Taxi', length: 52, width: 24, topSpeed: 330, accel: 225, grip: 3.1, colors: ['#f7c948'] },
  truck: { name: 'Truck', length: 66, width: 28, topSpeed: 265, accel: 165, grip: 2.5, colors: ['#7f8c8d', '#d35400', '#2980b9'] },
  police: { name: 'Patrol', length: 52, width: 24, topSpeed: 372, accel: 265, grip: 3.4, colors: ['#f4f6f7'] },
  interceptor: { name: 'Interceptor', length: 54, width: 24, topSpeed: 430, accel: 310, grip: 3.7, colors: ['#212f3c'] },
};

export const RADIO_STATIONS = [
  { id: 'neonwave', name: 'NEONWAVE 98.1', wave: 'sawtooth', base: 110, tempo: 0.42, notes: [0, 3, 5, 7, 10, 7, 5, 3] },
  { id: 'palmdrive', name: 'PALM DRIVE FM', wave: 'triangle', base: 130.81, tempo: 0.55, notes: [0, 4, 7, 11, 12, 11, 7, 4] },
  { id: 'harborbass', name: 'HARBOR BASS 104', wave: 'square', base: 82.41, tempo: 0.31, notes: [0, 0, 7, 0, 5, 0, 10, 7] },
];

export const DISTRICTS = {
  downtown: { label: 'DOWNTOWN', sign: '#ff2e88', trim: '#22d3ee' },
  marina: { label: 'MARINA BOARDWALK', sign: '#ffb340', trim: '#2ee6a8' },
  industrial: { label: 'INDUSTRIAL DOCKS', sign: '#ff7847', trim: '#ffd23e' },
  residential: { label: 'PALM RESIDENTIAL', sign: '#7ee787', trim: '#ffa8d2' },
};

export const PALETTE = {
  night: '#0a0f22',
  asphalt: '#232838',
  asphaltEdge: '#39405a',
  lane: '#e8d44d',
  sidewalk: '#4a4f66',
  sand: '#c9a86a',
  water: '#0d3550',
  waterGlow: '#14607e',
  grass: '#1d4634',
  text: '#f2f5ff',
  muted: '#9aa5c4',
  money: '#5df08a',
  danger: '#ff4757',
  gold: '#ffd23e',
  panel: 'rgba(8,12,28,0.82)',
};

export const SAVE_KEY = 'vice-harbor.save.v2';
export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
