export type SoundType = 'none' | 'rain' | 'cafe' | 'lofi' | 'whitenoise' | 'nature' | 'fireplace' | 'ocean';

export const SOUND_OPTIONS: { value: SoundType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '🔇' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'ocean', label: 'Ocean', icon: '🌊' },
  { value: 'whitenoise', label: 'White Noise', icon: '📻' },
  { value: 'nature', label: 'Forest', icon: '🌲' },
  { value: 'fireplace', label: 'Fire', icon: '🔥' },
  { value: 'cafe', label: 'Brown Noise', icon: '☕' },
  { value: 'lofi', label: 'Pink Noise', icon: '🎵' },
];

/**
 * Procedural audio generator using Web Audio API
 * Creates ambient sounds without requiring audio files
 */
class ProceduralSoundGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private currentSound: SoundType = 'none';
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  play(sound: SoundType, volume: number = 0.5) {
    this.stop();
    if (sound === 'none') return;

    const ctx = this.getContext();

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    this.masterGain!.gain.value = volume;
    this.currentSound = sound;
    this.isPlaying = true;

    switch (sound) {
      case 'whitenoise':
        this.createWhiteNoise();
        break;
      case 'cafe': // Brown noise - deeper, warmer
        this.createBrownNoise();
        break;
      case 'lofi': // Pink noise - balanced
        this.createPinkNoise();
        break;
      case 'rain':
        this.createRain();
        break;
      case 'ocean':
        this.createOcean();
        break;
      case 'nature':
        this.createForest();
        break;
      case 'fireplace':
        this.createFireplace();
        break;
    }
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastValue = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'white') {
        data[i] = white * 0.3;
      } else if (type === 'pink') {
        // Pink noise using Paul Kellet's algorithm
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        // Brown noise - integrated white noise
        lastValue = (lastValue + (0.02 * white)) / 1.02;
        data[i] = lastValue * 3.5;
      }
    }

    return buffer;
  }

  private createWhiteNoise() {
    const ctx = this.getContext();
    const buffer = this.createNoiseBuffer('white');

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.masterGain!);
    source.start();

    this.nodes.push(source);
  }

  private createBrownNoise() {
    const ctx = this.getContext();
    const buffer = this.createNoiseBuffer('brown');

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Add low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.connect(filter);
    filter.connect(this.masterGain!);
    source.start();

    this.nodes.push(source, filter);
  }

  private createPinkNoise() {
    const ctx = this.getContext();
    const buffer = this.createNoiseBuffer('pink');

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.masterGain!);
    source.start();

    this.nodes.push(source);
  }

  private createRain() {
    const ctx = this.getContext();

    // Base rain - filtered white noise
    const rainBuffer = this.createNoiseBuffer('white');
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 2500;
    rainFilter.Q.value = 0.5;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.4;

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain!);
    rainSource.start();

    // Low rumble (thunder-like ambience)
    const rumbleBuffer = this.createNoiseBuffer('brown');
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = rumbleBuffer;
    rumbleSource.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 200;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.15;

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain!);
    rumbleSource.start();

    this.nodes.push(rainSource, rainFilter, rainGain, rumbleSource, rumbleFilter, rumbleGain);
  }

  private createOcean() {
    const ctx = this.getContext();

    // Wave sound using modulated noise
    const waveBuffer = this.createNoiseBuffer('pink');
    const waveSource = ctx.createBufferSource();
    waveSource.buffer = waveBuffer;
    waveSource.loop = true;

    // Low-pass for deep ocean sound
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 600;
    waveFilter.Q.value = 1;

    // LFO for wave rhythm
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow waves

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.5;

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    waveSource.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(this.masterGain!);

    waveSource.start();
    lfo.start();

    // Foam/surf high frequencies
    const foamBuffer = this.createNoiseBuffer('white');
    const foamSource = ctx.createBufferSource();
    foamSource.buffer = foamBuffer;
    foamSource.loop = true;

    const foamFilter = ctx.createBiquadFilter();
    foamFilter.type = 'highpass';
    foamFilter.frequency.value = 3000;

    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.1;

    foamSource.connect(foamFilter);
    foamFilter.connect(foamGain);
    foamGain.connect(this.masterGain!);
    foamSource.start();

    this.nodes.push(waveSource, waveFilter, lfo, lfoGain, waveGain, foamSource, foamFilter, foamGain);
  }

  private createForest() {
    const ctx = this.getContext();

    // Wind through leaves - filtered noise
    const windBuffer = this.createNoiseBuffer('pink');
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 800;
    windFilter.Q.value = 0.3;

    // LFO for wind gusts
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.4;

    lfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain!);

    windSource.start();
    lfo.start();

    // Background ambient
    const ambientBuffer = this.createNoiseBuffer('brown');
    const ambientSource = ctx.createBufferSource();
    ambientSource.buffer = ambientBuffer;
    ambientSource.loop = true;

    const ambientFilter = ctx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 300;

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.15;

    ambientSource.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(this.masterGain!);
    ambientSource.start();

    this.nodes.push(windSource, windFilter, lfo, lfoGain, windGain, ambientSource, ambientFilter, ambientGain);
  }

  private createFireplace() {
    const ctx = this.getContext();

    // Crackling fire - filtered noise with modulation
    const crackleBuffer = this.createNoiseBuffer('white');
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;

    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 1500;
    crackleFilter.Q.value = 2;

    // Random-ish modulation for crackle effect
    const modulator = ctx.createOscillator();
    modulator.type = 'sawtooth';
    modulator.frequency.value = 3;

    const modGain = ctx.createGain();
    modGain.gain.value = 0.4;

    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.25;

    modulator.connect(modGain);
    modGain.connect(crackleGain.gain);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.masterGain!);

    crackleSource.start();
    modulator.start();

    // Low rumble (flame)
    const flameBuffer = this.createNoiseBuffer('brown');
    const flameSource = ctx.createBufferSource();
    flameSource.buffer = flameBuffer;
    flameSource.loop = true;

    const flameFilter = ctx.createBiquadFilter();
    flameFilter.type = 'lowpass';
    flameFilter.frequency.value = 250;

    const flameGain = ctx.createGain();
    flameGain.gain.value = 0.3;

    flameSource.connect(flameFilter);
    flameFilter.connect(flameGain);
    flameGain.connect(this.masterGain!);
    flameSource.start();

    this.nodes.push(crackleSource, crackleFilter, modulator, modGain, crackleGain, flameSource, flameFilter, flameGain);
  }

  stop() {
    this.nodes.forEach(node => {
      try {
        if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
          node.stop();
        }
        node.disconnect();
      } catch (e) {
        // Ignore already stopped nodes
      }
    });
    this.nodes = [];
    this.currentSound = 'none';
    this.isPlaying = false;
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext?.currentTime || 0
      );
    }
  }

  getCurrentSound(): SoundType {
    return this.currentSound;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton instance
let playerInstance: ProceduralSoundGenerator | null = null;

export interface FocusSoundPlayerInterface {
  play: (sound: SoundType, volume?: number) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  getCurrentSound: () => SoundType;
  isPlaying: () => boolean;
}

export function getFocusSoundPlayer(): FocusSoundPlayerInterface {
  if (typeof window === 'undefined') {
    // Return a mock player for SSR
    return {
      play: () => {},
      stop: () => {},
      setVolume: () => {},
      getCurrentSound: () => 'none' as SoundType,
      isPlaying: () => false,
    };
  }

  if (!playerInstance) {
    playerInstance = new ProceduralSoundGenerator();
  }

  return {
    play: (sound, volume) => playerInstance!.play(sound, volume),
    stop: () => playerInstance!.stop(),
    setVolume: (volume) => playerInstance!.setVolume(volume),
    getCurrentSound: () => playerInstance!.getCurrentSound(),
    isPlaying: () => playerInstance!.getIsPlaying(),
  };
}
