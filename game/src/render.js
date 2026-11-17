// Vice Harbor — the renderer. Paints the night city from the camera: water with
// coloured reflections, sand, roads with lane markings and crosswalks, sidewalk
// blocks, buildings with lit windows and neon signs, palms, props, streetlight
// pools, the marina docks and boats — then cars, pedestrians, Rio, effects, the
// HUD and minimap, and finally the screens (title, dialogue, pause, busted,
// wasted). Pure canvas, no images.

import { AVENUES, FONT, PALETTE, ROAD_WIDTH, STREETS, VIEW, WATER_X, WORLD } from './config.js';
import { clamp, distance } from './geo.js';
import { districtAt } from './world.js';
import { drawCar } from './vehicles.js';
import { drawPedestrian } from './pedestrians.js';
import { drawBullets } from './combat.js';
import { drawHeistLoot } from './heists.js';
import { drawPackages } from './activities.js';
import { drawHud } from './hud.js';
import { drawMinimap } from './minimap.js';
import { MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DIALOGUE = 'dialogue';
export const SCREEN_OVER = 'over';

function hashNoise(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function drawWater(time) {
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(WATER_X, 0, WORLD.width - WATER_X, WORLD.height);
    for (let i = 0; i < 46; i += 1) {
      const y = (i * 173 + Math.sin(time * 0.7 + i) * 8) % WORLD.height;
      const x = WATER_X + 30 + hashNoise(i * 3) * 380;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,46,136,0.20)' : 'rgba(34,211,238,0.16)';
      ctx.fillRect(x, y, 34 + hashNoise(i) * 46, 3);
    }
  }

  function drawGroundAndRoads() {
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // District ground tints.
    ctx.fillStyle = 'rgba(46,230,168,0.05)'; ctx.fillRect(0, 0, 1000, 1500);
    ctx.fillStyle = 'rgba(255,120,71,0.06)'; ctx.fillRect(0, 1500, 1500, 1100);
    ctx.fillStyle = 'rgba(255,46,136,0.05)'; ctx.fillRect(1000, 500, 1400, 1400);
    // Beach sand.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(WATER_X - 130, 0, 130, WORLD.height);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let y = 40; y < WORLD.height; y += 90) ctx.fillRect(WATER_X - 118, y, 60, 3);
    drawWater(G_time);
    // Sidewalk blocks under the buildings.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const b of G_ref.world.buildings) ctx.fillRect(b.x - 9, b.y - 9, b.w + 18, b.h + 18);
    // Roads.
    ctx.fillStyle = PALETTE.asphalt;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
    for (const sy of STREETS) ctx.fillRect(0, sy - ROAD_WIDTH / 2, WATER_X + 40, ROAD_WIDTH);
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const ax of AVENUES) for (let y = 16; y < WORLD.height; y += 52) { if (!STREETS.some((sy) => Math.abs(y - sy) < 74)) ctx.fillRect(ax - 2, y, 4, 26); }
    for (const sy of STREETS) for (let x = 16; x < WATER_X; x += 52) { if (!AVENUES.some((ax) => Math.abs(x - ax) < 74)) ctx.fillRect(x, sy - 2, 26, 4); }
    // Crosswalks at junctions.
    ctx.fillStyle = 'rgba(240,244,255,0.5)';
    for (const ax of AVENUES) for (const sy of STREETS) {
      for (let i = -2; i <= 2; i += 1) { ctx.fillRect(ax + i * 22 - 6, sy - ROAD_WIDTH / 2 + 4, 12, 5); ctx.fillRect(ax + i * 22 - 6, sy + ROAD_WIDTH / 2 - 9, 12, 5); }
    }
  }

  let G_ref = null;
  let G_time = 0;

  function drawBuildings() {
    for (const b of G_ref.world.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      // Lit windows: a deterministic scatter per building.
      const cols = Math.max(2, Math.floor(b.w / 17));
      const rows = Math.max(2, Math.floor(b.h / 15));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const n = hashNoise(b.windowSeed + i * 31 + j * 57);
          if (n > 0.52) {
            ctx.fillStyle = n > 0.86 ? 'rgba(34,211,238,0.85)' : 'rgba(255,214,120,0.85)';
            ctx.fillRect(b.x + 9 + i * 17, b.y + 9 + j * 15, 8, 6);
          }
        }
      }
      if (b.awning) { ctx.fillStyle = '#e74c3c'; ctx.fillRect(b.x + 4, b.y + b.h - 12, b.w - 8, 8); }
      if (b.neon) {
        ctx.save();
        ctx.shadowBlur = 16; ctx.shadowColor = b.neonColor;
        ctx.fillStyle = b.neonColor;
        ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText(b.neon, b.x + b.w / 2, b.y + 22);
        ctx.restore();
      }
    }
  }

  function drawPropsAndNature(time) {
    for (const prop of G_ref.world.props) {
      ctx.fillStyle = prop.color;
      if (prop.kind === 'container') ctx.fillRect(prop.x, prop.y, 34, 16);
      else if (prop.kind === 'barrel') { ctx.beginPath(); ctx.arc(prop.x, prop.y, 6, 0, 6.29); ctx.fill(); }
      else if (prop.kind === 'sign') { ctx.fillRect(prop.x, prop.y, 4, 14); ctx.fillStyle = '#ffd23e'; ctx.fillRect(prop.x - 5, prop.y - 6, 14, 8); }
      else if (prop.kind === 'bench') ctx.fillRect(prop.x, prop.y, 16, 5);
      else if (prop.kind === 'planter') { ctx.fillStyle = '#2d5a3d'; ctx.beginPath(); ctx.arc(prop.x, prop.y, 8, 0, 6.29); ctx.fill(); }
      else ctx.fillRect(prop.x, prop.y, 11, 11);
    }
    for (const palm of G_ref.world.palms) {
      ctx.strokeStyle = '#6e5643'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + 3, palm.y - 9); ctx.stroke();
      ctx.strokeStyle = '#2ee6a8'; ctx.lineWidth = 2.4;
      const sway = Math.sin(time * 1.3 + palm.sway) * 2;
      for (let k = 0; k < 5; k += 1) {
        const a = (k / 5) * Math.PI * 2 + palm.sway;
        ctx.beginPath(); ctx.moveTo(palm.x + 3, palm.y - 9);
        ctx.quadraticCurveTo(palm.x + 3 + Math.cos(a) * 9 + sway, palm.y - 14, palm.x + 3 + Math.cos(a) * 14 + sway, palm.y - 8 + Math.abs(Math.sin(a)) * 5);
        ctx.stroke();
      }
    }
    // Marina docks and boats.
    for (const dock of G_ref.world.docks) {
      ctx.fillStyle = '#7a5c38';
      ctx.fillRect(dock.x, dock.y, dock.w, dock.h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = dock.x + 12; x < dock.x + dock.w; x += 24) ctx.fillRect(x, dock.y + 2, 3, dock.h - 4);
    }
    for (const boat of G_ref.world.boats) {
      ctx.save();
      ctx.translate(boat.x, boat.y + Math.sin(time * 1.6 + boat.x) * 1.6);
      ctx.rotate(boat.angle);
      ctx.fillStyle = boat.color;
      ctx.beginPath(); ctx.roundRect(-22, -8, 44, 16, 7); ctx.fill();
      ctx.fillStyle = 'rgba(16,22,40,0.9)';
      ctx.fillRect(-4, -5, 14, 10);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(boat.name, -12, 2.5);
      ctx.restore();
    }
  }

  function drawLights() {
    for (const light of G_ref.world.lights) {
      const g = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, 62);
      g.addColorStop(0, 'rgba(255,226,150,0.20)');
      g.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(light.x - 62, light.y - 62, 124, 124);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(light.x - 1.6, light.y - 1.6, 3.2, 3.2);
    }
  }

  function drawMarker(target, time, color) {
    if (!target) return;
    const bob = Math.sin(time * 3.4) * 6;
    ctx.save();
    ctx.translate(target.x, target.y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 40);
    g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fillRect(-40, -40, 80, 80);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -26 + bob); ctx.lineTo(11, -8 + bob); ctx.lineTo(0, 2 + bob); ctx.lineTo(-11, -8 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 6, 16 + Math.sin(time * 3.4) * 3, 6, 0, 0, 6.29); ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(time) {
    const p = G_ref.player;
    if (p.car) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Aim indicator.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(p.aimAngle) * 22, Math.sin(p.aimAngle) * 22); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 6, 9, 4.4, 0, 0, 6.29); ctx.fill();
    const bob = p.moving ? Math.sin(time * 11) * 1.8 : 0;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.roundRect(-6, -7 + bob * 0.3, 12, 13, 4); ctx.fill();
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath(); ctx.arc(0, -11 + bob * 0.3, 5.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#11131c';
    ctx.fillRect(-5.6, -15 + bob * 0.3, 11.2, 4);
    if (p.weapon !== 'fists') {
      ctx.save();
      ctx.rotate(p.aimAngle);
      ctx.fillStyle = '#22262e'; ctx.fillRect(6, -1.6, p.weapon === 'smg' ? 15 : 11, 3.2);
      ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RIO', 0, -22);
    ctx.restore();
  }

  function drawWorldScene(time) {
    const G = G_ref;
    const cam = G.camera;
    const shake = G.effects.shakeOffset();
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.translate(-Math.round(cam.x + shake.x), -Math.round(cam.y + shake.y));
    drawGroundAndRoads();
    drawPropsAndNature(time);
    G.effects.drawUnder(ctx);
    drawBuildings();
    drawHeistLoot(ctx, G, time);
    drawPackages(ctx, G, time);
    // Objective marker beacon (main keeps G.shotTarget set to the live objective).
    drawMarker(G.shotTarget || undefined, time, '#ffd23e');
    if (G.taxi) drawMarker(G.taxi.target, time, '#ff6bde');
    for (const ped of G.peds) if (distance(ped.x, ped.y, cam.x + 640, cam.y + 360) < 780) drawPedestrian(ctx, ped, time);
    if (G.mara && distance(G.mara.x, G.mara.y, cam.x + 640, cam.y + 360) < 780) drawPedestrian(ctx, G.mara, time);
    for (const car of G.cars) if (distance(car.x, car.y, cam.x + 640, cam.y + 360) < 820) drawCar(ctx, car, time);
    drawPlayer(time);
    drawBullets(ctx, G);
    G.effects.drawOver(ctx);
    drawLights();
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,46,136,0.65)'; ctx.lineWidth = 1.6;
    ctx.strokeRect(x, y, w, h);
  }

  function drawTitle(G) {
    panel(348, 118, 584, 330);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 24; ctx.shadowColor = '#ff2e88';
    ctx.fillStyle = '#ff2e88';
    ctx.font = 'bold 62px ' + FONT;
    ctx.fillText('VICE HARBOR', 640, 196);
    ctx.shadowBlur = 14; ctx.shadowColor = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 17px ' + FONT;
    ctx.fillText('A NEON OPEN-WORLD CRIME STORY', 640, 228);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '14.5px ' + FONT;
    ctx.fillText('Rio Vega just hit Vice Harbor with empty pockets and a fast right foot.', 640, 262);
    ctx.fillText('Fixer Mara has work: eight jobs, two heists, one city that never sleeps.', 640, 284);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('WASD move · SHIFT run · F enter / exit car · MOUSE aim · CLICK punch / shoot', 640, 322);
    ctx.fillText('1/2/3 weapons · R radio · M mute · ESC pause · E talk / start mission', 640, 344);
    ctx.fillStyle = '#5df08a';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(G.hasSave ? '▶  NEW GAME        ▶  CONTINUE' : '▶  PRESS ENTER — NEW GAME', 640, 388);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 13.5px ' + FONT;
    ctx.fillText('8-MISSION CAMPAIGN · HEISTS · RADIO · POLICE CHASES · SAVES', 640, 424);
    ctx.restore();
  }

  function drawDialogue(G) {
    const d = G.dialogue;
    if (!d) return;
    const line = d.lines[d.index];
    if (!line) return;
    ctx.save();
    ctx.fillStyle = 'rgba(6,9,22,0.88)';
    ctx.beginPath(); ctx.roundRect(190, 528, 620, 118, 10); ctx.fill();
    ctx.strokeStyle = line[0] === 'MARA' ? '#ffd23e' : '#ff2e88'; ctx.lineWidth = 1.6;
    ctx.strokeRect(190, 528, 620, 118);
    ctx.fillStyle = line[0] === 'MARA' ? '#ffd23e' : '#ff6b9d';
    ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(line[0], 214, 560);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16.5px ' + FONT;
    wrapText(line[1], 214, 590, 580, 22);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT; ctx.textAlign = 'right';
    ctx.fillText('ENTER ▸', 790, 632);
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, yy); line = word; yy += lineHeight; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawPause(G) {
    ctx.fillStyle = 'rgba(4,6,16,0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(430, 130, 420, 430);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 34px ' + FONT;
    ctx.fillText('PAUSED', 640, 182);
    ctx.fillStyle = PALETTE.text; ctx.font = '16px ' + FONT;
    ctx.fillText('ESC — resume', 640, 224);
    ctx.fillText('S — save & quit to title', 640, 252);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px ' + FONT; ctx.fillStyle = PALETTE.gold;
    ctx.fillText('— MISSION LOG —', 470, 300);
    ctx.font = '13.5px ' + FONT;
    MISSIONS.forEach((m, i) => {
      const done = i < G.progress.missionIndex;
      const current = i === G.progress.missionIndex;
      ctx.fillStyle = done ? '#5df08a' : current ? '#ffe9a8' : PALETTE.muted;
      ctx.fillText((done ? '✓ ' : current ? '▸ ' : '· ') + (i + 1) + '. ' + m.title + '  $' + m.reward, 470, 328 + i * 22);
    });
    ctx.fillStyle = PALETTE.text; ctx.font = '14px ' + FONT;
    ctx.fillText('Hidden packages: ' + G.progress.packagesFound + ' / 14', 470, 516);
    ctx.fillText('Taxi fares done: ' + G.progress.faresDone, 470, 540);
    ctx.restore();
  }

  function drawOver(G) {
    ctx.fillStyle = 'rgba(4,2,8,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 26;
    if (G.overKind === 'busted') {
      ctx.shadowColor = '#2e7bff'; ctx.fillStyle = '#7db4ff';
      ctx.font = 'bold 72px ' + FONT;
      ctx.fillText('BUSTED', 640, 320);
      ctx.shadowBlur = 0; ctx.fillStyle = PALETTE.text; ctx.font = '17px ' + FONT;
      ctx.fillText('The harbour police walk Rio to a cell. Fine paid: $' + G.overFine + '.', 640, 362);
    } else {
      ctx.shadowColor = '#ff4757'; ctx.fillStyle = '#ff6b81';
      ctx.font = 'bold 72px ' + FONT;
      ctx.fillText('WASTED', 640, 320);
      ctx.shadowBlur = 0; ctx.fillStyle = PALETTE.text; ctx.font = '17px ' + FONT;
      ctx.fillText('Rio wakes up outside the marina clinic, lighter by $' + G.overFine + '.', 640, 362);
    }
    ctx.fillStyle = PALETTE.muted; ctx.font = '15px ' + FONT;
    ctx.fillText('Press ENTER to keep playing', 640, 404);
    ctx.restore();
  }

  function draw(G, screen, time) {
    G_ref = G;
    G_time = time;
    drawWorldScene(time);
    if (screen === SCREEN_PLAY || screen === SCREEN_DIALOGUE || screen === SCREEN_PAUSED) {
      drawHud(ctx, G, time);
      drawMinimap(ctx, G, time);
    }
    if (screen === SCREEN_TITLE) drawTitle(G);
    if (screen === SCREEN_DIALOGUE) drawDialogue(G);
    if (screen === SCREEN_PAUSED) drawPause(G);
    if (screen === SCREEN_OVER) { drawHud(ctx, G, time); drawOver(G); }
    // Mouse crosshair while playing on foot.
    if (screen === SCREEN_PLAY && !G.player.car) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(G.input.mouseX, G.input.mouseY, 9, 0, 6.29);
      ctx.moveTo(G.input.mouseX - 14, G.input.mouseY); ctx.lineTo(G.input.mouseX - 4, G.input.mouseY);
      ctx.moveTo(G.input.mouseX + 4, G.input.mouseY); ctx.lineTo(G.input.mouseX + 14, G.input.mouseY);
      ctx.stroke();
    }
  }

  return { draw };
}
