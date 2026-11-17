// All sound is synthesized live with WebAudio: no audio files, no network.
// An engine hum that follows the car's speed, a two-tone siren while the police
// are after the player, one-shot blips for gunfire, punches, pickups and cash,
// and a small original bass-and-hat loop that runs under the whole game.
// Nothing is created until the player's first gesture (browsers demand that),
// and every call is safe before then.

const MUSIC_BASS = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
const MUSIC_LEAD = [220, 0, 261.63, 0, 329.63, 0, 261.63, 196];
const BEAT = 0.24;

export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let musicOn = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);

      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      const engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();

      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function blip(frequency, duration, type, volume, slideTo) {
    if (!ensure()) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, volume, filterFrequency) {
    if (!ensure()) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  function musicNote(frequency, duration, type, volume) {
    if (!ensure() || frequency <= 0) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    /** Call from any user gesture so the browser lets sound start. */
    unlock() {
      ensure();
    },
    isMuted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    /** The engine hum: 0 when on foot, up to 1 at top speed. */
    engine(level) {
      if (!context || !engineOsc) return;
      engineOsc.frequency.value = 46 + level * 130;
      engineGain.gain.value = level * 0.09;
    },
    /** The two-tone siren, on while the police are chasing. */
    siren(on, time) {
      if (!context || !sirenOsc) return;
      sirenGain.gain.value = on ? 0.045 : 0;
      if (on) sirenOsc.frequency.value = Math.floor(time * 2.2) % 2 === 0 ? 660 : 880;
    },
    gunshot() {
      noiseBurst(0.16, 0.5, 1400);
    },
    punch() {
      noiseBurst(0.09, 0.35, 500);
      blip(120, 0.08, 'sine', 0.3, 60);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.25, 990);
    },
    cash() {
      blip(880, 0.1, 'sine', 0.22, 880);
      setTimeout(() => blip(1318, 0.14, 'sine', 0.2, 1318), 90);
    },
    busted() {
      blip(392, 0.3, 'triangle', 0.3, 196);
    },
    click() {
      blip(1200, 0.04, 'square', 0.12, 1200);
    },
    missionDone() {
      blip(523, 0.12, 'triangle', 0.25, 523);
      setTimeout(() => blip(784, 0.18, 'triangle', 0.25, 784), 110);
    },
    /** Advance the music loop; call every frame with the step length. */
    music(dt, playing) {
      if (!playing) {
        musicOn = false;
        return;
      }
      if (!musicOn) {
        musicOn = true;
        musicTimer = 0;
        musicStep = 0;
      }
      musicTimer += dt;
      while (musicTimer >= BEAT) {
        musicTimer -= BEAT;
        const bass = MUSIC_BASS[musicStep % MUSIC_BASS.length];
        const lead = MUSIC_LEAD[musicStep % MUSIC_LEAD.length];
        musicNote(bass, BEAT * 0.9, 'triangle', 0.16);
        if (musicStep % 2 === 0) musicNote(lead, BEAT * 0.8, 'square', 0.045);
        if (musicStep % 4 === 2) noiseBurst(0.03, 0.05, 6000);
        musicStep += 1;
      }
    },
  };
}
