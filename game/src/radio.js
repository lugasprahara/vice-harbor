// Vice Harbor — the car radio: three synth stations (Neonwave, Palm Drive FM,
// Harbor Bass) sequenced by audio.js, plus OFF. R cycles stations while driving,
// the HUD shows the station name, and each station has its own waveform, tempo
// and note loop so switching is audible, not cosmetic.

import { RADIO_STATIONS } from './config.js';

export function cycleRadioStation(G) {
  // -1 is OFF; 0..2 are the stations; R steps OFF → 1 → 2 → 3 → OFF.
  G.radioIndex = G.radioIndex >= RADIO_STATIONS.length - 1 ? -1 : G.radioIndex + 1;
  G.hudFlash = currentStationName(G);
  G.hudFlashTimer = 1.4;
  G.audio.playPickup();
}

export function currentStationName(G) {
  if (!G.player.car) return '';
  if (G.radioIndex < 0) return 'RADIO OFF';
  const station = RADIO_STATIONS[G.radioIndex];
  return station ? '♪ ' + station.name : 'RADIO OFF';
}

export function updateRadio(G, dt) {
  if (G.player.car && G.screen === 'play') G.audio.updateRadio(dt, G.radioIndex);
}
