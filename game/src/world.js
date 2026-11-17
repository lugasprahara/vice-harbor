// Vice Harbor — city generation. Builds the whole coastal city once from a seeded
// random: four districts with their own palettes and landmarks, a street grid with
// blocks of buildings, sidewalks, palms and streetlights, props (crates, barrels,
// signs, awnings), a beach, and a marina with wooden docks and moored boats.
// Also decides where the hidden packages hide and where cars park.

import { AVENUES, DISTRICTS, ROAD_WIDTH, STREETS, WATER_X, WORLD } from './config.js';
import { isOnRoad } from './geo.js';

export function districtAt(x, y) {
  if (x >= WATER_X - 320) return 'marina';
  if (y >= 1500 && x < 1500) return 'industrial';
  if (x >= 1000 && x < 2400 && y >= 500 && y < 1900) return 'downtown';
  return 'residential';
}

const NEON_WORDS = ['VICE', 'NEON', 'PALMS', 'HAVEN', 'AZUL', 'CORAL', 'TIDES', 'LUNA', 'ORO', 'SURF', 'HAVANA NIGHTS', 'CLUB SOL', 'HOTEL MAR', 'DINER 24H'];
const BUILDING_TONES = {
  downtown: ['#2b3a67', '#3d2b5c', '#173f5f', '#462255', '#20405c', '#53354a'],
  marina: ['#5c4a2d', '#2d5c50', '#71563a', '#37586e'],
  industrial: ['#4c4c52', '#5c4632', '#3e4a3a', '#59443a'],
  residential: ['#6e5643', '#59705a', '#715f78', '#4f6272'],
};

function blockRects() {
  const rects = [];
  const edgesX = [60, ...AVENUES, WORLD.width];
  const edgesY = [60, ...STREETS, WORLD.height];
  for (let i = 0; i < edgesX.length - 1; i += 1) {
    for (let j = 0; j < edgesY.length - 1; j += 1) {
      const x0 = edgesX[i] + (i === 0 ? 0 : ROAD_WIDTH / 2 + 14);
      const x1 = edgesX[i + 1] - ROAD_WIDTH / 2 - 14;
      const y0 = edgesY[j] + (j === 0 ? 0 : ROAD_WIDTH / 2 + 14);
      const y1 = edgesY[j + 1] - ROAD_WIDTH / 2 - 14;
      if (x1 - x0 > 60 && y1 - y0 > 60) rects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return rects;
}

export function createWorld(rng) {
  const buildings = [];
  const props = [];
  const palms = [];
  const lights = [];
  const signs = [];

  for (const block of blockRects()) {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (cx >= WATER_X - 60) continue;
    const district = districtAt(cx, cy);
    const cols = district === 'downtown' ? 2 : 1;
    const rows = district === 'residential' ? 2 : 1;
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const w = (block.w / cols) - 16;
        const h = (block.h / rows) - 16;
        const bx = block.x + 8 + i * (block.w / cols);
        const by = block.y + 8 + j * (block.h / rows);
        const tall = district === 'downtown' ? rng.range(46, 96) : district === 'industrial' ? rng.range(14, 26) : rng.range(10, 30);
        const building = {
          x: bx, y: by, w, h, district, tall,
          color: rng.pick(BUILDING_TONES[district]),
          roof: rng.pick(['#1c2133', '#262038', '#33241f', '#1f3038']),
          windows: rng.int(6, 18),
          windowSeed: rng.int(1, 99999),
          neon: district === 'downtown' && rng.chance(0.55) ? rng.pick(NEON_WORDS) : null,
          neonColor: rng.pick(['#ff2e88', '#22d3ee', '#ffd23e', '#2ee6a8', '#ff7847']),
          awning: district === 'marina' && rng.chance(0.6),
        };
        buildings.push(building);
        if (building.neon) signs.push({ x: bx + w / 2, y: by - 6, text: building.neon, color: building.neonColor });
      }
    }
    // Props crowd the block edges: crates and barrels at the docks, signs elsewhere.
    const propCount = rng.int(1, 4);
    for (let k = 0; k < propCount; k += 1) {
      props.push({
        x: rng.range(block.x + 6, block.x + block.w - 14),
        y: rng.range(block.y + 6, block.y + block.h - 14),
        kind: district === 'industrial' ? rng.pick(['crate', 'barrel', 'container']) : rng.pick(['crate', 'sign', 'bench', 'planter']),
        color: rng.pick(['#8a6d3b', '#5b7a99', '#99624a', '#4a7a5c']),
      });
    }
  }

  // Palms line the beach and residential streets; streetlights pool light on roads.
  for (let y = 120; y < WORLD.height - 80; y += 130) palms.push({ x: WATER_X - 96 + rng.range(-14, 14), y: y + rng.range(-20, 20), sway: rng.range(0, 6) });
  for (let i = 0; i < 90; i += 1) {
    const x = rng.range(80, WATER_X - 200); const y = rng.range(80, WORLD.height - 80);
    if (!isOnRoad(x, y) && districtAt(x, y) === 'residential') palms.push({ x, y, sway: rng.range(0, 6) });
  }
  for (const ax of AVENUES) for (let y = 110; y < WORLD.height - 60; y += 210) lights.push({ x: ax - ROAD_WIDTH / 2 - 8, y, on: true });
  for (const sy of STREETS) for (let x = 110; x < WATER_X - 60; x += 230) lights.push({ x, y: sy - ROAD_WIDTH / 2 - 8, on: true });

  // Marina: boardwalk, five docks reaching into the water, moored boats.
  const docks = [];
  const boats = [];
  for (let i = 0; i < 5; i += 1) {
    const dy = 420 + i * 430;
    docks.push({ x: WATER_X - 30, y: dy, w: 300, h: 26 });
    for (let b = 0; b < 3; b += 1) {
      boats.push({
        x: WATER_X + 60 + b * 78 + rng.range(-8, 8), y: dy + (b % 2 === 0 ? -34 : 44),
        angle: rng.range(-0.14, 0.14), color: rng.pick(['#f4f6f7', '#e74c3c', '#f7c948', '#2e86de', '#1abc9c']),
        name: rng.pick(['AZUL', 'CORAL', 'LUNA', 'ORO', 'MIRA', 'SOL']),
      });
    }
  }

  const landmarks = [
    { x: 1640, y: 940, name: 'HOTEL MAR — neon tower', district: 'downtown' },
    { x: 3020, y: 1250, name: 'VICE HARBOR MARINA', district: 'marina' },
    { x: 700, y: 1980, name: 'HARBOUR FREIGHT DEPOT', district: 'industrial' },
    { x: 1240, y: 1240, name: 'BANCO DEL MAR', district: 'downtown' },
    { x: 460, y: 460, name: 'PALM COURT', district: 'residential' },
  ];

  return { buildings, props, palms, lights, signs, docks, boats, landmarks };
}

/** Fourteen hiding spots spread across all districts, rooftops and dock ends included. */
export function packageSpots() {
  return [
    { x: 1652, y: 905 }, { x: 3050, y: 430 }, { x: 3180, y: 1290 }, { x: 700, y: 1940 },
    { x: 480, y: 420 }, { x: 2330, y: 420 }, { x: 2330, y: 2180 }, { x: 480, y: 2180 },
    { x: 1240, y: 1180 }, { x: 2050, y: 1240 }, { x: 900, y: 900 }, { x: 900, y: 1700 },
    { x: 2700, y: 1700 }, { x: 1500, y: 2330 },
  ].map((spot, i) => ({ id: i, x: spot.x, y: spot.y, taken: false, bob: i * 0.7 }));
}

/** Parked-car spots hug the kerbs of every avenue and street. */
export function parkedCarSpots(rng) {
  const spots = [];
  for (const ax of AVENUES) {
    for (let y = 150; y < WORLD.height - 120; y += 150) {
      if (rng.chance(0.42)) spots.push({ x: ax - 46, y: y + rng.range(-16, 16), angle: Math.PI / 2 });
      if (rng.chance(0.42)) spots.push({ x: ax + 46, y: y + rng.range(-16, 16), angle: -Math.PI / 2 });
    }
  }
  for (const sy of STREETS) {
    for (let x = 150; x < WATER_X - 200; x += 170) {
      if (rng.chance(0.3)) spots.push({ x: x + rng.range(-16, 16), y: sy - 46, angle: 0 });
      if (rng.chance(0.3)) spots.push({ x: x + rng.range(-16, 16), y: sy + 46, angle: Math.PI });
    }
  }
  return spots;
}

export { DISTRICTS };
