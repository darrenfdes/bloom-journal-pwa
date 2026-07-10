/**
 * Synthesized ambient sound for the 3D meadow — no audio assets, everything built from a
 * looped noise buffer and a few oscillators, so the PWA ships zero extra bytes and every
 * layer's gain can track the live mix (`ambienceMixFor`) parametrically:
 *
 *   wind     noise → lowpass 400 Hz, slow LFO breathing
 *   stream   noise → two mid bandpasses with drifting centre frequencies
 *   rain     noise → highpass 3 kHz patter bed
 *   crickets 4.3 kHz tone, 24 Hz amplitude bursts in irregular trains (dusk/night)
 *   birds    sparse two-syllable FM chirp sweeps (daylight)
 *
 * No React/three — lives component-side because jsdom has no AudioContext. Construct on a
 * user gesture (autoplay policy); drive with `setMix`; `dispose` tears the graph down.
 */
import { birdChirpDelayMs, type AmbienceMix } from '@/lib/garden/explore/ambience';

const MASTER_GAIN = 0.25;

interface Layer {
  gain: GainNode;
  /** Full-mix gain — the mix value 1 maps to this. */
  scale: number;
}

export class AmbienceEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private layers: Record<keyof AmbienceMix, Layer>;
  private timers: number[] = [];
  private disposed = false;
  private onVisibility: () => void;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.ctx.destination);

    const noise = this.noiseBuffer();
    this.layers = {
      wind: this.windLayer(noise),
      stream: this.streamLayer(noise),
      rain: this.rainLayer(noise),
      crickets: this.cricketLayer(),
      birds: this.birdLayer(),
    };

    // Backgrounded tab → silence without losing the graph.
    this.onVisibility = () => {
      if (this.disposed) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Glide every layer toward the target mix. Call as often as you like (~4 Hz is plenty). */
  setMix(mix: AmbienceMix, rampSec = 1): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    for (const key of Object.keys(this.layers) as (keyof AmbienceMix)[]) {
      const layer = this.layers[key];
      const param = layer.gain.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(mix[key] * layer.scale, now + rampSec);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.timers.forEach((id) => window.clearTimeout(id));
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx.close();
  }

  private later(fn: () => void, ms: number): void {
    if (this.disposed) return;
    this.timers.push(window.setTimeout(fn, ms));
  }

  /** 2 s of looped white noise — the raw material for wind, stream and rain. */
  private noiseBuffer(): AudioBuffer {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private noiseSource(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }

  private layerGain(scale: number): Layer {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    return { gain, scale };
  }

  private windLayer(noise: AudioBuffer): Layer {
    const layer = this.layerGain(0.9);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    // Slow breathing: an LFO wobbles a unity gain stage ±25%.
    const breath = this.ctx.createGain();
    breath.gain.value = 1;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const depth = this.ctx.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(breath.gain);
    lfo.start();
    this.noiseSource(noise).connect(filter);
    filter.connect(breath).connect(layer.gain);
    return layer;
  }

  private streamLayer(noise: AudioBuffer): Layer {
    const layer = this.layerGain(0.8);
    for (const [freq, wobbleHz, wobble] of [
      [700, 0.13, 160],
      [1800, 0.09, 320],
    ] as const) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 1;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = wobbleHz;
      const depth = this.ctx.createGain();
      depth.gain.value = wobble;
      lfo.connect(depth).connect(filter.frequency);
      lfo.start();
      this.noiseSource(noise).connect(filter).connect(layer.gain);
    }
    return layer;
  }

  private rainLayer(noise: AudioBuffer): Layer {
    const layer = this.layerGain(0.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    this.noiseSource(noise).connect(filter).connect(layer.gain);
    return layer;
  }

  private cricketLayer(): Layer {
    const layer = this.layerGain(0.08);
    const tone = this.ctx.createOscillator();
    tone.frequency.value = 4300;
    // 24 Hz amplitude bursts: AM around 0.5 so the tone pulses fully on/off.
    const am = this.ctx.createGain();
    am.gain.value = 0.5;
    const amOsc = this.ctx.createOscillator();
    amOsc.frequency.value = 24;
    const amDepth = this.ctx.createGain();
    amDepth.gain.value = 0.5;
    amOsc.connect(amDepth).connect(am.gain);
    // Irregular chirp trains: a JS-gated envelope opens for ~0.3 s bursts with ragged gaps.
    const train = this.ctx.createGain();
    train.gain.value = 0;
    const burst = () => {
      if (this.disposed) return;
      const now = this.ctx.currentTime;
      const dur = 0.25 + Math.random() * 0.2;
      train.gain.cancelScheduledValues(now);
      train.gain.setValueAtTime(0, now);
      train.gain.linearRampToValueAtTime(1, now + 0.03);
      train.gain.setValueAtTime(1, now + dur);
      train.gain.linearRampToValueAtTime(0, now + dur + 0.04);
      this.later(burst, (dur + 0.2 + Math.random() * 0.6) * 1000);
    };
    burst();
    tone.connect(am).connect(train).connect(layer.gain);
    tone.start();
    amOsc.start();
    return layer;
  }

  private birdLayer(): Layer {
    const layer = this.layerGain(0.14);
    const chirp = () => {
      if (this.disposed) return;
      // Skip silently when the layer is faded out (night, rain, muted).
      if (layer.gain.gain.value > 0.005) {
        const now = this.ctx.currentTime;
        for (const syllable of [0, 1]) {
          const at = now + syllable * 0.19;
          const osc = this.ctx.createOscillator();
          const env = this.ctx.createGain();
          osc.frequency.setValueAtTime(2800, at);
          osc.frequency.exponentialRampToValueAtTime(2200, at + 0.12);
          env.gain.setValueAtTime(0, at);
          env.gain.linearRampToValueAtTime(1, at + 0.02);
          env.gain.linearRampToValueAtTime(0, at + 0.13);
          osc.connect(env).connect(layer.gain);
          osc.start(at);
          osc.stop(at + 0.15);
        }
      }
      this.later(chirp, birdChirpDelayMs(Math.random()));
    };
    this.later(chirp, birdChirpDelayMs(Math.random()) * 0.3);
    return layer;
  }
}
