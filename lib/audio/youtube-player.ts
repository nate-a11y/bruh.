'use client';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

export type FocusMusicCategory = 'brainfm' | 'lofi' | 'ambient' | 'custom';

export interface FocusTrack {
  id: string;
  videoId: string;
  title: string;
  category: FocusMusicCategory;
  duration?: string;
}

// Curated Brain.fm playlist from YouTube
export const BRAINFM_TRACKS: FocusTrack[] = [
  { id: '1', videoId: 'uc_vy0B2Uho', title: '30 Min Focus Sprint', category: 'brainfm', duration: '30:00' },
  { id: '2', videoId: 'LIDTKOxvx8', title: 'Deep Focus Session', category: 'brainfm' },
  { id: '3', videoId: 'NGNqNHqH9Nw', title: 'Focus Flow', category: 'brainfm' },
  { id: '4', videoId: 'DKPZslKCeiw', title: 'Concentration Mode', category: 'brainfm' },
  { id: '5', videoId: 'IMerWLNDYxU', title: 'Neural Focus', category: 'brainfm' },
  { id: '6', videoId: 'UpPmnnJcy6A', title: 'Focus Beats', category: 'brainfm' },
];

// Popular lo-fi channels/tracks
export const LOFI_TRACKS: FocusTrack[] = [
  { id: 'lofi1', videoId: 'jfKfPfyJRdk', title: 'Lofi Girl Radio', category: 'lofi' },
  { id: 'lofi2', videoId: '5qap5aO4i9A', title: 'Chillhop Radio', category: 'lofi' },
];

// Ambient/nature sounds
export const AMBIENT_TRACKS: FocusTrack[] = [
  { id: 'amb1', videoId: 'mPZkdNFkNps', title: 'Rain Sounds', category: 'ambient' },
  { id: 'amb2', videoId: 'V1bFr2SWP1I', title: 'Fireplace', category: 'ambient' },
];

export const ALL_TRACKS = [...BRAINFM_TRACKS, ...LOFI_TRACKS, ...AMBIENT_TRACKS];

class YouTubePlayerManager {
  private player: YTPlayer | null = null;
  private isReady = false;
  private pendingPlay: { videoId: string; volume: number } | null = null;
  private currentVideoId: string | null = null;
  private volume = 50;
  private isPlaying = false;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadYouTubeAPI();
    }
  }

  private loadYouTubeAPI() {
    // Check if already loaded
    if (window.YT && window.YT.Player) {
      this.initPlayer();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      return;
    }

    // Load the YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      this.initPlayer();
    };
  }

  private initPlayer() {
    // Create a hidden container for the player
    let container = document.getElementById('youtube-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'youtube-player-container';
      container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; overflow: hidden;';
      document.body.appendChild(container);

      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-focus-player';
      container.appendChild(playerDiv);
    }

    this.player = new window.YT.Player('youtube-focus-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      },
      events: {
        onReady: () => {
          this.isReady = true;
          if (this.pendingPlay) {
            this.play(this.pendingPlay.videoId, this.pendingPlay.volume);
            this.pendingPlay = null;
          }
        },
        onStateChange: (event) => {
          // YouTube PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
          const playing = event.data === 1;
          this.isPlaying = playing;

          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(playing);
          }

          // Auto-replay when video ends (for continuous focus music)
          if (event.data === 0 && this.currentVideoId) {
            this.player?.playVideo();
          }
        },
        onError: (event) => {
          console.error('YouTube player error:', event.data);
          this.isPlaying = false;
        },
      },
    });
  }

  play(videoId: string, volume: number = 50) {
    this.volume = volume;

    if (!this.isReady || !this.player) {
      this.pendingPlay = { videoId, volume };
      this.loadYouTubeAPI();
      return;
    }

    if (this.currentVideoId === videoId) {
      // Same video, just resume
      this.player.playVideo();
    } else {
      // New video
      this.currentVideoId = videoId;
      this.player.loadVideoById(videoId);
    }

    this.player.setVolume(volume);
    this.isPlaying = true;
  }

  pause() {
    if (this.player && this.isReady) {
      this.player.pauseVideo();
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.player && this.isReady) {
      this.player.stopVideo();
      this.isPlaying = false;
      this.currentVideoId = null;
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.player && this.isReady) {
      this.player.setVolume(volume);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  onStateChange(callback: (isPlaying: boolean) => void) {
    this.onStateChangeCallback = callback;
  }

  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
let playerInstance: YouTubePlayerManager | null = null;

export function getYouTubePlayer(): YouTubePlayerManager {
  if (typeof window === 'undefined') {
    // Return a mock for SSR
    return {
      play: () => {},
      pause: () => {},
      stop: () => {},
      setVolume: () => {},
      getVolume: () => 50,
      getCurrentVideoId: () => null,
      getIsPlaying: () => false,
      onStateChange: () => {},
      destroy: () => {},
    } as unknown as YouTubePlayerManager;
  }

  if (!playerInstance) {
    playerInstance = new YouTubePlayerManager();
  }

  return playerInstance;
}

// Helper to extract video ID from YouTube URL
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
