/**
 * Browser-native Web Audio API procedural sound engine for Drift // Playground
 * Generates realistic RWD engine rumble, rev limiter pops, tire screeching,
 * collision impact, and drift combo reward chimes without external audio assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isMuted = false;

  // Master Gain
  private masterGain: GainNode | null = null;

  // Engine Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineDistortion: WaveShaperNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire Screech Nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;

  // Ambient wind
  private windGain: GainNode | null = null;

  // State tracking
  private currentRpm = 900;
  private targetRpm = 900;
  private currentScreechVol = 0;
  private lastExhaustPopTime = 0;

  constructor() {
    // Lazy initialize on user click
  }

  public init(): boolean {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.setupEngine();
      this.setupTireScreech();
      this.setupWindAmbient();

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('Web Audio API not supported or blocked:', err);
      return false;
    }
  }

  private setupEngine() {
    if (!this.ctx || !this.masterGain) return;

    // Distort curve for aggressive exhaust growl
    this.engineDistortion = this.ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(18);
    this.engineDistortion.oversample = '2x';

    // Primary low rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(38, this.ctx.currentTime);

    // Secondary pulse harmonic
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(76, this.ctx.currentTime);

    // Deep sub-bass pulse
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(19, this.ctx.currentTime);

    // Resonant intake / exhaust filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineDistortion);
    this.engineOsc2.connect(this.engineDistortion);
    this.engineSub.connect(this.engineFilter);

    this.engineDistortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  private setupTireScreech() {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of pink/white noise buffer for looping tire screech
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
    }

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = noiseBuffer;
    this.tireNoiseNode.loop = true;

    // Resonant bandpass filter that captures asphalt rubber friction squeal
    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    this.tireNoiseNode.start();
  }

  private setupWindAmbient() {
    if (!this.ctx || !this.masterGain) return;

    // Soft rushing wind
    const bufferSize = this.ctx.sampleRate * 1;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.04;
    }

    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windSrc.start();
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Update engine sound and tire screech every frame
   */
  public update(
    rpm: number,
    throttle: number,
    speedKmh: number,
    slipRatio: number,
    isDrifting: boolean,
    handbrake: boolean
  ) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Smooth RPM response
    this.targetRpm = Math.max(800, Math.min(7800, rpm));
    this.currentRpm += (this.targetRpm - this.currentRpm) * 0.2;

    // Base fundamental frequency: 800 RPM ~ 28Hz, 7500 RPM ~ 145Hz
    const baseFreq = 22 + (this.currentRpm / 7500) * 125;
    const filterFreq = 180 + (this.currentRpm / 7500) * 1600 + throttle * 450;

    if (this.engineOsc1 && this.engineOsc2 && this.engineSub && this.engineFilter && this.engineGain) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.04);
      this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

      // Volume increases with throttle load and RPM
      const engineVol = 0.16 + throttle * 0.22 + (this.currentRpm / 7500) * 0.18;
      this.engineGain.gain.setTargetAtTime(engineVol, now, 0.05);
    }

    // Exhaust crackle on throttle cut at high RPM
    if (throttle < 0.1 && this.currentRpm > 4500 && now - this.lastExhaustPopTime > 0.14) {
      if (Math.random() < 0.4) {
        this.triggerExhaustPop();
        this.lastExhaustPopTime = now;
      }
    }

    // Tire Screech handling
    let targetScreech = 0;
    if (speedKmh > 10) {
      if (handbrake) {
        targetScreech = 0.55;
      } else if (isDrifting || slipRatio > 0.18) {
        // Modulate screech by slip intensity and speed
        const slipFactor = Math.min(1.0, Math.max(0, (slipRatio - 0.15) * 2.2));
        const speedFactor = Math.min(1.0, speedKmh / 50);
        targetScreech = slipFactor * speedFactor * 0.58;
      }
    }

    this.currentScreechVol += (targetScreech - this.currentScreechVol) * 0.25;

    if (this.tireGain && this.tireFilter) {
      this.tireGain.gain.setTargetAtTime(this.currentScreechVol, now, 0.03);

      // Screech pitch varies slightly with speed & slip
      const screechPitch = 900 + Math.min(900, speedKmh * 8) + slipRatio * 350;
      this.tireFilter.frequency.setTargetAtTime(screechPitch, now, 0.04);
    }

    // Wind speed sound
    if (this.windGain) {
      const windVol = 0.02 + Math.min(0.2, (speedKmh / 140) * 0.18);
      this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
    }
  }

  /**
   * Quick metallic exhaust pop / backfire
   */
  public triggerExhaustPop() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const popFilter = this.ctx.createBiquadFilter();

      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(140 + Math.random() * 80, this.ctx.currentTime);
      popOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.06);

      popFilter.type = 'highpass';
      popFilter.frequency.setValueAtTime(60, this.ctx.currentTime);

      popGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      popOsc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.masterGain);

      popOsc.start();
      popOsc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio node cleanup safe fallback
    }
  }

  /**
   * Collision thud when hitting walls/barriers
   */
  public triggerCollisionSound(intensity = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.15);

      const vol = Math.min(0.5, 0.15 + intensity * 0.3);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio glitch
    }
  }

  /**
   * Satisfying chime when drift multiplier levels up (x2, x3, x4, etc.)
   */
  public triggerComboChime(level: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
      const freq = freqs[Math.min(freqs.length - 1, Math.max(0, level - 1))];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.26);
    } catch {
      // Ignore
    }
  }

  /**
   * Cash-in sound when bank is confirmed
   */
  public triggerScoreBankSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      [880, 1320].forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.18);
      });
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
