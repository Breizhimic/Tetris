/* js/audio.js — Sons Arcade via Web Audio API */

'use strict';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicNodes = [];
    this.musicPlaying = false;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _osc(freq, type, duration, gainVal = 0.3, detune = 0) {
    if (!this.ctx || !this.soundEnabled) return;
    this._resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  _chord(freqs, type, duration, gainVal = 0.2) {
    freqs.forEach(f => this._osc(f, type, duration, gainVal));
  }

  _noise(duration, gainVal = 0.15, highpass = 1000) {
    if (!this.ctx || !this.soundEnabled) return;
    this._resume();
    const now = this.ctx.currentTime;
    const bufLen = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = highpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
    src.start(now);
  }

  playMove() {
    this._osc(220, 'square', 0.05, 0.1);
  }

  playRotate() {
    this._osc(440, 'square', 0.08, 0.15);
    this._osc(660, 'square', 0.05, 0.08);
  }

  playSoftDrop() {
    this._osc(180, 'sine', 0.06, 0.1);
  }

  playHardDrop() {
    this._noise(0.12, 0.25, 200);
    this._osc(100, 'sawtooth', 0.15, 0.2);
  }

  playLock() {
    this._osc(200, 'square', 0.08, 0.15);
    this._noise(0.05, 0.1, 2000);
  }

  playSingle() {
    this._osc(523, 'square', 0.15, 0.2);
  }

  playDouble() {
    this._osc(523, 'square', 0.1, 0.15);
    setTimeout(() => this._osc(659, 'square', 0.15, 0.2), 80);
  }

  playTriple() {
    this._osc(523, 'square', 0.08, 0.15);
    setTimeout(() => this._osc(659, 'square', 0.08, 0.15), 70);
    setTimeout(() => this._osc(784, 'square', 0.15, 0.25), 140);
  }

  playTetris() {
    if (!this.ctx || !this.soundEnabled) return;
    this._resume();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this._osc(f, 'square', 0.2, 0.25), i * 80);
    });
    setTimeout(() => this._chord([523, 659, 784, 1047], 'square', 0.5, 0.15), 380);
  }

  playTSpin() {
    this._osc(880, 'sawtooth', 0.1, 0.2);
    setTimeout(() => this._osc(1100, 'sawtooth', 0.1, 0.25), 80);
    setTimeout(() => this._osc(880, 'sawtooth', 0.2, 0.2), 160);
  }

  playLineClear(count) {
    if (count >= 4) this.playTetris();
    else if (count === 3) this.playTriple();
    else if (count === 2) this.playDouble();
    else this.playSingle();
  }

  playLevelUp() {
    if (!this.ctx || !this.soundEnabled) return;
    this._resume();
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((f, i) => setTimeout(() => this._osc(f, 'square', 0.15, 0.2), i * 60));
  }

  playGameOver() {
    if (!this.ctx || !this.soundEnabled) return;
    this._resume();
    const notes = [400, 350, 300, 250, 200, 150, 100];
    notes.forEach((f, i) => setTimeout(() => this._osc(f, 'sawtooth', 0.3, 0.2), i * 100));
  }

  // ── BACKGROUND MUSIC ──
  startMusic(level = 1) {
    if (!this.ctx || !this.musicEnabled) return;
    this.stopMusic();
    this._resume();
    this.musicPlaying = true;
    this._scheduleMusic(level);
  }

  _scheduleMusic(level) {
    if (!this.musicPlaying || !this.musicEnabled) return;

    // Arcade-style loopable melody
    const bpm = Math.min(180, 120 + (level - 1) * 5);
    const beat = 60 / bpm;

    const melody = [
      [659,0],[0,0.5],[523,0.5],[0,1],[659,1],[784,1.5],
      [0,2],[659,2],[523,2.5],[440,3],[0,3.5],
      [523,3.5],[659,4],[523,4.5],[440,5],[523,5.5],
      [0,6],[659,6],[784,6.5],[880,7],[0,7.5],
      [784,7.5],[659,8],[0,8.5]
    ];

    const bass = [
      [130,0],[0,0.5],[130,0.5],[0,1],[130,1],[0,1.5],
      [110,2],[0,2.5],[110,2.5],[0,3],[110,3],[0,3.5],
      [98,4],[0,4.5],[98,4.5],[0,5],[98,5],[0,5.5],
      [87,6],[0,6.5],[87,6.5],[0,7],[87,7],[0,7.5],
      [130,8]
    ];

    const now = this.ctx.currentTime + 0.05;
    const loopLen = 8.5;

    for (const [freq, t] of melody) {
      if (freq === 0) continue;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = now + t * beat;
      const dur = beat * 0.45;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.15, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(start); osc.stop(start + dur + 0.05);
      this.musicNodes.push(osc, g);
    }

    for (const [freq, t] of bass) {
      if (freq === 0) continue;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const start = now + t * beat;
      const dur = beat * 0.8;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(start); osc.stop(start + dur + 0.05);
      this.musicNodes.push(osc, g);
    }

    // Schedule next loop
    this._musicTimer = setTimeout(() => this._scheduleMusic(level), loopLen * beat * 1000);
  }

  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._musicTimer);
    for (const n of this.musicNodes) {
      try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch(e){}
    }
    this.musicNodes = [];
  }

  updateMusicTempo(level) {
    if (this.musicPlaying) {
      this.stopMusic();
      this.startMusic(level);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.startMusic();
    else this.stopMusic();
    return this.musicEnabled;
  }
}
