// Vice Harbor — tiny WebAudio synth: engine hum, sirens, shots, pickups, UI blips. No audio files.
function createAudioEngine() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noiseBurst(dur, vol) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(g); g.connect(master); src.start();
  }
  return {
    ensure: ensure,
    blip: function () { tone(880, 0.07, 'square', 0.08); },
    pickup: function () { tone(660, 0.09, 'sine', 0.16); setTimeout(function () { tone(990, 0.12, 'sine', 0.16); }, 70); },
    cash: function () { tone(1200, 0.06, 'triangle', 0.14); setTimeout(function () { tone(1600, 0.1, 'triangle', 0.12); }, 60); },
    shot: function () { noiseBurst(0.09, 0.25); tone(180, 0.08, 'sawtooth', 0.1, 60); },
    shotgun: function () { noiseBurst(0.2, 0.35); tone(120, 0.16, 'sawtooth', 0.14, 40); },
    hit: function () { tone(140, 0.1, 'square', 0.14, 70); },
    crash: function () { noiseBurst(0.25, 0.3); tone(90, 0.25, 'triangle', 0.16, 45); },
    sirenStart: function () {
      if (!ensure() || sirenOsc) return;
      sirenOsc = ctx.createOscillator(); sirenGain = ctx.createGain();
      sirenOsc.type = 'triangle'; sirenGain.gain.value = 0.035;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.7; lg.gain.value = 180; lfo.connect(lg); lg.connect(sirenOsc.frequency);
      sirenOsc.frequency.value = 760; sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start(); lfo.start(); sirenOsc._lfo = lfo;
    },
    sirenStop: function () { if (sirenOsc) { try { sirenOsc.stop(); sirenOsc._lfo.stop(); } catch (e) {} sirenOsc = null; } },
    engineSet: function (speedRatio, on) {
      if (!ensure()) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.0;
        engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      }
      if (engineOsc) {
        engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 130;
        engineGain.gain.value = on ? 0.045 + Math.abs(speedRatio) * 0.05 : 0;
        if (!on) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; }
      }
    },
    getContext: function () { return ensure(); },
    getMaster: function () { ensure(); return master; }
  };
}
window.VH = window.VH || {};
VH.audio = createAudioEngine();
