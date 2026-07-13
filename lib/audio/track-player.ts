"use client";

// Plays hosted audio tracks via a single HTMLAudioElement. Unlike the old hidden
// YouTube iframe (which mobile browsers block from playing offscreen), a native
// <audio> element plays reliably on mobile and desktop once started by a user
// gesture. Volume is 0-100 to match the rest of the focus-music UI.
export interface TrackPlayerInterface {
  play: (src: string, volume?: number) => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  getCurrentSrc: () => string | null;
  isPlaying: () => boolean;
}

class TrackPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentSrc: string | null = null;
  private volume = 50;

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = "none";
      this.audio.volume = this.volume / 100;
    }
    return this.audio;
  }

  play(src: string, volume = 50) {
    this.volume = volume;
    const audio = this.ensureAudio();
    if (!audio) return;
    if (this.currentSrc !== src) {
      audio.src = src;
      this.currentSrc = src;
    }
    audio.volume = volume / 100;
    // play() may reject if not user-initiated; swallow so we never throw.
    void audio.play().catch(() => {});
  }

  pause() {
    this.audio?.pause();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.currentSrc = null;
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.audio) this.audio.volume = volume / 100;
  }

  getCurrentSrc() {
    return this.currentSrc;
  }

  isPlaying() {
    return !!this.audio && !this.audio.paused;
  }
}

let instance: TrackPlayer | null = null;

export function getTrackPlayer(): TrackPlayerInterface {
  if (typeof window === "undefined") {
    return {
      play: () => {},
      pause: () => {},
      stop: () => {},
      setVolume: () => {},
      getCurrentSrc: () => null,
      isPlaying: () => false,
    };
  }
  if (!instance) instance = new TrackPlayer();
  return instance;
}
