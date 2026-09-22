import { AudioSettings } from '../types';

export class HighwayAudioEngine {
  private ctx: AudioContext | null = null;
  private isStarted = false;
  private isMuted = false;

  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Ambient Pad
  private padOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private chordIndex = 0;
  private chordTimer = 0;
  private readonly CHORD_DURATION = 16.0;

  // D minor wistful chords [Dm, Bb, F, C]
  private readonly CHORDS = [
    [146.83, 174.61, 220.00, 293.66], // Dm9
    [116.54, 146.83, 174.61, 233.08], // Bbmaj7
    [87.31,  110.00, 130.81, 174.61], // Fadd9
    [130.81, 164.81, 196.00, 246.94], // Cadd9
  ];

  // Engine hum
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Wind / Tire road noise
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private tireRumbleGain: GainNode | null = null;

  public init(): void {
    if (this.isStarted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output with soft tape limiter
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      // Music submix
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.masterGain);

      // SFX submix
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      // 1. Ambient Warm Analog Pad
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = 'lowpass';
      this.padFilter.frequency.value = 850;
      this.padFilter.Q.value = 1.2;
      this.padFilter.connect(this.musicGain);

      // Slow breathing LFO on filter cutoff
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.035;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain).connect(this.padFilter.frequency);
      lfo.start();

      // Start 4-voice chord oscillators
      this.CHORDS[0].forEach((freq, idx) => {
        if (!this.ctx || !this.padFilter) return;
        const osc = this.ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 8;

        const g = this.ctx.createGain();
        g.gain.value = 0;
        osc.connect(g).connect(this.padFilter);
        osc.start();

        // Fade in
        g.gain.linearRampToValueAtTime(0.065, this.ctx.currentTime + 3.0);
        this.padOscs.push({ osc, gain: g });
      });

      // 2. Engine Tone (Rich dual-harmonic oscillator)
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 54;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineFilter.Q.value = 1.5;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.02;

      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.sfxGain);
      this.engineOsc.start();

      // 3. Wind & Tire Asphalt Noise (Stereo noise buffer)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 520;
      this.windFilter.Q.value = 0.6;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.015;

      this.tireRumbleGain = this.ctx.createGain();
      this.tireRumbleGain.gain.value = 0.02;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 160;

      noiseSource.connect(this.windFilter).connect(this.windGain).connect(this.sfxGain);
      noiseSource.connect(rumbleFilter).connect(this.tireRumbleGain).connect(this.sfxGain);
      noiseSource.start();

      this.isStarted = true;
    } catch {
      // Audio unsupported or autoplay policy
    }
  }

  public update(dt: number, speed: number, minSpeed: number, maxSpeed: number, isSteering: boolean): void {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed)));

    // Modulate engine pitch and resonance with speed
    if (this.engineOsc && this.engineFilter && this.engineGain) {
      this.engineOsc.frequency.setTargetAtTime(50 + ratio * 72, now, 0.15);
      this.engineFilter.frequency.setTargetAtTime(260 + ratio * 880, now, 0.2);
      this.engineGain.gain.setTargetAtTime(0.016 + ratio * 0.045, now, 0.2);
    }

    // Modulate wind buffeting & tire roar
    if (this.windFilter && this.windGain && this.tireRumbleGain) {
      this.windFilter.frequency.setTargetAtTime(420 + ratio * 2100, now, 0.2);
      this.windGain.gain.setTargetAtTime(0.01 + ratio * 0.065, now, 0.2);
      // Slight extra tire scrubbing when steering hard
      const steerBonus = isSteering ? 0.012 : 0;
      this.tireRumbleGain.gain.setTargetAtTime(0.015 + ratio * 0.04 + steerBonus, now, 0.15);
    }

    // Chord progression cycle
    this.chordTimer += dt;
    if (this.chordTimer > this.CHORD_DURATION) {
      this.chordTimer = 0;
      this.chordIndex = (this.chordIndex + 1) % this.CHORDS.length;
      const currentChord = this.CHORDS[this.chordIndex];
      this.padOscs.forEach((p, idx) => {
        if (currentChord[idx]) {
          p.osc.frequency.linearRampToValueAtTime(currentChord[idx], now + 4.5);
        }
      });
    }
  }

  public toggleMute(): boolean {
    if (!this.isStarted) {
      this.init();
    }
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime, 0.08);
    }
    return this.isMuted;
  }

  public getSettings(): AudioSettings {
    return {
      isMuted: this.isMuted,
      masterVolume: 0.85,
      musicVolume: 0.22,
      sfxVolume: 0.9,
    };
  }
}
