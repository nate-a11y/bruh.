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
 * Improved procedural audio generator using Web Audio API
 * Creates more realistic ambient sounds with better layering and modulation
 */
class ProceduralSoundGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private currentSound: SoundType = 'none';
  private isPlaying = false;
  private animationFrameId: number | null = null;

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

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', seconds: number = 4): AudioBuffer {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate); // Stereo for more immersion
    const dataL = buffer.getChannelData(0);
    const dataR = buffer.getChannelData(1);

    let lastValueL = 0, lastValueR = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      if (type === 'white') {
        dataL[i] = whiteL * 0.25;
        dataR[i] = whiteR * 0.25;
      } else if (type === 'pink') {
        // Pink noise using Paul Kellet's algorithm - stereo
        b0 = 0.99886 * b0 + whiteL * 0.0555179;
        b1 = 0.99332 * b1 + whiteL * 0.0750759;
        b2 = 0.96900 * b2 + whiteL * 0.1538520;
        b3 = 0.86650 * b3 + whiteL * 0.3104856;
        b4 = 0.55000 * b4 + whiteL * 0.5329522;
        b5 = -0.7616 * b5 - whiteL * 0.0168980;
        dataL[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + whiteL * 0.5362) * 0.07;
        b6 = whiteL * 0.115926;

        c0 = 0.99886 * c0 + whiteR * 0.0555179;
        c1 = 0.99332 * c1 + whiteR * 0.0750759;
        c2 = 0.96900 * c2 + whiteR * 0.1538520;
        c3 = 0.86650 * c3 + whiteR * 0.3104856;
        c4 = 0.55000 * c4 + whiteR * 0.5329522;
        c5 = -0.7616 * c5 - whiteR * 0.0168980;
        dataR[i] = (c0 + c1 + c2 + c3 + c4 + c5 + c6 + whiteR * 0.5362) * 0.07;
        c6 = whiteR * 0.115926;
      } else if (type === 'brown') {
        // Brown noise - integrated white noise
        lastValueL = (lastValueL + (0.02 * whiteL)) / 1.02;
        lastValueR = (lastValueR + (0.02 * whiteR)) / 1.02;
        dataL[i] = lastValueL * 3.2;
        dataR[i] = lastValueR * 3.2;
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

    // Smooth low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;

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

    // Layer 1: Steady rain - filtered pink noise (sounds more natural than white)
    const steadyRainBuffer = this.createNoiseBuffer('pink', 5);
    const steadyRain = ctx.createBufferSource();
    steadyRain.buffer = steadyRainBuffer;
    steadyRain.loop = true;

    // Bandpass for rain frequency range
    const rainBP = ctx.createBiquadFilter();
    rainBP.type = 'bandpass';
    rainBP.frequency.value = 3000;
    rainBP.Q.value = 0.4;

    // Slight high shelf for presence
    const rainHighShelf = ctx.createBiquadFilter();
    rainHighShelf.type = 'highshelf';
    rainHighShelf.frequency.value = 4000;
    rainHighShelf.gain.value = 3;

    const steadyGain = ctx.createGain();
    steadyGain.gain.value = 0.35;

    steadyRain.connect(rainBP);
    rainBP.connect(rainHighShelf);
    rainHighShelf.connect(steadyGain);
    steadyGain.connect(this.masterGain!);
    steadyRain.start();

    // Layer 2: Heavier drops - white noise with different filtering
    const heavyBuffer = this.createNoiseBuffer('white', 3);
    const heavyRain = ctx.createBufferSource();
    heavyRain.buffer = heavyBuffer;
    heavyRain.loop = true;

    const heavyBP = ctx.createBiquadFilter();
    heavyBP.type = 'bandpass';
    heavyBP.frequency.value = 2000;
    heavyBP.Q.value = 0.8;

    // Subtle modulation for variation
    const heavyLFO = ctx.createOscillator();
    heavyLFO.type = 'sine';
    heavyLFO.frequency.value = 0.08;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;

    const heavyGain = ctx.createGain();
    heavyGain.gain.value = 0.18;

    heavyLFO.connect(lfoGain);
    lfoGain.connect(heavyGain.gain);

    heavyRain.connect(heavyBP);
    heavyBP.connect(heavyGain);
    heavyGain.connect(this.masterGain!);
    heavyRain.start();
    heavyLFO.start();

    // Layer 3: Low rumble (distant thunder/atmosphere)
    const rumbleBuffer = this.createNoiseBuffer('brown', 6);
    const rumble = ctx.createBufferSource();
    rumble.buffer = rumbleBuffer;
    rumble.loop = true;

    const rumbleLP = ctx.createBiquadFilter();
    rumbleLP.type = 'lowpass';
    rumbleLP.frequency.value = 150;
    rumbleLP.Q.value = 0.7;

    // Very slow modulation for distant thunder feel
    const rumbleLFO = ctx.createOscillator();
    rumbleLFO.type = 'sine';
    rumbleLFO.frequency.value = 0.02;

    const rumbleLFOGain = ctx.createGain();
    rumbleLFOGain.gain.value = 0.04;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.12;

    rumbleLFO.connect(rumbleLFOGain);
    rumbleLFOGain.connect(rumbleGain.gain);

    rumble.connect(rumbleLP);
    rumbleLP.connect(rumbleGain);
    rumbleGain.connect(this.masterGain!);
    rumble.start();
    rumbleLFO.start();

    this.nodes.push(
      steadyRain, rainBP, rainHighShelf, steadyGain,
      heavyRain, heavyBP, heavyLFO, lfoGain, heavyGain,
      rumble, rumbleLP, rumbleLFO, rumbleLFOGain, rumbleGain
    );
  }

  private createOcean() {
    const ctx = this.getContext();

    // Layer 1: Deep ocean base - very low frequencies
    const deepBuffer = this.createNoiseBuffer('brown', 8);
    const deep = ctx.createBufferSource();
    deep.buffer = deepBuffer;
    deep.loop = true;

    const deepLP = ctx.createBiquadFilter();
    deepLP.type = 'lowpass';
    deepLP.frequency.value = 200;
    deepLP.Q.value = 0.5;

    const deepGain = ctx.createGain();
    deepGain.gain.value = 0.3;

    deep.connect(deepLP);
    deepLP.connect(deepGain);
    deepGain.connect(this.masterGain!);
    deep.start();

    // Layer 2: Wave surge - pink noise with slow modulation
    const waveBuffer = this.createNoiseBuffer('pink', 6);
    const wave = ctx.createBufferSource();
    wave.buffer = waveBuffer;
    wave.loop = true;

    const waveBP = ctx.createBiquadFilter();
    waveBP.type = 'lowpass';
    waveBP.frequency.value = 800;
    waveBP.Q.value = 0.4;

    // Slow LFO for wave rhythm (about 6-8 second cycles)
    const waveLFO = ctx.createOscillator();
    waveLFO.type = 'sine';
    waveLFO.frequency.value = 0.12;

    const waveLFOGain = ctx.createGain();
    waveLFOGain.gain.value = 0.25;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.35;

    waveLFO.connect(waveLFOGain);
    waveLFOGain.connect(waveGain.gain);

    wave.connect(waveBP);
    waveBP.connect(waveGain);
    waveGain.connect(this.masterGain!);
    wave.start();
    waveLFO.start();

    // Layer 3: Foam/surf - higher frequency white noise with modulation
    const foamBuffer = this.createNoiseBuffer('white', 4);
    const foam = ctx.createBufferSource();
    foam.buffer = foamBuffer;
    foam.loop = true;

    const foamHP = ctx.createBiquadFilter();
    foamHP.type = 'highpass';
    foamHP.frequency.value = 2500;

    const foamBP = ctx.createBiquadFilter();
    foamBP.type = 'bandpass';
    foamBP.frequency.value = 4000;
    foamBP.Q.value = 0.5;

    // Foam follows wave rhythm but slightly offset
    const foamLFO = ctx.createOscillator();
    foamLFO.type = 'sine';
    foamLFO.frequency.value = 0.15;

    const foamLFOGain = ctx.createGain();
    foamLFOGain.gain.value = 0.06;

    const foamGain = ctx.createGain();
    foamGain.gain.value = 0.08;

    foamLFO.connect(foamLFOGain);
    foamLFOGain.connect(foamGain.gain);

    foam.connect(foamHP);
    foamHP.connect(foamBP);
    foamBP.connect(foamGain);
    foamGain.connect(this.masterGain!);
    foam.start();
    foamLFO.start();

    this.nodes.push(
      deep, deepLP, deepGain,
      wave, waveBP, waveLFO, waveLFOGain, waveGain,
      foam, foamHP, foamBP, foamLFO, foamLFOGain, foamGain
    );
  }

  private createForest() {
    const ctx = this.getContext();

    // Layer 1: Wind through trees - filtered pink noise with slow modulation
    const windBuffer = this.createNoiseBuffer('pink', 7);
    const wind = ctx.createBufferSource();
    wind.buffer = windBuffer;
    wind.loop = true;

    const windBP = ctx.createBiquadFilter();
    windBP.type = 'bandpass';
    windBP.frequency.value = 600;
    windBP.Q.value = 0.3;

    // Slow gusting modulation
    const windLFO = ctx.createOscillator();
    windLFO.type = 'sine';
    windLFO.frequency.value = 0.07;

    const windLFOGain = ctx.createGain();
    windLFOGain.gain.value = 0.2;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.3;

    windLFO.connect(windLFOGain);
    windLFOGain.connect(windGain.gain);

    wind.connect(windBP);
    windBP.connect(windGain);
    windGain.connect(this.masterGain!);
    wind.start();
    windLFO.start();

    // Layer 2: Leaves rustling - higher frequency with faster modulation
    const leavesBuffer = this.createNoiseBuffer('white', 4);
    const leaves = ctx.createBufferSource();
    leaves.buffer = leavesBuffer;
    leaves.loop = true;

    const leavesBP = ctx.createBiquadFilter();
    leavesBP.type = 'bandpass';
    leavesBP.frequency.value = 3500;
    leavesBP.Q.value = 0.6;

    const leavesLFO = ctx.createOscillator();
    leavesLFO.type = 'sine';
    leavesLFO.frequency.value = 0.25;

    const leavesLFOGain = ctx.createGain();
    leavesLFOGain.gain.value = 0.04;

    const leavesGain = ctx.createGain();
    leavesGain.gain.value = 0.06;

    leavesLFO.connect(leavesLFOGain);
    leavesLFOGain.connect(leavesGain.gain);

    leaves.connect(leavesBP);
    leavesBP.connect(leavesGain);
    leavesGain.connect(this.masterGain!);
    leaves.start();
    leavesLFO.start();

    // Layer 3: Deep forest ambience
    const ambientBuffer = this.createNoiseBuffer('brown', 8);
    const ambient = ctx.createBufferSource();
    ambient.buffer = ambientBuffer;
    ambient.loop = true;

    const ambientLP = ctx.createBiquadFilter();
    ambientLP.type = 'lowpass';
    ambientLP.frequency.value = 250;
    ambientLP.Q.value = 0.3;

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.18;

    ambient.connect(ambientLP);
    ambientLP.connect(ambientGain);
    ambientGain.connect(this.masterGain!);
    ambient.start();

    this.nodes.push(
      wind, windBP, windLFO, windLFOGain, windGain,
      leaves, leavesBP, leavesLFO, leavesLFOGain, leavesGain,
      ambient, ambientLP, ambientGain
    );
  }

  private createFireplace() {
    const ctx = this.getContext();

    // Layer 1: Base flame roar - low frequency
    const roarBuffer = this.createNoiseBuffer('brown', 6);
    const roar = ctx.createBufferSource();
    roar.buffer = roarBuffer;
    roar.loop = true;

    const roarLP = ctx.createBiquadFilter();
    roarLP.type = 'lowpass';
    roarLP.frequency.value = 200;
    roarLP.Q.value = 0.4;

    // Slow breathing modulation
    const roarLFO = ctx.createOscillator();
    roarLFO.type = 'sine';
    roarLFO.frequency.value = 0.15;

    const roarLFOGain = ctx.createGain();
    roarLFOGain.gain.value = 0.08;

    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.25;

    roarLFO.connect(roarLFOGain);
    roarLFOGain.connect(roarGain.gain);

    roar.connect(roarLP);
    roarLP.connect(roarGain);
    roarGain.connect(this.masterGain!);
    roar.start();
    roarLFO.start();

    // Layer 2: Mid-range flame - pink noise
    const flameBuffer = this.createNoiseBuffer('pink', 5);
    const flame = ctx.createBufferSource();
    flame.buffer = flameBuffer;
    flame.loop = true;

    const flameBP = ctx.createBiquadFilter();
    flameBP.type = 'bandpass';
    flameBP.frequency.value = 400;
    flameBP.Q.value = 0.5;

    // Faster flickering
    const flameLFO = ctx.createOscillator();
    flameLFO.type = 'sine';
    flameLFO.frequency.value = 0.4;

    const flameLFOGain = ctx.createGain();
    flameLFOGain.gain.value = 0.1;

    const flameGain = ctx.createGain();
    flameGain.gain.value = 0.2;

    flameLFO.connect(flameLFOGain);
    flameLFOGain.connect(flameGain.gain);

    flame.connect(flameBP);
    flameBP.connect(flameGain);
    flameGain.connect(this.masterGain!);
    flame.start();
    flameLFO.start();

    // Layer 3: Crackling - high frequency bursts
    const crackleBuffer = this.createNoiseBuffer('white', 3);
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer;
    crackle.loop = true;

    const crackleBP = ctx.createBiquadFilter();
    crackleBP.type = 'bandpass';
    crackleBP.frequency.value = 2000;
    crackleBP.Q.value = 1.5;

    // High shelf for snap
    const crackleHS = ctx.createBiquadFilter();
    crackleHS.type = 'highshelf';
    crackleHS.frequency.value = 3000;
    crackleHS.gain.value = 4;

    // Irregular modulation for random crackles
    const crackleLFO1 = ctx.createOscillator();
    crackleLFO1.type = 'sawtooth';
    crackleLFO1.frequency.value = 2.3;

    const crackleLFO2 = ctx.createOscillator();
    crackleLFO2.type = 'square';
    crackleLFO2.frequency.value = 0.7;

    const crackleLFOGain = ctx.createGain();
    crackleLFOGain.gain.value = 0.12;

    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.15;

    crackleLFO1.connect(crackleLFOGain);
    crackleLFO2.connect(crackleLFOGain);
    crackleLFOGain.connect(crackleGain.gain);

    crackle.connect(crackleBP);
    crackleBP.connect(crackleHS);
    crackleHS.connect(crackleGain);
    crackleGain.connect(this.masterGain!);
    crackle.start();
    crackleLFO1.start();
    crackleLFO2.start();

    this.nodes.push(
      roar, roarLP, roarLFO, roarLFOGain, roarGain,
      flame, flameBP, flameLFO, flameLFOGain, flameGain,
      crackle, crackleBP, crackleHS, crackleLFO1, crackleLFO2, crackleLFOGain, crackleGain
    );
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

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
