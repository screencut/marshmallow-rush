/**
 * AudioManager - Procedural Web Audio API sound effects and background music
 * Synthesizes all cute Candyland audio without external file dependencies.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isMusicPlaying = false;
    this.bgmTimer = null;
    this.stepCounter = 0;
    this.tempo = 128; // BPM
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C major pentatonic/heptatonic
    
    // Music notes sequence (Candyland bouncy playful loop)
    this.melody = [
      { note: 4, dur: 0.25 }, { note: 2, dur: 0.25 }, { note: 4, dur: 0.25 }, { note: 5, dur: 0.25 },
      { note: 7, dur: 0.5 },  { note: 5, dur: 0.5 },
      { note: 4, dur: 0.25 }, { note: 3, dur: 0.25 }, { note: 2, dur: 0.25 }, { note: 1, dur: 0.25 },
      { note: 2, dur: 0.5 },  { note: 0, dur: 0.5 },
      { note: 2, dur: 0.25 }, { note: 4, dur: 0.25 }, { note: 5, dur: 0.25 }, { note: 7, dur: 0.25 },
      { note: 6, dur: 0.5 },  { note: 4, dur: 0.5 },
      { note: 5, dur: 0.25 }, { note: 4, dur: 0.25 }, { note: 2, dur: 0.25 }, { note: 1, dur: 0.25 },
      { note: 0, dur: 1.0 }
    ];
    this.melodyIdx = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  startMusic() {
    this.ensureContext();
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;
    this.melodyIdx = 0;
    this.scheduleNextNote();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  scheduleNextNote() {
    if (!this.isMusicPlaying || !this.ctx) return;

    const item = this.melody[this.melodyIdx];
    const freq = this.scale[item.note] || 261.63;
    const durSeconds = (60 / this.tempo) * item.dur * 2.5;

    // Play melody note (cute marimba/music-box chime)
    this.playTone(freq, durSeconds * 0.8, 'sine', this.musicGain, 0.15, true);

    // Play bouncy bass on every beat
    if (this.melodyIdx % 2 === 0) {
      const bassFreq = (this.scale[item.note % 3] || 130) * 0.5;
      this.playBass(bassFreq, durSeconds * 1.2, this.musicGain, 0.18);
    }

    // Play soft percussion tap
    if (this.melodyIdx % 4 === 2) {
      this.playSnare(this.musicGain, 0.04);
    }

    this.melodyIdx = (this.melodyIdx + 1) % this.melody.length;
    this.bgmTimer = setTimeout(() => {
      this.scheduleNextNote();
    }, durSeconds * 1000);
  }

  playTone(freq, duration, type = 'sine', targetGain = null, volume = 0.2, harmonic = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const dest = targetGain || this.sfxGain;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    // Cute envelope: quick attack, smooth exponential decay
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + duration);

    // Optional warm second harmonic for candy bell resonance
    if (harmonic) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t);
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.exponentialRampToValueAtTime(volume * 0.4, t + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + duration * 0.6);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(t);
      osc2.stop(t + duration * 0.6);
    }
  }

  playBass(freq, duration, targetGain = null, volume = 0.2) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const dest = targetGain || this.sfxGain;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + duration);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + duration);
  }

  playSnare(targetGain = null, volume = 0.05) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    noise.connect(gain);
    gain.connect(targetGain || this.sfxGain);

    noise.start(t);
  }

  // Sound Effects

  playJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Cute ascending cartoon slide whistle
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.18);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  playDoubleJump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Two quick ascending chime twinkles
    [600, 950].forEach((baseFreq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = t + i * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, startT);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, startT + 0.12);

      gain.gain.setValueAtTime(0.001, startT);
      gain.gain.exponentialRampToValueAtTime(0.28, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startT);
      osc.stop(startT + 0.15);
    });
  }

  playCollect(combo = 1) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Scale pitch upwards with combo streak!
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const pitch = baseFreqs[Math.min(combo - 1, baseFreqs.length - 1)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.15, t + 0.08);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);

    // Sparkle harmonic
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pitch * 2, t);
    gain2.gain.setValueAtTime(0.001, t);
    gain2.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.12);
  }

  playPowerup() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Sweet arpeggiated fanfare
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);

      gain.gain.setValueAtTime(0.001, st);
      gain.gain.exponentialRampToValueAtTime(0.28, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(st);
      osc.stop(st + 0.25);
    });
  }

  playFall() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Comical descending slide into candy pit
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.55);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.6);

    // Chocolate syrup splash sound at the end
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(140, t2);
      osc2.frequency.exponentialRampToValueAtTime(45, t2 + 0.2);

      gain2.gain.setValueAtTime(0.3, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.2);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.2);
    }, 400);
  }

  playGameOver() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Sad comical trombone / descending minor chime
    const notes = [392.00, 369.99, 349.23, 311.13];
    notes.forEach((freq, idx) => {
      const startT = t + idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startT + 0.18);
      gain.gain.setValueAtTime(0.001, startT);
      gain.gain.exponentialRampToValueAtTime(0.25, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.22);
    });
  }

  playStep() {
    this.stepCounter++;
    if (this.stepCounter % 3 !== 0) return; // don't overwhelm
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Gentle cute squish
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 180 + Math.random() * 40;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  playUI() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.05);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }
}
