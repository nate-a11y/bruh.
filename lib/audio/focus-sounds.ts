export type SoundType = 'none' | 'rain' | 'cafe' | 'lofi' | 'whitenoise' | 'nature' | 'fireplace' | 'ocean';

export const SOUND_OPTIONS: { value: SoundType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '🔇' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'lofi', label: 'Lo-Fi', icon: '🎵' },
  { value: 'whitenoise', label: 'White Noise', icon: '📻' },
  { value: 'nature', label: 'Nature', icon: '🌲' },
  { value: 'fireplace', label: 'Fireplace', icon: '🔥' },
  { value: 'ocean', label: 'Ocean', icon: '🌊' },
];

// URLs to royalty-free ambient sounds (host these on your CDN)
export const SOUND_URLS: Record<SoundType, string> = {
  none: '',
  rain: '/sounds/rain.mp3',
  cafe: '/sounds/cafe.mp3',
  lofi: '/sounds/lofi.mp3',
  whitenoise: '/sounds/whitenoise.mp3',
  nature: '/sounds/nature.mp3',
  fireplace: '/sounds/fireplace.mp3',
  ocean: '/sounds/ocean.mp3',
};

class FocusSoundPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentSound: SoundType = 'none';

  play(sound: SoundType, volume: number = 0.5) {
    this.stop();

    if (sound === 'none') return;

    const url = SOUND_URLS[sound];
    if (!url) return;

    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
    this.audio.play().catch(console.error);
    this.currentSound = sound;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.currentSound = 'none';
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentSound() {
    return this.currentSound;
  }

  isPlaying() {
    return this.audio !== null && !this.audio.paused;
  }
}

// Singleton instance
let playerInstance: FocusSoundPlayer | null = null;

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
    playerInstance = new FocusSoundPlayer();
  }
  return playerInstance;
}
