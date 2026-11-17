// Saving and loading through localStorage: money, mission progress, the
// collectible packages already found, and where the player stood. Nothing else
// leaves the browser; a save from another visit simply is not there.

import { SAVE_KEY } from './config.js';

/** The saved shape, or null when this browser has never saved. */
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save !== 'object' || save === null) return null;
    return save;
  } catch {
    return null;
  }
}

/** Write the parts of the game that carry between visits. */
export function saveGame(game) {
  try {
    const save = {
      money: Math.floor(game.player.money),
      health: Math.floor(game.player.health),
      missionIndex: game.mission.index,
      packagesTaken: game.packages.filter((pack) => pack.taken).map((pack) => pack.id),
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Forget the save (used after the final mission, for a fresh run). */
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off (private windows): there is simply nothing to clear.
  }
}
