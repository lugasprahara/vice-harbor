// Vice Harbor — all sound is synthesised live with WebAudio: no audio files exist.
// One module owns the context, the effects voices (gunshot, punch, siren, pickup,
// mission jingle, engine hum) and the radio sequencer that steps each station's
// note loop at its own tempo and waveform.

import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let radioTimer = 0;
  let radioStep = 0;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensureContext() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ensureContext()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, delay) {
    if (!ensureContext()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const gain = ctx.createGain(); gain.gain.value = vol;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t0);
  }

  function playGunshot() { noiseBurst(0.14, 0.5); tone(160, 0.1, 'square', 0.25, 40); }
  function playSmgShot() { noiseBurst(0.08, 0.35); tone(200, 0.06, 'square', 0.18, 60); }
  function playPunch() { noiseBurst(0.07, 0.3); tone(90, 0.09, 'sine', 0.3, 45); }
  function playPickup() { tone(660, 0.09, 'sine', 0.22); tone(990, 0.14, 'sine', 0.22, null, 0.08); }
  function playCashRegister() { tone(880, 0.07, 'triangle', 0.25); tone(1174, 0.07, 'triangle', 0.25, null, 0.07); tone(1568, 0.16, 'triangle', 0.25, null, 0.14); }
  function playMissionComplete() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.28, null, i * 0.11)); }
  function playBustedSting() { [392, 370, 349, 311].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.2, null, i * 0.16)); }
  function playCrash() { noiseBurst(0.25, 0.55); tone(70, 0.25, 'sine', 0.4, 30); }
  function playDoorSlam() { noiseBurst(0.06, 0.25); tone(120, 0.08, 'sine', 0.2, 60); }
  function playWantedBlip() { tone(1200, 0.08, 'square', 0.15); tone(1200, 0.08, 'square', 0.15, null, 0.12); }

  function setEngine(on, speedRatio) {
    if (!ensureContext()) return;
    if (on && !engineOsc) {
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain(); engineGain.gain.value = 0.05;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420;
      engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
    }
    if (engineOsc) engineOsc.frequency.value = 55 + Math.abs(speedRatio || 0) * 130;
    if (!on && engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; engineGain = null; }
  }

  function setSiren(on) {
    if (!ensureContext()) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0.045;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
    }
    if (sirenOsc) sirenOsc.frequency.value = 700 + Math.sin(performance.now() / 140) * 250;
    if (!on && sirenOsc) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; sirenGain = null; }
  }

  /** Step the current station's loop; called every frame while the player drives. */
  function updateRadio(dt, stationIndex) {
    if (stationIndex < 0 || !RADIO_STATIONS[stationIndex]) { radioTimer = 0; return; }
    if (!ctx || muted) return;
    const station = RADIO_STATIONS[stationIndex];
    radioTimer -= dt;
    if (radioTimer <= 0) {
      radioTimer = station.tempo;
      const semitone = station.notes[radioStep % station.notes.length];
      const freq = station.base * Math.pow(2, semitone / 12);
      tone(freq, station.tempo * 0.92, station.wave, 0.13);
      tone(freq / 2, station.tempo * 0.92, 'sine', 0.1);
      radioStep += 1;
    }
  }

  /** A soft menu loop for the title screen, reusing the Neonwave voice. */
  function playMenuLoopNote(step) {
    const station = RADIO_STATIONS[0];
    const freq = station.base * Math.pow(2, station.notes[step % station.notes.length] / 12);
    tone(freq, 0.5, 'triangle', 0.08);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return {
    ensureContext, playGunshot, playSmgShot, playPunch, playPickup, playCashRegister,
    playMissionComplete, playBustedSting, playCrash, playDoorSlam, playWantedBlip,
    setEngine, setSiren, updateRadio, playMenuLoopNote, toggleMute,
    isMuted: () => muted,
  };
}
