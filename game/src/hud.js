// The HUD: health bar and money top-left, wanted stars top-right, the current
// objective across the top, weapon and ammo bottom-left, and toast messages
// above the bottom edge. Everything is drawn in the 1280x720 logical view.

import { PALETTE, VIEW } from './config.js';
import { missionObjectiveText } from './missions.js';

const STAR = '★';

export function drawHud(ctx, game) {
  const player = game.player;
  ctx.textBaseline = 'alphabetic';

  // Top-left panel: health bar and money.
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(14, 14, 250, 64);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px ' + 'system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${Math.floor(player.money)}`, 28, 40);
  ctx.fillStyle = PALETTE.hudHealthBack;
  ctx.fillRect(28, 50, 180, 12);
  ctx.fillStyle = player.health > 30 ? PALETTE.hudHealth : '#ffb03d';
  ctx.fillRect(28, 50, 180 * Math.max(0, player.health / 100), 12);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('HEALTH', 214, 61);

  // Wanted stars, top-right.
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(VIEW.width - 214, 14, 200, 46);
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < player.wanted ? PALETTE.star : PALETTE.starEmpty;
    ctx.fillText(STAR, VIEW.width - 188 + i * 34, 46);
  }

  // Objective across the top, centred.
  const objective = missionObjectiveText(game);
  if (objective) {
    ctx.font = 'bold 17px system-ui, sans-serif';
    const width = ctx.measureText(objective).width;
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fillRect((VIEW.width - width) / 2 - 14, 14, width + 28, 34);
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'center';
    ctx.fillText(objective, VIEW.width / 2, 37);
  }

  // Weapon and ammo, bottom-left.
  const weaponName = player.weapon === 1 ? 'PISTOL' : 'FISTS';
  const ammoText = player.weapon === 1 ? `AMMO ${player.ammo}` : 'PUNCH [F]';
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(14, VIEW.height - 58, 220, 44);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(weaponName, 28, VIEW.height - 32);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(ammoText, 28, VIEW.height - 14);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.fillText('[1]/[2] switch', 150, VIEW.height - 32);

  // Mission progress and packages, bottom edge centre-left.
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(
    `Missions ${game.stats.missionsDone}/5   Packages ${game.stats.packages}/10   Fares ${game.stats.fares}`,
    250, VIEW.height - 24,
  );

  // Toast message, centred above the bottom edge.
  if (game.toast) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    const width = ctx.measureText(game.toast.text).width;
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fillRect((VIEW.width - width) / 2 - 14, VIEW.height - 108, width + 28, 34);
    ctx.fillStyle = PALETTE.hudMoney;
    ctx.textAlign = 'center';
    ctx.fillText(game.toast.text, VIEW.width / 2, VIEW.height - 84);
  }

  // A flashing "WASTED" / "BUSTED" banner is drawn by the renderer, not here.
}

/** The wanted level as text, for the screenshot scenes' screen-reader line. */
export function wantedText(game) {
  return game.player.wanted > 0 ? `${game.player.wanted} star${game.player.wanted > 1 ? 's' : ''} wanted` : 'clean';
}
