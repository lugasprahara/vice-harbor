// Vice Harbor — three staged heists: planning, entry, loot, getaway drive and payout.
function startHeist(state, heistId) {
  const h = heistById(heistId);
  if (!h || state.heist.active) return false;
  state.heist = { active: true, id: h.id, stage: 'planning', stageT: 5, loot: 0, planX: h.plan.x, planY: h.plan.y };
  state.banner = { title: 'HEIST — ' + h.name, sub: 'PLANNING: reach the planning spot', t: 4 };
  VH.dialogue.queue(state, h.lines);
  return true;
}
function heistById(id) {
  for (const h of VH.heists.list) if (h.id === id) return h;
  return VH.heists.list[0];
}
function heistObjectiveText(state) {
  const h = heistById(state.heist.id);
  const map = {
    planning: 'HEIST ' + h.name + ': PLANNING — reach the planning spot',
    entry: 'HEIST ' + h.name + ': ENTRY — get inside ' + h.targetName,
    loot: 'HEIST ' + h.name + ': LOOT — grab the ' + h.lootName,
    getaway: 'HEIST ' + h.name + ': GETAWAY — lose the heat, reach the safehouse',
    payout: 'HEIST ' + h.name + ': PAYOUT — collect at the safehouse'
  };
  return map[state.heist.stage] || '';
}
function heistTargetPoint(state) {
  const h = heistById(state.heist.id);
  if (state.heist.stage === 'planning') return { x: state.heist.planX, y: state.heist.planY };
  if (state.heist.stage === 'entry' || state.heist.stage === 'loot') return { x: h.target.x, y: h.target.y };
  return { x: h.safehouse.x, y: h.safehouse.y };
}
function advanceHeist(state) {
  const h = heistById(state.heist.id), hs = state.heist;
  if (hs.stage === 'planning') { hs.stage = 'entry'; state.banner = { title: 'ENTRY', sub: 'Get inside ' + h.targetName, t: 3 }; }
  else if (hs.stage === 'entry') { hs.stage = 'loot'; state.banner = { title: 'LOOT', sub: 'Grab the ' + h.lootName, t: 3 }; }
  else if (hs.stage === 'loot') {
    hs.stage = 'getaway'; hs.loot = h.payout;
    VH.wanted.addHeat(state, 4, h.name);
    state.banner = { title: 'GETAWAY!', sub: 'The alarm is screaming — GO!', t: 3.4 };
    VH.audio.cash();
  } else if (hs.stage === 'getaway') { hs.stage = 'payout'; state.banner = { title: 'PAYOUT', sub: 'Count it at the safehouse', t: 3 }; }
  else if (hs.stage === 'payout') {
    state.player.money += h.payout;
    state.stats.heistsDone++;
    state.heist.active = false;
    state.banner = { title: 'HEIST COMPLETE — ' + h.name, sub: '+$' + h.payout + ' split with the crew', t: 5 };
    VH.audio.cash();
  }
}
function updateHeist(state, dt) {
  if (!state.heist.active) return;
  const hs = state.heist;
  if (hs.stage === 'planning') {
    hs.stageT -= dt;
    const d = Math.hypot(state.player.x - hs.planX, state.player.y - hs.planY);
    if (d < 70 || hs.stageT <= 0 && d < 900) { if (d < 70) advanceHeist(state); }
    return;
  }
  const t = heistTargetPoint(state);
  const d = Math.hypot(state.player.x - t.x, state.player.y - t.y);
  const need = hs.stage === 'getaway' ? 85 : 65;
  if (d < need) advanceHeist(state);
}
function createHeistState() { return { active: false, id: null, stage: '', stageT: 0, loot: 0, planX: 0, planY: 0 }; }
window.VH = window.VH || {};
VH.heists = {
  create: createHeistState, start: startHeist, update: updateHeist,
  objectiveText: heistObjectiveText, targetPoint: heistTargetPoint, byId: heistById,
  list: [
    { id: 'h1', name: 'Banco Solmar Job', targetName: 'Banco Solmar', lootName: 'vault cash', payout: 900, plan: { x: 700, y: 700 }, target: { x: 520, y: 520 }, safehouse: { x: 2450, y: 1420 }, lines: [['Marisol Vega', 'Banco Solmar moves its cash at sunset. We plan at the cafe, we walk in smiling, we leave rich.', '#ffd76a']] },
    { id: 'h2', name: 'Grand Hotel Jewels', targetName: 'Solmar Grand Hotel', lootName: 'jewel case', payout: 1400, plan: { x: 900, y: 430 }, target: { x: 520, y: 560 }, safehouse: { x: 560, y: 1620 }, lines: [['Rico Santana', 'The hotel safe holds a queen\u2019s ransom in coral jewels, primo. In through the lobby, out through legend.', '#7dff8a']] },
    { id: 'h3', name: 'Harbour Gold Run', targetName: 'Ironhook Crane Yard', lootName: 'gold crate', payout: 2000, plan: { x: 1560, y: 1560 }, target: { x: 560, y: 1620 }, safehouse: { x: 950, y: 2430 }, lines: [['Captain Duarte', 'Gold crosses my docks once a year. This year it stops. Boat or wheels for the getaway — your call, captain.', '#35c4d8']] }
  ]
};
