'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  Brain,
  Radio,
  Waves,
  CloudRain,
  Flame,
  TreePine,
  Wind,
  Coffee,
} from 'lucide-react';
import {
  getYouTubePlayer,
  BRAINFM_TRACKS,
  LOFI_TRACKS,
  AMBIENT_TRACKS,
  extractVideoId,
  type FocusTrack,
} from '@/lib/audio/youtube-player';
import { getFocusSoundPlayer, type SoundType } from '@/lib/audio/focus-sounds';
import { cn } from '@/lib/utils';

interface FocusMusicProps {
  isTimerRunning: boolean;
  defaultVolume?: number;
  onMusicChange?: (type: 'youtube' | 'ambient' | 'none', id?: string) => void;
}

type AudioSource = 'none' | 'youtube' | 'ambient';

const AMBIENT_OPTIONS: { value: SoundType; label: string; icon: React.ReactNode }[] = [
  { value: 'rain', label: 'Rain', icon: <CloudRain className="h-4 w-4" /> },
  { value: 'ocean', label: 'Ocean', icon: <Waves className="h-4 w-4" /> },
  { value: 'fireplace', label: 'Fire', icon: <Flame className="h-4 w-4" /> },
  { value: 'nature', label: 'Forest', icon: <TreePine className="h-4 w-4" /> },
  { value: 'whitenoise', label: 'White', icon: <Wind className="h-4 w-4" /> },
  { value: 'cafe', label: 'Brown', icon: <Coffee className="h-4 w-4" /> },
];

export function FocusMusic({
  isTimerRunning,
  defaultVolume = 50,
  onMusicChange,
}: FocusMusicProps) {
  const [audioSource, setAudioSource] = useState<AudioSource>('none');
  const [selectedTrack, setSelectedTrack] = useState<FocusTrack | null>(null);
  const [selectedAmbient, setSelectedAmbient] = useState<SoundType>('none');
  const [volume, setVolume] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTracks, setCustomTracks] = useState<FocusTrack[]>([]);

  // Handle timer state changes
  useEffect(() => {
    if (audioSource === 'none') return;

    if (isTimerRunning && !isMuted) {
      if (audioSource === 'youtube' && selectedTrack) {
        const player = getYouTubePlayer();
        player.play(selectedTrack.videoId, volume);
        setIsPlaying(true);
      } else if (audioSource === 'ambient' && selectedAmbient !== 'none') {
        const player = getFocusSoundPlayer();
        player.play(selectedAmbient, volume / 100);
        setIsPlaying(true);
      }
    } else {
      // Pause when timer stops
      if (audioSource === 'youtube') {
        const player = getYouTubePlayer();
        player.pause();
      } else if (audioSource === 'ambient') {
        const player = getFocusSoundPlayer();
        player.stop();
      }
      setIsPlaying(false);
    }
  }, [isTimerRunning, audioSource, selectedTrack, selectedAmbient, isMuted, volume]);

  // Handle volume changes
  useEffect(() => {
    if (isMuted) return;

    if (audioSource === 'youtube') {
      const player = getYouTubePlayer();
      player.setVolume(volume);
    } else if (audioSource === 'ambient') {
      const player = getFocusSoundPlayer();
      player.setVolume(volume / 100);
    }
  }, [volume, audioSource, isMuted]);

  // Handle mute
  useEffect(() => {
    if (audioSource === 'youtube') {
      const player = getYouTubePlayer();
      player.setVolume(isMuted ? 0 : volume);
    } else if (audioSource === 'ambient') {
      const player = getFocusSoundPlayer();
      if (isMuted) {
        player.stop();
      } else if (isTimerRunning && selectedAmbient !== 'none') {
        player.play(selectedAmbient, volume / 100);
      }
    }
  }, [isMuted, audioSource, volume, isTimerRunning, selectedAmbient]);

  const handleTrackSelect = useCallback((track: FocusTrack) => {
    // Stop any current playback
    getFocusSoundPlayer().stop();

    setAudioSource('youtube');
    setSelectedTrack(track);
    setSelectedAmbient('none');

    if (isTimerRunning && !isMuted) {
      const player = getYouTubePlayer();
      player.play(track.videoId, volume);
      setIsPlaying(true);
    }

    onMusicChange?.('youtube', track.videoId);
  }, [isTimerRunning, isMuted, volume, onMusicChange]);

  const handleAmbientSelect = useCallback((sound: SoundType) => {
    // Stop YouTube
    getYouTubePlayer().pause();

    if (sound === selectedAmbient) {
      // Toggle off
      getFocusSoundPlayer().stop();
      setAudioSource('none');
      setSelectedAmbient('none');
      setIsPlaying(false);
      onMusicChange?.('none');
      return;
    }

    setAudioSource('ambient');
    setSelectedAmbient(sound);
    setSelectedTrack(null);

    if (isTimerRunning && !isMuted) {
      const player = getFocusSoundPlayer();
      player.play(sound, volume / 100);
      setIsPlaying(true);
    }

    onMusicChange?.('ambient', sound);
  }, [selectedAmbient, isTimerRunning, isMuted, volume, onMusicChange]);

  const handleAddCustom = useCallback(() => {
    const videoId = extractVideoId(customUrl);
    if (!videoId) return;

    const newTrack: FocusTrack = {
      id: `custom-${Date.now()}`,
      videoId,
      title: `Custom Track`,
      category: 'custom',
    };

    setCustomTracks((prev) => [...prev, newTrack]);
    setCustomUrl('');
    handleTrackSelect(newTrack);
  }, [customUrl, handleTrackSelect]);

  const handleTogglePlayPause = useCallback(() => {
    if (audioSource === 'none') return;

    if (isPlaying) {
      if (audioSource === 'youtube') {
        getYouTubePlayer().pause();
      } else {
        getFocusSoundPlayer().stop();
      }
      setIsPlaying(false);
    } else {
      if (audioSource === 'youtube' && selectedTrack) {
        getYouTubePlayer().play(selectedTrack.videoId, volume);
      } else if (audioSource === 'ambient' && selectedAmbient !== 'none') {
        getFocusSoundPlayer().play(selectedAmbient, volume / 100);
      }
      setIsPlaying(true);
    }
  }, [audioSource, isPlaying, selectedTrack, selectedAmbient, volume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  }, []);

  const stopAll = useCallback(() => {
    getYouTubePlayer().stop();
    getFocusSoundPlayer().stop();
    setAudioSource('none');
    setSelectedTrack(null);
    setSelectedAmbient('none');
    setIsPlaying(false);
    onMusicChange?.('none');
  }, [onMusicChange]);

  const currentLabel = audioSource === 'youtube' && selectedTrack
    ? selectedTrack.title
    : audioSource === 'ambient' && selectedAmbient !== 'none'
    ? AMBIENT_OPTIONS.find((o) => o.value === selectedAmbient)?.label
    : 'Music';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            isPlaying && "text-primary"
          )}
        >
          {isPlaying ? (
            <Music className="h-4 w-4 animate-pulse" />
          ) : (
            <Music className="h-4 w-4" />
          )}
          <span className="hidden sm:inline max-w-24 truncate">
            {currentLabel}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Focus Music</span>
            {audioSource !== 'none' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={stopAll}
              >
                Stop
              </Button>
            )}
          </div>

          <Tabs defaultValue="focus" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="focus" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Focus
              </TabsTrigger>
              <TabsTrigger value="lofi" className="text-xs">
                <Radio className="h-3 w-3 mr-1" />
                Lo-fi
              </TabsTrigger>
              <TabsTrigger value="ambient" className="text-xs">
                <Waves className="h-3 w-3 mr-1" />
                Ambient
              </TabsTrigger>
            </TabsList>

            <TabsContent value="focus" className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {BRAINFM_TRACKS.map((track) => (
                  <Button
                    key={track.id}
                    variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 px-3 justify-start text-left"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className="truncate text-xs">{track.title}</div>
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Powered by Brain.fm via YouTube
              </p>
            </TabsContent>

            <TabsContent value="lofi" className="mt-3 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {LOFI_TRACKS.map((track) => (
                  <Button
                    key={track.id}
                    variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 px-3 justify-start"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className="truncate text-xs">{track.title}</div>
                  </Button>
                ))}
                {customTracks.map((track) => (
                  <Button
                    key={track.id}
                    variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 px-3 justify-start"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <div className="truncate text-xs">{track.title}</div>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste YouTube URL..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleAddCustom}
                  disabled={!customUrl}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ambient" className="mt-3">
              <div className="grid grid-cols-3 gap-2">
                {AMBIENT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedAmbient === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 flex-col gap-1"
                    onClick={() => handleAmbientSelect(option.value)}
                  >
                    {option.icon}
                    <span className="text-[10px]">{option.label}</span>
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Procedurally generated ambient sounds
              </p>
            </TabsContent>
          </Tabs>

          {/* Volume & Controls */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleTogglePlayPause}
                disabled={audioSource === 'none'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {isMuted ? 0 : volume}%
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
