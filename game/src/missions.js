// The story: five missions from Mara, the fixer who runs Vice Harbor's
// backstreets. Each mission is a small chain of stages — go somewhere, talk
// to someone, steal a car, hold a spot — with dialogue, a map marker, an
// objective line and a cash reward at the end.

import { MISSION_REWARDS } from './config.js';
import { distance } from './geo.js';
import { addWanted } from './police.js';
import { setToast } from './world.js';

export const MISSION_COUNT = 5;

const MISSIONS = [
  {
    title: 'Welcome to Vice Harbor',
    giver: 'Mara',
    intro: [
      'Mara: Rio. You picked the right city to disappear in.',
      'Mara: Meet me down at the marina. I have work for steady hands.',
    ],
    stages: [
      { kind: 'talk', target: 'marina', label: 'the marina', text: 'Meet Mara at the marina', lines: [
        'Mara: The crew needs a driver who keeps their head. That is you now.',
        'Mara: First rule: the hideout is home. Learn the way there.',
      ] },
      { kind: 'goto', target: 'hideout', label: 'the hideout', text: 'Drive to the hideout' },
    ],
    outro: [
      'Mara: Good. You know the streets now. There will be more work.',
    ],
  },
  {
    title: 'Hot Wheels',
    giver: 'Mara',
    intro: [
      'Mara: A client wants a clean ride, no questions. Take any car off the street.',
      'Mara: Bring it to the garage on the south side. Quick and quiet.',
    ],
    stages: [
      { kind: 'steal', text: 'Steal a car (press E beside one)' },
      { kind: 'goto', target: 'garage', label: 'the garage', text: 'Deliver the car to the garage' },
    ],
    outro: [
      'Mara: Clean handover. The client is happy, and so is my cut.',
    ],
  },
  {
    title: 'Package Run',
    giver: 'Mara',
    intro: [
      'Mara: A package is waiting at the docks. Do not open it. Do not drop it.',
      'Mara: Take it to the plaza. Somebody there is paying good money.',
    ],
    stages: [
      { kind: 'pickup', target: 'docks', label: 'the docks', text: 'Pick up the package at the docks' },
      { kind: 'goto', target: 'plaza', label: 'the plaza', text: 'Deliver the package to the plaza' },
    ],
    outro: [
      'Mara: Delivered, no fuss. You are building a name, Rio.',
    ],
  },
  {
    title: 'Heat',
    giver: 'Dario',
    intro: [
      'Dario: Mara thinks she owns you. Let me show you what heat feels like.',
      'Dario: My friends in blue are on their way. Lose them — if you can.',
    ],
    stages: [
      { kind: 'escape', target: 'hideout', label: 'the hideout', text: 'Lose the police, then reach the hideout' },
    ],
    outro: [
      'Mara: Dario is testing you. You passed. He will not forget that either.',
    ],
  },
  {
    title: 'The Big Score',
    giver: 'Mara',
    intro: [
      'Mara: One last job, then we are both rich. The bank on Harbor Row.',
      'Mara: Hold the front for a few seconds while the door opens, then run.',
    ],
    stages: [
      { kind: 'hold', target: 'bank', label: 'the bank', text: 'Hold the bank front until the door opens', duration: 3 },
      { kind: 'goto', target: 'hideout', label: 'the hideout', text: 'Escape to the hideout with the cash' },
    ],
    outro: [
      'Mara: That is the biggest score this city has seen in years.',
      'Mara: Vice Harbor is yours now, Rio. Spend it well.',
    ],
  },
];

function stageTarget(game, stage) {
  if (!stage.target) return null;
  const landmark = game.city.landmarks[stage.target];
  return { x: landmark.x, y: landmark.y, label: stage.label };
}

/** Open a dialogue box; the game waits until the player clicks through it. */
export function openDialogue(game, speaker, lines, onDone) {
  game.dialogue = { speaker, lines, index: 0, onDone: onDone ?? null };
}

/** Start mission `index` (0-based); past the last one, the story is complete. */
export function startMission(game, index) {
  if (index >= MISSIONS.length) {
    game.mission.allDone = true;
    game.mission.done = true;
    game.mission.target = null;
    return;
  }
  const def = MISSIONS[index];
  game.mission.index = index;
  game.mission.stage = 0;
  game.mission.timer = 0;
  game.mission.done = false;
  game.mission.def = def;
  // Each game gets its own copy of the stages: flags like `talked` and
  // `started` are per-game state, never shared between games.
  game.mission.stages = def.stages.map((stage) => ({ ...stage }));
  game.mission.target = stageTarget(game, game.mission.stages[0]);
  openDialogue(game, def.giver, def.intro, null);
}

function advanceStage(game) {
  const mission = game.mission;
  mission.stage += 1;
  mission.timer = 0;
  const def = mission.def;
  if (mission.stage >= def.stages.length) {
    completeMission(game);
    return;
  }
  const stage = mission.stages[mission.stage];
  mission.target = stageTarget(game, stage);
  if (stage.kind === 'steal') setToast(game, 'Steal any car — press E beside one.');
  if (stage.kind === 'pickup') setToast(game, 'Pick up the package.');
}

function completeMission(game) {
  const mission = game.mission;
  const reward = MISSION_REWARDS[mission.index];
  game.player.money += reward;
  game.stats.earned += reward;
  game.stats.missionsDone += 1;
  game.audio.missionDone();
  game.audio.cash();
  setToast(game, `Mission complete! +$${reward}`);
  const next = mission.index + 1;
  openDialogue(game, mission.def.giver, mission.def.outro, () => {
    if (next >= MISSIONS.length) {
      game.mission.allDone = true;
      game.mission.done = true;
      game.mission.target = null;
      setToast(game, 'Story complete — Vice Harbor is yours. Free roam!');
    } else {
      startMission(game, next);
    }
  });
}

/** Advance the mission chain one step. */
export function stepMissions(game, dt) {
  const mission = game.mission;
  if (mission.allDone || game.dialogue || game.over) return;
  const def = mission.def;
  if (!def) return;
  const stage = mission.stages[mission.stage];
  if (!stage) return;
  const player = game.player;
  const target = mission.target;

  if (stage.kind === 'goto') {
    if (target && distance(player.x, player.y, target.x, target.y) < 60) advanceStage(game);
  } else if (stage.kind === 'talk') {
    if (target && distance(player.x, player.y, target.x, target.y) < 60 && !stage.talked) {
      stage.talked = true;
      openDialogue(game, def.giver, stage.lines, () => advanceStage(game));
    }
  } else if (stage.kind === 'steal') {
    if (player.inCar) advanceStage(game);
  } else if (stage.kind === 'pickup') {
    if (target && distance(player.x, player.y, target.x, target.y) < 50) {
      setToast(game, 'Package secured. Deliver it.');
      advanceStage(game);
    }
  } else if (stage.kind === 'hold') {
    if (target && distance(player.x, player.y, target.x, target.y) < 60) {
      mission.timer += dt;
      if (mission.timer >= (stage.duration ?? 3)) {
        addWanted(game, 1);
        setToast(game, 'The alarm is ringing — run!');
        advanceStage(game);
      }
    } else {
      mission.timer = 0;
    }
  } else if (stage.kind === 'escape') {
    if (!stage.started) {
      stage.started = true;
      addWanted(game, 2);
      setToast(game, 'The police are on you! Lose them and reach the hideout.');
    }
    if (target && distance(player.x, player.y, target.x, target.y) < 60) {
      player.wanted = 0;
      game.wantedHeat = 0;
      setToast(game, 'You shook them off.');
      advanceStage(game);
    }
  }
}

/** The objective line the HUD shows. */
export function missionObjectiveText(game) {
  const mission = game.mission;
  if (mission.allDone) return 'Story complete — free roam Vice Harbor!';
  const def = mission.def;
  if (!def) return '';
  const stage = mission.stages[mission.stage];
  if (!stage) return def.title;
  return `${def.title} — ${stage.text}`;
}
