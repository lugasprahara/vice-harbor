// Vice Harbor — four synth radio stations (WebAudio) plus an off state; N cycles, HUD shows the station.
function createRadioState() { return { index: -1, nodes: null, step: 0, timer: null, playing: false }; }
function currentStation(radio) {
  if (radio.index < 0) return null;
  return VH.radio.stations[radio.index];
}
function cycleRadio(state) {
  const r = state.radio;
  r.index++;
  if (r.index >= VH.radio.stations.length) { stopRadio(state); r.index = -1; state.banner = { title: 'RADIO OFF', sub: '', t: 1.4 }; return; }
  playStation(state, r.index);
  const st = VH.radio.stations[r.index];
  state.banner = { title: 'RADIO — ' + st.name, sub: st.tagline, t: 2 };
}
function playStation(state, index) {
  stopRadio(state);
  const ac = VH.audio.getContext(), master = VH.audio.getMaster();
  if (!ac || !master) return;
  const st = VH.radio.stations[index];
  const gain = ac.createGain(); gain.gain.value = 0.11; gain.connect(master);
  const radio = state.radio;
  radio.nodes = { gain: gain };
  radio.playing = true; radio.step = 0;
  const beatMs = 60000 / st.bpm / 2;
  radio.timer = setInterval(function () {
    if (!radio.playing) return;
    const s = radio.step++;
    const note = st.bass[s % st.bass.length];
    if (note > 0) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = st.wave; o.frequency.value = note;
      g.gain.setValueAtTime(0.5, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + beatMs / 1000 * 0.9);
      o.connect(g); g.connect(gain); o.start(); o.stop(ac.currentTime + beatMs / 1000);
    }
    if (s % 4 === 0) {
      const chord = st.chords[Math.floor(s / 4) % st.chords.length];
      for (const f of chord) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.1, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + beatMs / 1000 * 3.6);
        o.connect(g); g.connect(gain); o.start(); o.stop(ac.currentTime + beatMs / 1000 * 3.6);
      }
    }
  }, beatMs);
}
function stopRadio(state) {
  const r = state.radio;
  if (r.timer) clearInterval(r.timer);
  r.timer = null; r.playing = false;
  if (r.nodes) { try { r.nodes.gain.disconnect(); } catch (e) {} r.nodes = null; }
}
function stationLabel(radio) {
  const st = currentStation(radio);
  return st ? st.name + ' · ' + st.genre : 'RADIO OFF';
}
window.VH = window.VH || {};
VH.radio = {
  create: createRadioState, cycle: cycleRadio, play: playStation, stop: stopRadio, current: currentStation, label: stationLabel,
  stations: [
    { id: 'sol', name: 'SOL 98.1', genre: 'Sunset House', tagline: 'Golden-hour house for the golden coast', bpm: 112, wave: 'sawtooth', bass: [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 73.4, 0, 65.4, 0], chords: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]] },
    { id: 'coral', name: 'CORAL WAVE', genre: 'Latin Pop', tagline: 'Pop latino para toda la bahia', bpm: 96, wave: 'square', bass: [65.4, 65.4, 0, 82.4, 0, 65.4, 98, 0, 73.4, 73.4, 0, 82.4, 0, 98, 82.4, 0], chords: [[261.6, 329.6, 392], [293.7, 370, 440], [246.9, 293.7, 370], [261.6, 329.6, 392]] },
    { id: 'faro', name: 'FARO ROCK', genre: 'Harbour Rock', tagline: 'Guitars as loud as the cranes', bpm: 124, wave: 'sawtooth', bass: [82.4, 82.4, 82.4, 0, 82.4, 0, 98, 110, 73.4, 73.4, 73.4, 0, 65.4, 0, 73.4, 0], chords: [[164.8, 207.7, 246.9], [146.8, 185, 220], [130.8, 164.8, 196], [164.8, 207.7, 246.9]] },
    { id: 'brisa', name: 'BRISA LO-FI', genre: 'Lo-Fi Beats', tagline: 'Slow beats for slow tides', bpm: 74, wave: 'sine', bass: [49, 0, 0, 61.7, 0, 0, 55, 0, 0, 0, 65.4, 0, 0, 49, 0, 0], chords: [[196, 246.9, 293.7, 370], [174.6, 220, 261.6, 329.6], [196, 233.1, 293.7], [164.8, 196, 246.9, 311.1]] }
  ]
};
