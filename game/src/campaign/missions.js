// Vice Harbor — the 10-mission story campaign: Marisol Vega pulls deckhand Nico Reyes into the harbour's wars.
function missionByIndex(i) { return VH.missions.list[i] || null; }
function startMission(state, index) {
  const m = VH.missions.list[index];
  if (!m) return false;
  state.campaign.index = index; state.campaign.stage = 0; state.campaign.active = true;
  state.campaign.target = m.stages[0];
  state.banner = { title: 'MISSION ' + (index + 1) + ' — ' + m.title, sub: m.giver + ': ' + m.intro, t: 5 };
  VH.dialogue.queue(state, m.lines);
  if (m.setup) m.setup(state);
  return true;
}
function currentObjectiveText(state) {
  if (state.heist && state.heist.active) return VH.heists.objectiveText(state);
  if (state.taxi && state.taxi.active) return state.taxi.stage === 'pickup' ? 'TAXI: pick up ' + state.taxi.riderName : 'TAXI: drop off at ' + state.taxi.destName;
  if (state.smuggler && state.smuggler.active) return state.smuggler.stage === 'pickup' ? 'SMUGGLER RUN: collect cargo at the pier' : 'SMUGGLER RUN: deliver to ' + state.smuggler.dropName;
  if (state.campaign.active) {
    const m = VH.missions.list[state.campaign.index];
    const s = m.stages[state.campaign.stage];
    return m.title + ': ' + s.label;
  }
  return 'Free roam — find a gold marker to start work';
}
function currentTargetPoint(state) {
  if (state.heist && state.heist.active) return VH.heists.targetPoint(state);
  if (state.taxi && state.taxi.active) return state.taxi.stage === 'pickup' ? state.taxi.pickup : state.taxi.drop;
  if (state.smuggler && state.smuggler.active) return state.smuggler.stage === 'pickup' ? state.smuggler.pickup : state.smuggler.drop;
  if (state.campaign.active) { const s = VH.missions.list[state.campaign.index].stages[state.campaign.stage]; return { x: s.x, y: s.y }; }
  return null;
}
function completeMission(state, m) {
  state.campaign.active = false;
  state.campaign.done[m.id] = true;
  state.player.money += m.payout;
  state.stats.missionsDone++;
  VH.audio.cash();
  state.banner = { title: 'MISSION COMPLETE — ' + m.title, sub: '+$' + m.payout + ' · ' + m.outro, t: 5 };
  const next = state.campaign.index + 1;
  if (next < VH.missions.list.length) {
    setTimeout(function () { if (state.mode === 'playing') startMission(state, next); }, 4500);
  } else {
    state.banner = { title: 'CAMPAIGN COMPLETE', sub: 'Nico Reyes owns the harbour now. Free roam, heists and taxi work stay open.', t: 6 };
  }
}
function updateCampaign(state, dt) {
  if (!state.campaign.active) return;
  const m = VH.missions.list[state.campaign.index];
  const s = m.stages[state.campaign.stage];
  if (s.needMode && s.needMode !== state.player.mode && !(s.needMode === 'anyVehicle' && (state.player.mode === 'car' || state.player.mode === 'boat'))) return;
  const d = Math.hypot(state.player.x - s.x, state.player.y - s.y);
  if (d < (s.radius || 60)) {
    if (s.heat) VH.wanted.addHeat(state, s.heat, m.title);
    if (s.pay) { state.player.money += s.pay; VH.audio.cash(); VH.fx.floater(state.fx, state.player.x, state.player.y - 26, '+$' + s.pay, '#7dff8a'); }
    if (s.give) VH.weapons.give(state.loadout, s.give, s.give === 'smg' ? 90 : 14);
    if (s.line) VH.dialogue.queue(state, [s.line]);
    state.campaign.stage++;
    if (state.campaign.stage >= m.stages.length) completeMission(state, m);
    else state.campaign.target = m.stages[state.campaign.stage];
  }
}
function createCampaignState() { return { index: 0, stage: 0, active: false, done: {}, target: null }; }
const P = {
  marina: { x: 2450, y: 1420 }, boardwalk: { x: 1560, y: 560 }, downtown: { x: 520, y: 520 },
  docks: { x: 560, y: 1620 }, gardens: { x: 950, y: 2430 }, coralPier: { x: 2560, y: 620 },
  lighthouse: { x: 2900, y: 500 }, waterGate: { x: 2560, y: 2050 }, hotel: { x: 520, y: 560 }, crane: { x: 560, y: 1620 }
};
window.VH = window.VH || {};
VH.missions = {
  create: createCampaignState, start: startMission, update: updateCampaign,
  objectiveText: currentObjectiveText, targetPoint: currentTargetPoint, byIndex: missionByIndex,
  list: [
    { id: 'm1', title: 'First Light Freight', giver: 'Marisol Vega', payout: 150, intro: 'Move one crate before the harbour wakes.', outro: 'Marisol nods — you can be trusted with small things.', lines: [['Marisol Vega', 'Nico. One crate, no questions, Marina Azul before the gulls finish breakfast.', '#ffd76a'], ['Nico Reyes', 'Deckhand rates, smuggler hours. Fine — I am in.', '#9fd8ff']], stages: [{ x: P.marina.x, y: P.marina.y, label: 'Meet Marisol at Marina Azul Pier 1', radius: 70 }, { x: P.docks.x, y: P.docks.y, label: 'Deliver the crate to Ironhook Docks', radius: 70, line: ['Marisol Vega', 'Clean run. The dock crew owes us now.', '#ffd76a'] }] },
    { id: 'm2', title: 'Wheels for Rico', giver: 'Rico Santana', payout: 180, intro: 'Rico needs any sedan, fast.', outro: 'Rico pays cash and asks no questions about the alarm.', lines: [['Rico Santana', 'My cousin lands in an hour and my ride is impounded. Bring me a sedan, primo.', '#7dff8a']], stages: [{ x: P.downtown.x, y: P.downtown.y, label: 'Steal any car downtown (E near a car)', radius: 9999, heat: 0 }, { x: P.boardwalk.x, y: P.boardwalk.y, label: 'Bring a car to Rico at Coral Boardwalk', radius: 80, needMode: 'car' }] },
    { id: 'm3', title: 'Pier Pressure', giver: 'Marisol Vega', payout: 240, intro: 'A rival crew is loading at Coral Bay Pier.', outro: 'The rival crew thinks twice about Coral Bay now.', lines: [['Marisol Vega', 'Los Tiburones are loading on MY pier. Go make noise, take their strongbox.', '#ffd76a'], ['Nico Reyes', 'Noise I can do.', '#9fd8ff']], stages: [{ x: P.coralPier.x, y: P.coralPier.y, label: 'Reach Coral Bay Pier', radius: 75, give: 'pistol', line: ['Nico Reyes', 'Strongbox is heavier than it looks. And here come the owners…', '#9fd8ff'] }, { x: P.marina.x, y: P.marina.y, label: 'Escape back to Marina Azul', radius: 80, heat: 2 }] },
    { id: 'm4', title: 'The Smuggler Run', giver: 'Captain Duarte', payout: 320, intro: 'Pick up at Coral Bay, deliver to the Water Gate — by boat.', outro: 'Duarte calls you a natural-born smuggler.', lines: [['Captain Duarte', 'Land is watched, water is not. Take my Marlin, load at Coral Bay, run it to the Water Gate.', '#35c4d8']], stages: [{ x: P.coralPier.x, y: P.coralPier.y, label: 'Board a boat and reach the Coral Bay pickup', radius: 110, needMode: 'boat' }, { x: P.waterGate.x, y: P.waterGate.y, label: 'Deliver the cargo to Ironhook Water Gate by boat', radius: 110, needMode: 'boat', heat: 1 }] },
    { id: 'm5', title: 'Taxi for the Judge', giver: 'Rico Santana', payout: 200, intro: 'Judge Herrera must reach the courthouse unseen.', outro: 'The judge arrives unruffled and very grateful.', lines: [['Rico Santana', 'Drive the judge like a ghost — no sirens, no scratches.', '#7dff8a']], stages: [{ x: P.hotel.x, y: P.hotel.y, label: 'Pick up Judge Herrera at Solmar Grand Hotel', radius: 70 }, { x: P.downtown.x + 340, y: P.downtown.y + 340, label: 'Drive the judge downtown', radius: 80, needMode: 'car' }] },
    { id: 'm6', title: 'Crane Games', giver: 'Marisol Vega', payout: 300, intro: 'Sabotage the Ironhook crane before the auction.', outro: 'The crane sleeps. The auction is chaos. Marisol smiles.', lines: [['Marisol Vega', 'That crane sells my pier to the highest bidder tomorrow. Tonight, it breaks.', '#ffd76a']], stages: [{ x: P.crane.x, y: P.crane.y, label: 'Reach the Ironhook Crane Yard', radius: 85, give: 'shotgun', line: ['Nico Reyes', 'One crane, slightly used, mostly on fire.', '#9fd8ff'] }, { x: P.gardens.x, y: P.gardens.y, label: 'Lay low at Palmera Fountain', radius: 80, heat: 2 }] },
    { id: 'm7', title: 'Lighthouse Signal', giver: 'Captain Duarte', payout: 280, intro: 'Flash the old signal from Faro de Solmar.', outro: 'Three ships answer the signal. The fleet is gathering.', lines: [['Captain Duarte', 'The lighthouse keeper owes me. Climb the point, flash the signal, and our friends will come.', '#35c4d8']], stages: [{ x: P.lighthouse.x, y: P.lighthouse.y, label: 'Reach Faro de Solmar Lighthouse by boat', radius: 120, needMode: 'boat' }, { x: P.marina.x, y: P.marina.y, label: 'Return to Marina Azul', radius: 85 }] },
    { id: 'm8', title: 'Arms for the Harbour', giver: 'Marisol Vega', payout: 380, intro: 'A van of hardware is parked uptown. It should be ours.', outro: 'The harbour crews are armed — and loyal to Marisol.', lines: [['Marisol Vega', 'Los Tiburones bought guns. Rude. Take their van and bring the hardware home.', '#ffd76a']], stages: [{ x: P.downtown.x + 620, y: P.downtown.y + 120, label: 'Steal the weapons van uptown', radius: 80, give: 'smg' }, { x: P.docks.x, y: P.docks.y, label: 'Deliver the van to Ironhook Docks', radius: 85, needMode: 'car', heat: 2 }] },
    { id: 'm9', title: 'The Tide Turns', giver: 'Rico Santana', payout: 450, intro: 'Los Tiburones are hitting the boardwalk tonight.', outro: 'The boardwalk keeps its lights on. The tide has turned.', lines: [['Rico Santana', 'They are coming for the boardwalk, primo. Hold the corner with me.', '#7dff8a'], ['Nico Reyes', 'Then we hold it.', '#9fd8ff']], stages: [{ x: P.boardwalk.x, y: P.boardwalk.y, label: 'Defend the Coral Boardwalk corner', radius: 80, heat: 2, line: ['Rico Santana', 'You fight like the harbour itself, primo!', '#7dff8a'] }, { x: P.hotel.x, y: P.hotel.y, label: 'Report to Marisol at Solmar Grand Hotel', radius: 80 }] },
    { id: 'm10', title: 'King of the Harbour', giver: 'Marisol Vega', payout: 800, intro: 'One last run: the strongbox crosses the bay at dawn.', outro: 'Vice Harbor is yours. Marisol raises a glass at the clubhouse.', lines: [['Marisol Vega', 'Everything we built rides on one boat, Nico. Run the strongbox to the Water Gate and we own this harbour.', '#ffd76a'], ['Nico Reyes', 'Then let us go own a harbour.', '#9fd8ff']], stages: [{ x: P.coralPier.x, y: P.coralPier.y, label: 'Load the strongbox at Coral Bay Pier', radius: 110, needMode: 'boat' }, { x: P.waterGate.x, y: P.waterGate.y, label: 'Run the strongbox to the Water Gate', radius: 110, needMode: 'boat', heat: 3 }] }
  ]
};
