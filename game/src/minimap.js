// The live minimap: the whole city shrunk into the bottom-right corner, with
// blips for the player, the mission target, the police, the taxi fare and the
// packages still to find. The player is a white arrow; everything else is a
// coloured dot the player learns to read at a glance.

import { PALETTE, VIEW, WORLD } from './config.js';

const MAP = { x: VIEW.width - 244, y: VIEW.height - 178, w: 230, h: 164 };

/** Where a world point lands on the minimap. */
export function minimapPoint(x, y) {
  return {
    x: MAP.x + (x / WORLD.width) * MAP.w,
    y: MAP.y + (y / WORLD.height) * MAP.h,
  };
}

/** Draw the minimap in the bottom-right corner of the view. */
export function drawMinimap(ctx, game) {
  const { city } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 22, 0.78)';
  ctx.fillRect(MAP.x - 6, MAP.y - 6, MAP.w + 12, MAP.h + 12);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(MAP.x - 6, MAP.y - 6, MAP.w + 12, MAP.h + 12);

  // Water and sand on the east edge.
  const sand = minimapPoint(city.sandX, 0);
  const water = minimapPoint(city.waterX, 0);
  ctx.fillStyle = PALETTE.sandDark;
  ctx.fillRect(sand.x, MAP.y, MAP.w - (sand.x - MAP.x), MAP.h);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(water.x, MAP.y, MAP.w - (water.x - MAP.x), MAP.h);

  // Roads.
  ctx.fillStyle = '#3a3f58';
  for (const road of city.roadsV) {
    const p = minimapPoint(road, 0);
    ctx.fillRect(p.x - 2, MAP.y, 4, MAP.h);
  }
  for (const road of city.roadsH) {
    const p = minimapPoint(0, road);
    ctx.fillRect(MAP.x, p.y - 2, MAP.w, 4);
  }

  // Packages still to find.
  ctx.fillStyle = PALETTE.package;
  for (const pack of game.packages) {
    if (pack.taken) continue;
    const p = minimapPoint(pack.x, pack.y);
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }

  // The taxi fare, when one is waiting.
  if (game.taxi.state !== 'idle') {
    const target = game.taxi.state === 'pickup' ? game.taxi.pickup : game.taxi.dest;
    if (target) {
      const p = minimapPoint(target.x, target.y);
      ctx.fillStyle = '#4fd0ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The mission target.
  if (game.mission.target) {
    const p = minimapPoint(game.mission.target.x, game.mission.target.y);
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#11141b';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', p.x, p.y + 3);
  }

  // Police cars, flashing.
  const blink = Math.floor(game.time * 4) % 2 === 0;
  ctx.fillStyle = blink ? '#ff3b30' : '#2f6df6';
  for (const car of game.cars) {
    if (!car.police) continue;
    const p = minimapPoint(car.x, car.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // The player: a white arrow pointing the way they face.
  const player = game.player;
  const p = minimapPoint(player.x, player.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VICE HARBOR', MAP.x, MAP.y - 10);
  ctx.restore();
}
