// Vice Harbor — the story campaign: eight missions for fixer Rio Vega, run by
// Mara from the marina. Each mission is data: an opening dialogue, a chain of
// objective stages (talk, go, drive-through checkpoints, collect, escape) and a
// cash reward. Mission 5 pays out the SMG; missions 6 and 8 are the heists and
// hand their stage logic to heists.js.

import { distance } from './geo.js';
import { startHeist, advanceHeistStage } from './heists.js';

export const MISSIONS = [
  {
    id: 'first-wheels', title: 'First Wheels', reward: 150,
    intro: [
      ['MARA', 'Rio Vega. Heard you drive like the tide owes you money.'],
      ['RIO', 'Depends who is paying, Mara.'],
      ['MARA', 'I am. Take any car on this street and bring it to the Palm Court garage. Clean, no heat.'],
    ],
    stages: [
      { type: 'steal', text: 'Steal a car' },
      { type: 'goto', x: 470, y: 470, text: 'Deliver the car to Palm Court garage' },
    ],
  },
  {
    id: 'package-run', title: 'Package Run', reward: 220,
    intro: [
      ['MARA', 'A courier dropped three parcels when the patrols rolled through.'],
      ['RIO', 'And you want them back before someone curious opens one.'],
      ['MARA', 'Three parcels, three rooftops and corners. Move, Rio.'],
    ],
    stages: [
      { type: 'collect', x: 900, y: 900, text: 'Recover parcel 1 of 3' },
      { type: 'collect', x: 2050, y: 1240, text: 'Recover parcel 2 of 3' },
      { type: 'collect', x: 1500, y: 2330, text: 'Recover parcel 3 of 3' },
      { type: 'goto', x: 3020, y: 1250, text: 'Bring the parcels back to the marina' },
    ],
  },
  {
    id: 'night-fare', title: 'Night Fare', reward: 260,
    intro: [
      ['MARA', 'A singer at Club Sol needs a quiet ride to the Hotel Mar. No questions in the car.'],
      ['RIO', 'A taxi job. Glamorous.'],
      ['MARA', 'Everything in this city is a taxi job until it is not. Pick her up downtown.'],
    ],
    stages: [
      { type: 'goto', x: 1640, y: 1010, text: 'Pick up the singer outside Club Sol' },
      { type: 'goto', x: 1640, y: 880, text: 'Drive the singer to the Hotel Mar entrance', needCar: true },
    ],
  },
  {
    id: 'dock-trouble', title: 'Dock Trouble', reward: 340,
    intro: [
      ['MARA', 'Harbour Freight is shaking down my boat crews at the depot.'],
      ['RIO', 'You want a message delivered.'],
      ['MARA', 'Loudly. Wreck their yard trucks, then lose any heat and report back.'],
    ],
    stages: [
      { type: 'goto', x: 700, y: 1980, text: 'Reach the Harbour Freight depot' },
      { type: 'wreck', count: 2, x: 700, y: 1980, text: 'Wreck the yard trucks (0/2)' },
      { type: 'escape', text: 'Lose the police heat' },
    ],
  },
  {
    id: 'armed-and-ready', title: 'Armed and Ready', reward: 400, weapon: 'smg',
    intro: [
      ['MARA', 'You have been running errands with a pistol and good intentions.'],
      ['RIO', 'The intentions are negotiable.'],
      ['MARA', 'Collect my supplier\'s gift at the industrial docks — an SMG. Then show me it works on the range targets: any three cars.'],
    ],
    stages: [
      { type: 'collect', x: 900, y: 1700, text: 'Collect the SMG at the docks' },
      { type: 'wreck', count: 3, x: 1240, y: 1240, text: 'Disable 3 cars anywhere (0/3)' },
      { type: 'goto', x: 3020, y: 1250, text: 'Return to Mara at the marina' },
    ],
  },
  {
    id: 'marina-heist', title: 'HEIST — Marina Warehouse', reward: 1500, heist: 'marina',
    intro: [
      ['MARA', 'Big night, Rio. The marina warehouse holds a customs seizure: cash, unmarked.'],
      ['RIO', 'Guards? Cameras?'],
      ['MARA', 'All of it. Get in, grab the loot before the timer dies, and be gone. The whole harbour will light up.'],
    ],
    stages: [
      { type: 'goto', x: 3020, y: 840, text: 'Reach the marina warehouse' },
      { type: 'heist-loot', text: 'GRAB THE LOOT — before the timer runs out' },
      { type: 'heist-getaway', x: 470, y: 470, text: 'GETAWAY — reach the Palm Court hideout' },
    ],
  },
  {
    id: 'hot-pursuit-blues', title: 'Hot Pursuit Blues', reward: 520,
    intro: [
      ['MARA', 'A street racer owes me and pays in checkpoints. Run his old circuit, fast.'],
      ['RIO', 'Through downtown traffic, against the clock. Sure.'],
      ['MARA', 'Ninety seconds, four corners. The city is your racetrack.'],
    ],
    stages: [
      { type: 'checkpoint', x: 2330, y: 420, timer: 90, text: 'Checkpoint 1 — north-east corner', needCar: true },
      { type: 'checkpoint', x: 2330, y: 2180, timer: 90, text: 'Checkpoint 2 — south-east', needCar: true },
      { type: 'checkpoint', x: 480, y: 2180, timer: 90, text: 'Checkpoint 3 — south-west', needCar: true },
      { type: 'checkpoint', x: 480, y: 420, timer: 90, text: 'Checkpoint 4 — finish at Palm Court', needCar: true },
    ],
  },
  {
    id: 'bank-heist', title: 'HEIST — Banco del Mar', reward: 3000, heist: 'bank',
    intro: [
      ['MARA', 'Last job, Rio. Banco del Mar, downtown. Vault cash, midday.'],
      ['RIO', 'You saved the suicide run for dessert.'],
      ['MARA', 'Grab it fast, drive it out, and do not stop for anything wearing a light bar.'],
    ],
    stages: [
      { type: 'goto', x: 1240, y: 1240, text: 'Reach Banco del Mar downtown' },
      { type: 'heist-loot', text: 'GRAB THE VAULT CASH — timer running' },
      { type: 'heist-getaway', x: 3020, y: 1250, text: 'GETAWAY — reach the marina hideout' },
    ],
  },
];

export function currentMission(G) {
  return MISSIONS[G.progress.missionIndex] || null;
}

export function startMission(G, mission) {
  G.activeMission = { def: mission, stage: 0, wrecked: 0, timer: mission.stages[0].timer || 0 };
  G.dialogue = { lines: mission.intro, index: 0, missionStart: true };
  G.screen = 'dialogue';
  if (mission.heist) startHeist(G, mission);
}

export function acceptNextMission(G) {
  const mission = currentMission(G);
  if (!mission) { G.hudFlash = 'STORY COMPLETE — free roam, fares and packages remain'; G.hudFlashTimer = 2.4; return; }
  startMission(G, mission);
}

export function objectiveText(G) {
  if (!G.activeMission) {
    if (G.taxi) return 'TAXI: ' + G.taxi.phase + ' — fare $' + G.taxi.fare;
    return currentMission(G) ? 'Find MARA at the marina (gold marker) to start: ' + currentMission(G).title : 'Free roam — taxi fares, packages and trouble await';
  }
  const stage = G.activeMission.def.stages[G.activeMission.stage];
  let text = G.activeMission.def.title + ': ' + stage.text;
  if (stage.type === 'wreck') text = G.activeMission.def.title + ': ' + stage.text.replace(/\(\d+\/\d+\)/, '(' + G.activeMission.wrecked + '/' + stage.count + ')');
  if (G.activeMission.timer > 0 && (stage.type === 'checkpoint' || stage.type === 'heist-loot')) text += ' — ' + Math.ceil(G.activeMission.timer) + 's';
  return text;
}

export function objectiveTarget(G) {
  if (G.taxi) return G.taxi.target;
  if (!G.activeMission) return { x: 3020, y: 1180 };
  const stage = G.activeMission.def.stages[G.activeMission.stage];
  if (stage.type === 'escape' || stage.type === 'steal') return null;
  return { x: stage.x, y: stage.y };
}

function completeMission(G) {
  const mission = G.activeMission.def;
  G.player.money += mission.reward;
  if (mission.weapon) {
    G.player.weapons[mission.weapon] = true;
    G.player.ammo[mission.weapon] = 240;
    G.player.weapon = mission.weapon;
    G.hudFlash = 'SMG UNLOCKED + $' + mission.reward;
  } else G.hudFlash = 'MISSION COMPLETE + $' + mission.reward;
  G.hudFlashTimer = 2.6;
  G.audio.playMissionComplete();
  G.audio.playCashRegister();
  G.progress.missionIndex += 1;
  G.activeMission = null;
  G.saveGame();
}

function advanceStage(G) {
  G.activeMission.stage += 1;
  G.audio.playPickup();
  const stage = G.activeMission.def.stages[G.activeMission.stage];
  if (!stage) { completeMission(G); return; }
  if (stage.timer) G.activeMission.timer = stage.timer;
  if (stage.type === 'heist-loot' || stage.type === 'heist-getaway') advanceHeistStage(G, stage.type);
}

export function updateMission(G, dt) {
  const am = G.activeMission;
  if (!am) return;
  const stage = am.def.stages[am.stage];
  if (!stage) { completeMission(G); return; }
  if (am.timer > 0 && (stage.type === 'checkpoint' || stage.type === 'heist-loot')) {
    am.timer -= dt;
    if (am.timer <= 0) {
      if (stage.type === 'heist-loot') { G.hudFlash = 'TOO SLOW — the loot is locked down. Try again.'; G.hudFlashTimer = 2.4; G.activeMission = null; G.heist = null; return; }
      am.timer = stage.timer;
      G.hudFlash = 'OUT OF TIME — checkpoint reset';
      G.hudFlashTimer = 1.6;
    }
  }
  const p = G.player;
  const near = stage.x !== undefined && distance(p.x, p.y, stage.x, stage.y) < (stage.type === 'heist-loot' ? 40 : 56);
  switch (stage.type) {
    case 'steal': if (p.car) advanceStage(G); break;
    case 'goto': case 'collect': case 'checkpoint':
      if (near && (!stage.needCar || p.car)) {
        if (stage.type === 'collect') G.effects.burst(stage.x, stage.y, 14, '#5df08a');
        advanceStage(G);
      }
      break;
    case 'wreck': if (am.wrecked >= stage.count) advanceStage(G); break;
    case 'escape': if (G.wanted <= 0) advanceStage(G); break;
    case 'heist-loot': if (near && G.heist && G.heist.lootGrabbed) advanceStage(G); else if (near && G.heist) advanceHeistStage(G, 'grab'); break;
    case 'heist-getaway': if (near) { advanceHeistStage(G, 'escaped'); advanceStage(G); } break;
    default: break;
  }
}

export function noteCarWrecked(G, car) {
  const am = G.activeMission;
  if (!am) return;
  const stage = am.def.stages[am.stage];
  if (stage && stage.type === 'wreck') { am.wrecked += 1; G.hudFlash = 'WRECKED ' + am.wrecked + '/' + stage.count; G.hudFlashTimer = 1; }
}
