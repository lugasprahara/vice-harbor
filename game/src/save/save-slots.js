// Vice Harbor — save and load: three localStorage slots holding the whole run, plus an autosave.
function saveToSlot(state, slot) {
  const data = serializeRun(state);
  try { localStorage.setItem('viceharbor-v3-slot-' + slot, JSON.stringify(data)); } catch (e) { return false; }
  state.banner = { title: 'SAVED — SLOT ' + slot, sub: 'Progress stored on this device.', t: 2 };
  return true;
}
function loadFromSlot(state, slot) {
  let raw = null;
  try { raw = localStorage.getItem('viceharbor-v3-slot-' + slot); } catch (e) { return false; }
  if (!raw) { state.banner = { title: 'SLOT ' + slot + ' IS EMPTY', sub: 'Save with F5 / F6 / F7 first.', t: 2 }; return false; }
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { return false; }
  applySaveData(state, data);
  state.banner = { title: 'LOADED — SLOT ' + slot, sub: 'Welcome back to Vice Harbor.', t: 2.4 };
  return true;
}
function serializeRun(state) {
  return {
    v: 3,
    money: state.player.money, hp: state.player.hp,
    px: state.player.x, py: state.player.y,
    missionsDone: state.campaign.done, missionIndex: state.campaign.index,
    packagesFound: state.packages.map(function (p) { return p.found; }),
    owned: state.loadout.owned, ammo: state.loadout.ammo,
    stats: state.stats, radioIndex: state.radio.index
  };
}
function applySaveData(state, data) {
  if (!data || data.v !== 3) return;
  state.player.money = data.money || 0;
  state.player.hp = data.hp || 100;
  state.player.x = data.px || 1560; state.player.y = data.py || 760;
  state.player.mode = 'foot'; state.player.car = null; state.player.boat = null;
  state.campaign.done = data.missionsDone || {};
  state.campaign.index = data.missionIndex || 0;
  if (Array.isArray(data.packagesFound)) state.packages.forEach(function (p, i) { p.found = !!data.packagesFound[i]; });
  state.stats = Object.assign(state.stats, data.stats || {});
  state.loadout.owned = Object.assign({ fists: true, pistol: true }, data.owned || {});
  state.loadout.ammo = Object.assign({ pistol: 48, smg: 0, shotgun: 0 }, data.ammo || {});
  state.wanted = VH.wanted.create();
  state.policeCars = []; state.roadblocks = [];
}
function slotSummary(slot) {
  let raw = null;
  try { raw = localStorage.getItem('viceharbor-v3-slot-' + slot); } catch (e) { return 'empty'; }
  if (!raw) return 'empty';
  try {
    const d = JSON.parse(raw);
    const done = Object.keys(d.missionsDone || {}).length;
    return '$' + (d.money || 0) + ' · ' + done + '/10 missions';
  } catch (e) { return 'empty'; }
}
function autosaveRun(state) { try { localStorage.setItem('viceharbor-v3-autosave', JSON.stringify(serializeRun(state))); } catch (e) {} }
window.VH = window.VH || {};
VH.save = { toSlot: saveToSlot, fromSlot: loadFromSlot, serialize: serializeRun, apply: applySaveData, summary: slotSummary, autosave: autosaveRun };
