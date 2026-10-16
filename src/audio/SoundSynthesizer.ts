import { VehicleTelemetry } from '../types';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private isRunning = false;

  // Master Gain & Limiter
  private masterGain: GainNode | null = null;

  // Engine Oscillators & Filters
  private engineGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;

  // Tire Screech Noise
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  // Ambient Cairo City Sound
  private ambientGain: GainNode | null = null;

  // Horn State
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;

  // Suspension bump debounce
  private lastBumpTime = 0;
  private prevRpm = 900;

  public async init(): Promise<void> {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master bus with soft clipping
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupEngineSound();
    this.setupTireNoise();
    this.setupAmbientSound();
    this.setupHorn();

    this.isRunning = true;
  }

  public resumeIfSuspended(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 1. Multi-oscillator engine synthesis with RPM-tracked frequency & waveshaping
   */
  private setupEngineSound(): void {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Primary low-end rumble (Sawtooth)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(35, this.ctx.currentTime);

    // Harmonic engine overtone (Triangle)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(70, this.ctx.currentTime);

    // Dynamic lowpass filter to mimic intake manifold & muffler
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.2, this.ctx.currentTime);

    // Waveshaper for exhaust rasp distortion
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(18) as any;
    this.distortionNode.oversample = '2x';

    this.osc1.connect(this.engineFilter);
    this.osc2.connect(this.engineFilter);
    this.engineFilter.connect(this.distortionNode);
    this.distortionNode.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
  }

  /**
   * 2. Tire screech noise generator
   */
  private setupTireNoise(): void {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = noiseBuffer;
    this.tireNoiseNode.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(1250, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    this.tireNoiseNode.start();
  }

  /**
   * 3. Ambient Cairo city background sound (river breeze & muffled distant bustle)
   */
  private setupAmbientSound(): void {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    noise.start();
  }

  /**
   * 4. Egyptian Horn Klaxon (Multi-tone dual frequency)
   */
  private setupHorn(): void {
    if (!this.ctx || !this.masterGain) return;

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Dual-tone characteristic Cairo horn frequencies
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.setValueAtTime(440, this.ctx.currentTime);

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.setValueAtTime(520, this.ctx.currentTime);

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'bandpass';
    hornFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    hornFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.masterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  /**
   * Updates audio parameters every frame based on telemetry
   */
  public update(telemetry: VehicleTelemetry, isHornActive: boolean): void {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Engine Pitch & Lowpass Filter Modulations
    const normalizedRpm = Math.max(900, Math.min(7200, telemetry.rpm));
    const baseFreq = 25 + (normalizedRpm / 7200) * 115; // 25 Hz to 140 Hz fundamental

    if (this.osc1 && this.osc2 && this.engineFilter && this.engineGain) {
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);

      // Open filter up as throttle/RPM climbs
      const filterFreq = 260 + (normalizedRpm / 7200) * 1650 + telemetry.engineLoad * 600;
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.04);

      // Engine volume based on load
      const engineVol = 0.28 + telemetry.engineLoad * 0.22;
      this.engineGain.gain.setTargetAtTime(engineVol, t, 0.05);
    }

    // 2. Exhaust Pop / Backfire on Throttle Lift-Off
    if (this.prevRpm > 4800 && telemetry.rpm < this.prevRpm - 350 && telemetry.engineLoad < 0.1) {
      this.triggerBackfire();
    }
    this.prevRpm = telemetry.rpm;

    // 3. Tire Screech (Triggered when handbraking or drifting at speed)
    if (this.tireGain) {
      const isScreeching = (telemetry.isHandbraking && telemetry.speedKmh > 12) || (telemetry.slipRatio > 0.45 && telemetry.speedKmh > 35);
      const targetTireVol = isScreeching ? Math.min(0.55, (telemetry.speedKmh / 90) * 0.5) : 0;
      this.tireGain.gain.setTargetAtTime(targetTireVol, t, 0.08);
    }

    // 4. Suspension Thud on Speed Bumps and Expansion Joints
    const avgCompression = (telemetry.suspensionCompression[0] + telemetry.suspensionCompression[1]) / 2;
    if (avgCompression > 0.45 && Date.now() - this.lastBumpTime > 260) {
      this.triggerSuspensionThud(avgCompression);
      this.lastBumpTime = Date.now();
    }

    // 5. Horn Control
    if (this.hornGain) {
      const hornTarget = isHornActive ? 0.45 : 0;
      this.hornGain.gain.setTargetAtTime(hornTarget, t, 0.02);
    }
  }

  /**
   * Triggers an authentic Cairo double-tap horn pattern
   */
  public playCairoHornPattern(): void {
    if (!this.ctx || !this.hornGain) return;
    const t = this.ctx.currentTime;
    // Rhythmic motif: Ta... Ta-Ta!
    this.hornGain.gain.setValueAtTime(0.45, t);
    this.hornGain.gain.setValueAtTime(0, t + 0.12);
    this.hornGain.gain.setValueAtTime(0.45, t + 0.22);
    this.hornGain.gain.setValueAtTime(0, t + 0.34);
    this.hornGain.gain.setValueAtTime(0.45, t + 0.42);
    this.hornGain.gain.setValueAtTime(0, t + 0.65);
  }

  /**
   * Deep suspension bump thud when hitting Egyptian speed bumps
   */
  public triggerSuspensionThud(intensity: number): void {
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Sub-bass sweep: 75 Hz drops rapidly to 22 Hz
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + 0.18);

    const vol = Math.min(0.6, intensity * 0.7);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * High-RPM exhaust pop / backfire
   */
  private triggerBackfire(): void {
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(2.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
