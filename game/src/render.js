// Drawing only: the city, the cars, the people and the screens, painted from
// the game state. The camera shows a 1280x720 window into the city, scaled to
// fit the browser window; the HUD and minimap are drawn on top in that same
// 1280x720 space, so a screenshot always shows the whole interface.

import { PALETTE, VIEW, WORLD } from './config.js';
import { drawHud } from './hud.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function inView(cam, x, y, margin) {
  return x > cam.x - VIEW.width / 2 - margin && x < cam.x + VIEW.width / 2 + margin
    && y > cam.y - VIEW.height / 2 - margin && y < cam.y + VIEW.height / 2 + margin;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}:${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  function drawGround(game) {
    const { city } = game;
    ctx.fillStyle = PALETTE.block;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // The park: grass, paths and open green.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);
    ctx.fillStyle = '#2a4a30';
    ctx.fillRect(city.park.x + city.park.w / 2 - 10, city.park.y, 20, city.park.h);
    ctx.fillRect(city.park.x, city.park.y + city.park.h / 2 - 10, city.park.w, 20);
    // The beach and the water on the east edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(city.sandX, 0, city.waterX - city.sandX, WORLD.height);
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(city.sandX, 0, 8, WORLD.height);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(city.waterX, 0, WORLD.width - city.waterX, WORLD.height);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(city.waterX + 40, 0, WORLD.width - city.waterX - 40, WORLD.height);
    // Sidewalks, then roads, then the dashed centrelines.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const road of city.roadsV) ctx.fillRect(road - 62, 0, 124, WORLD.height);
    for (const road of city.roadsH) ctx.fillRect(0, road - 62, WORLD.width, 124);
    ctx.fillStyle = PALETTE.road;
    for (const road of city.roadsV) ctx.fillRect(road - 48, 0, 96, WORLD.height);
    for (const road of city.roadsH) ctx.fillRect(0, road - 48, WORLD.width, 96);
    ctx.fillStyle = PALETTE.roadLine;
    for (const road of city.roadsV) {
      for (let y = 40; y < WORLD.height; y += 80) {
        if (inView(game.camera, road, y, 60)) ctx.fillRect(road - 2, y, 4, 36);
      }
    }
    for (const road of city.roadsH) {
      for (let x = 40; x < WORLD.width; x += 80) {
        if (inView(game.camera, x, road, 60)) ctx.fillRect(x, road - 2, 36, 4);
      }
    }
  }

  function drawBuildings(game) {
    const { city } = game;
    for (const b of city.buildings) {
      if (!inView(game.camera, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Lit windows in a grid.
      const stepX = b.w / b.windowsX;
      const stepY = b.h / b.windowsY;
      for (let i = 0; i < b.windowsX; i += 1) {
        for (let j = 0; j < b.windowsY; j += 1) {
          const lit = ((i * 7 + j * 13 + b.x) % 5) < 3;
          ctx.fillStyle = lit ? '#ffd97a' : '#1a1e30';
          ctx.fillRect(b.x + 8 + i * stepX, b.y + 8 + j * stepY, Math.min(14, stepX - 10), Math.min(12, stepY - 10));
        }
      }
      // A neon sign on one edge, for the buildings that have one.
      if (b.neon) {
        ctx.save();
        ctx.shadowColor = b.neon;
        ctx.shadowBlur = 14;
        ctx.fillStyle = b.neon;
        ctx.fillRect(b.x + b.w / 2 - 22, b.y - 3, 44, 6);
        ctx.restore();
      }
    }
  }

  function drawPalmsAndLights(game) {
    const { city } = game;
    for (const palm of city.palms) {
      if (!inView(game.camera, palm.x, palm.y, 40)) continue;
      ctx.strokeStyle = PALETTE.palmTrunk;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x + 4, palm.y - 16);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.palmLeaf;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(palm.x + 4, palm.y - 16);
        ctx.lineTo(palm.x + 4 + Math.cos(a) * 13, palm.y - 16 + Math.sin(a) * 13);
        ctx.stroke();
      }
    }
    for (const light of city.lights) {
      if (!inView(game.camera, light.x, light.y, 30)) continue;
      ctx.fillStyle = PALETTE.lightPole;
      ctx.fillRect(light.x - 2, light.y - 2, 4, 4);
      ctx.fillStyle = PALETTE.lightGlow;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPickups(game) {
    const pulse = 0.6 + 0.4 * Math.sin(game.time * 4);
    for (const pack of game.packages) {
      if (pack.taken || !inView(game.camera, pack.x, pack.y, 30)) continue;
      ctx.save();
      ctx.translate(pack.x, pack.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.package;
      ctx.globalAlpha = pulse;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    for (const crate of game.ammoCrates) {
      if (crate.taken || !inView(game.camera, crate.x, crate.y, 30)) continue;
      ctx.fillStyle = '#1d7a3a';
      ctx.fillRect(crate.x - 10, crate.y - 10, 20, 20);
      ctx.fillStyle = '#39ff88';
      ctx.fillRect(crate.x - 7, crate.y - 2, 14, 4);
      ctx.fillRect(crate.x - 2, crate.y - 7, 4, 14);
    }
  }

  function drawMarker(game) {
    const target = game.mission.target;
    const taxiTarget = game.taxi.state === 'pickup' ? game.taxi.pickup : game.taxi.state === 'dropoff' ? game.taxi.dest : null;
    const markers = [];
    if (target) markers.push({ x: target.x, y: target.y, color: PALETTE.marker });
    if (taxiTarget) markers.push({ x: taxiTarget.x, y: taxiTarget.y, color: '#4fd0ff' });
    for (const marker of markers) {
      const bob = Math.sin(game.time * 3) * 6;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = marker.color;
      ctx.fillRect(marker.x - 4, marker.y - 70, 8, 70);
      ctx.restore();
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y + bob - 46, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 26 + Math.sin(game.time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCar(game, car) {
    if (!inView(game.camera, car.x, car.y, 60)) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Wheels.
    ctx.fillStyle = '#0c0e16';
    ctx.fillRect(-16, -13, 12, 5);
    ctx.fillRect(-16, 8, 12, 5);
    ctx.fillRect(6, -13, 12, 5);
    ctx.fillRect(6, 8, 12, 5);
    // Body.
    ctx.fillStyle = car.police ? PALETTE.policeWhite : car.color;
    roundRect(ctx, -23, -11, 46, 22, 6);
    ctx.fill();
    if (car.police) {
      ctx.fillStyle = PALETTE.policeBlue;
      ctx.fillRect(-6, -11, 12, 22);
    }
    // Windshield and roof.
    ctx.fillStyle = 'rgba(20, 28, 48, 0.85)';
    ctx.fillRect(8, -8, 8, 16);
    ctx.fillStyle = car.police ? '#c8cede' : 'rgba(255,255,255,0.16)';
    ctx.fillRect(-8, -8, 12, 16);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(21, -8, 3, 4);
    ctx.fillRect(21, 4, 3, 4);
    // Police light bar, flashing red and blue.
    if (car.police) {
      const blink = Math.floor(game.time * 5) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#2f6df6';
      ctx.fillRect(-4, -6, 8, 5);
      ctx.fillStyle = blink ? '#2f6df6' : '#ff3b30';
      ctx.fillRect(-4, 1, 8, 5);
    }
    ctx.restore();
    // The player's car gets a ring, so the eye finds it in traffic.
    if (game.player.inCar === car) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(car.x, car.y, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPed(game, ped) {
    if (!inView(game.camera, ped.x, ped.y, 30)) return;
    if (ped.state === 'dead') {
      ctx.fillStyle = '#3a2030';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 14, 8, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e05a5a';
      ctx.beginPath();
      ctx.arc(ped.x + 8, ped.y, 5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.pedSkin;
    ctx.beginPath();
    ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.isPassenger) {
      text('TAXI', ped.x, ped.y - 18, 11, '#4fd0ff', 'center', true);
    }
  }

  function drawPlayer(game) {
    const player = game.player;
    if (player.inCar) return;
    if (!inView(game.camera, player.x, player.y, 30)) return;
    ctx.fillStyle = PALETTE.playerDark;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.pedSkin;
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.angle) * 4, player.y + Math.sin(player.angle) * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    if (player.weapon === 1) {
      ctx.strokeStyle = '#22242f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(player.angle) * 10, player.y + Math.sin(player.angle) * 10);
      ctx.lineTo(player.x + Math.cos(player.angle) * 24, player.y + Math.sin(player.angle) * 24);
      ctx.stroke();
    }
  }

  function drawEffects(game) {
    for (const skid of game.fx.skids) {
      ctx.save();
      ctx.translate(skid.x, skid.y);
      ctx.rotate(skid.angle);
      ctx.globalAlpha = Math.min(0.5, skid.life / 2.4);
      ctx.fillStyle = '#0c0e16';
      ctx.fillRect(-14, -3, 28, 3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const p of game.fx.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /** An arrow at the screen edge pointing at an off-screen mission target. */
  function drawEdgeArrow(game) {
    const target = game.mission.target;
    if (!target) return;
    const cam = game.camera;
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    if (Math.abs(dx) < VIEW.width / 2 - 40 && Math.abs(dy) < VIEW.height / 2 - 40) return;
    const angle = Math.atan2(dy, dx);
    const edgeX = VIEW.width / 2 + Math.cos(angle) * (VIEW.width / 2 - 70);
    const edgeY = VIEW.height / 2 + Math.sin(angle) * (VIEW.height / 2 - 70);
    const dist = Math.round(Math.hypot(dx, dy));
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    text(`${target.label} ${dist}m`, edgeX, edgeY + 30, 14, PALETTE.marker, 'center', true);
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 30;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = accent || PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    text(title, VIEW.width / 2, y + 64, 46, PALETTE.hudText, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, y + 112 + i * 30, 19, PALETTE.hudMuted, 'center');
    }
    text(prompt, VIEW.width / 2, y + height - 26, 20, PALETTE.titleB, 'center', true);
  }

  function drawTitle(game, saveExists) {
    ctx.fillStyle = 'rgba(6, 8, 18, 0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('VICE HARBOR', VIEW.width / 2, 128, 84, PALETTE.titleA, 'center', true);
    text('A neon open-world crime story', VIEW.width / 2, 172, 24, PALETTE.titleB, 'center', true);
    const lines = [
      'Rio Vega is back in Vice Harbor — broke, wanted, and one job away from rich.',
      'Steal cars, outrun the police, run Mara\'s missions, and take the city.',
      '',
      'WASD / Arrows — move & drive      Shift — run      E — enter / exit car',
      'F — punch      Click — shoot pistol      1 / 2 — switch weapon',
      'M — mute      P / Esc — pause      Q — save & quit to title',
    ];
    const prompt = saveExists ? 'Press Enter to CONTINUE your story — or N for a new game' : 'Press Enter or click to START';
    drawPanel('', lines, prompt, PALETTE.titleA);
  }

  function drawDialogue(game) {
    const dialogue = game.dialogue;
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.index];
    const width = 860;
    const x = (VIEW.width - width) / 2;
    const y = VIEW.height - 170;
    ctx.fillStyle = PALETTE.dialogueBox;
    ctx.fillRect(x, y, width, 110);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, 110);
    text(dialogue.speaker, x + 24, y + 34, 20, PALETTE.titleB, 'left', true);
    text(line, x + 24, y + 70, 19, PALETTE.hudText, 'left');
    text('Enter / click to continue', x + width - 24, y + 92, 13, PALETTE.hudMuted, 'right');
  }

  /** Paint one frame: the world, then the HUD, the minimap and any screen panel. */
  function draw(game, screen, saveExists) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = game.camera;
    const shake = game.fx.shakeAmount();
    const shakeX = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
    const shakeY = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    ctx.translate(VIEW.width / 2 - cam.x, VIEW.height / 2 - cam.y);
    drawGround(game);
    drawBuildings(game);
    drawPalmsAndLights(game);
    drawPickups(game);
    drawMarker(game);
    for (const car of game.cars) drawCar(game, car);
    for (const ped of game.peds) drawPed(game, ped);
    drawPlayer(game);
    drawEffects(game);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawTitle(game, saveExists);
      return;
    }
    drawHud(ctx, game);
    drawMinimap(ctx, game);
    drawEdgeArrow(game);
    drawDialogue(game);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', [
        'The city waits for you.',
        '',
        'WASD drive & move · E enter car · F punch · Click shoot',
        `Progress saves when you press Q — money $${Math.floor(game.player.money)}, missions ${game.stats.missionsDone}/5`,
      ], 'P to resume · Q to save & quit to title', PALETTE.titleB);
    } else if (screen === SCREEN_OVER && game.over) {
      const busted = game.over.kind === 'busted';
      drawPanel(busted ? 'BUSTED!' : 'WASTED!', [
        busted ? 'The police caught you on foot.' : 'You ran out of health.',
        busted ? 'Bail: $150 — the hospital patches you up.' : 'Hospital bill: $200 — patched up and back on the streets.',
        '',
        `Money left: $${Math.floor(Math.max(0, game.player.money - (busted ? 150 : 200)))}`,
      ], 'Press Enter to get back out there', '#ff5d73');
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw,
    /** Canvas pixels to world coordinates, for aiming with the mouse. */
    toWorld(canvasX, canvasY, camera) {
      return {
        x: (canvasX - view.x) / view.scale + camera.x - VIEW.width / 2,
        y: (canvasY - view.y) / view.scale + camera.y - VIEW.height / 2,
      };
    },
  };
}
