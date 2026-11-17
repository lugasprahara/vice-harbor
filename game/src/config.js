// Vice Harbor — every tuning number, colour and size in one place.
// The camera shows a fixed 1280x720 logical window into a much larger city;
// the renderer scales that window to the browser, so no rule below depends
// on the screen size.

export const VIEW = { width: 1280, height: 720 };

/** The whole city, in world units. The beach and the water sit on the east edge. */
export const WORLD = { width: 3200, height: 2400 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'vice-harbor.save.v1';

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 330,
  maxHealth: 100,
  punchDamage: 34,
  punchRange: 46,
};

export const PISTOL = {
  damage: 50,
  range: 460,
  startAmmo: 24,
  pickupAmmo: 12,
};

export const CAR = {
  accel: 430,
  brake: 760,
  maxSpeed: 540,
  reverseMax: 170,
  turnRate: 2.7,
  radius: 16,
  enterRange: 52,
};

export const TRAFFIC = {
  cruiseMin: 130,
  cruiseMax: 185,
  count: 14,
  parkedCount: 12,
};

export const PEDS = { count: 26, walkMin: 42, walkMax: 78, fleeSpeed: 210 };

export const POLICE = { chaseSpeed: 560, ramDamage: 9, bustRange: 36, maxCars: 3 };

export const WANTED = { decaySeconds: 7, witnessRange: 300 };

export const MISSION_REWARDS = [100, 200, 300, 400, 1000];

export const PACKAGE_COUNT = 10;
export const PACKAGE_CASH = 25;
export const PACKAGE_BONUS = 250;

export const TAXI = { fareMin: 50, fareMax: 150, pickupRange: 56, cooldown: 12 };

/** The road grid: roads run through these centres, 96 units wide, every 400 units. */
export const ROAD_WIDTH = 96;
export const ROAD_GAP = 400;

export const PALETTE = {
  backdrop: '#0b0e1a',
  block: '#181b2e',
  blockAlt: '#1d2138',
  sidewalk: '#2b2f47',
  road: '#20242f',
  roadLine: '#c9a227',
  roadEdge: '#3a3f58',
  sand: '#c9a86a',
  sandDark: '#b08d4f',
  water: '#0e4d6b',
  waterDeep: '#0a3a55',
  grass: '#1d3a24',
  palmTrunk: '#6b4a2f',
  palmLeaf: '#2fae5f',
  lightPole: '#565c74',
  lightGlow: '#ffd97a',
  player: '#35e0c8',
  playerDark: '#0f8a7c',
  pedSkin: '#e8b98a',
  policeWhite: '#e8ecf4',
  policeBlue: '#2f6df6',
  policeLight: '#ff3b30',
  package: '#39ff88',
  taxi: '#ffd23f',
  marker: '#ffd23f',
  markerRed: '#ff4d6d',
  hudPanel: 'rgba(8, 10, 22, 0.72)',
  hudText: '#eef1f5',
  hudMuted: '#9aa1b5',
  hudMoney: '#7dff9e',
  hudHealth: '#ff5d73',
  hudHealthBack: '#3a2030',
  panel: 'rgba(10, 12, 26, 0.88)',
  panelEdge: '#35e0c8',
  titleA: '#ff5da2',
  titleB: '#35e0c8',
  dialogueBox: 'rgba(8, 10, 24, 0.9)',
  star: '#ffd23f',
  starEmpty: '#4a4f66',
};

export const BUILDING_COLORS = ['#2a2f4a', '#33284a', '#27384a', '#3a2a3d', '#2d3a2a', '#402a2a'];
export const ROOF_COLORS = ['#3d4266', '#4a3560', '#35465e', '#52384a', '#3d4a35', '#543838'];
export const NEON_COLORS = ['#ff5da2', '#35e0c8', '#ffd23f', '#7dff9e', '#b78cff', '#ff8a3d'];
export const CAR_COLORS = ['#d64545', '#3f7fd6', '#e8b93c', '#7a4fd0', '#3fae6a', '#d6d6e0', '#e07a2e', '#4fd0c8'];
export const PED_SHIRTS = ['#e05a5a', '#5a8de0', '#e0c95a', '#7ad05a', '#b05ad0', '#e08a5a', '#5ad0c0', '#d0d0d0'];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
