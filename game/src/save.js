// Vice Harbor — save games in localStorage: money, health, mission progress,
// packages found, taxi fares done, weapons and ammo, and where Rio was standing.
// Named, versioned and defensive: a corrupt or missing save simply means no
// Continue button on the title screen.

import { SAVE_KEY } from './config.js';

export function saveToSlot(G) {
  const data = {
    version: 2,
    money: G.player.money,
    health: G.player.health,
    missionIndex: G.progress.missionIndex,
    packagesFound: G.progress.packagesFound,
    packageIds: G.packages.filter((p) => p.taken).map((p) => p.id),
    faresDone: G.progress.faresDone,
    weapons: G.player.weapons,
    ammo: G.player.ammo,
    x: Math.round(G.player.x),
    y: Math.round(G.player.y),
  };
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}

export function loadFromSlot() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2 || typeof data.money !== 'number') return null;
    return data;
  } catch { return null; }
}

export function hasSave() { return loadFromSlot() !== null; }

export function applySave(G, data) {
  G.player.money = data.money;
  G.player.health = Math.max(30, data.health || 100);
  G.progress.missionIndex = data.missionIndex || 0;
  G.progress.packagesFound = data.packagesFound || 0;
  G.progress.faresDone = data.faresDone || 0;
  G.player.weapons = data.weapons || { pistol: true, smg: false };
  G.player.ammo = data.ammo || { pistol: 60, smg: 0 };
  for (const id of data.packageIds || []) { const pack = G.packages[id]; if (pack) pack.taken = true; }
  if (data.x && data.y) { G.player.x = data.x; G.player.y = data.y; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
