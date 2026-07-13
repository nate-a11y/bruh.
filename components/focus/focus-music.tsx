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
import {
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Waves,
  CloudRain,
  Flame,
  TreePine,
  Wind,
  Coffee,
} from 'lucide-react';
import { getTrackPlayer } from '@/lib/audio/track-player';
import { MUSIC_TRACKS, MUSIC_ATTRIBUTION, type MusicTrack } from '@/lib/audio/music-tracks';
import { getFocusSoundPlayer, type SoundType } from '@/lib/audio/focus-sounds';
import { cn } from '@/lib/utils';

interface FocusMusicProps {
  isTimerRunning: boolean;
  defaultVolume?: number;
  onMusicChange?: (type: 'music' | 'ambient' | 'none', id?: string) => void;
}

type AudioSource = 'none' | 'music' | 'ambient';

const AMBIENT_OPTIONS: { value: SoundType; label: string; icon: React.ReactNode }[] = [
  { value: 'rain', label: 'Rain', icon: <CloudRain className="h-4 w-4" /> },
  { value: 'ocean', label: 'Ocean', icon: <Waves className="h-4 w-4" /> },
  { value: 'fireplace', label: 'Fire', icon: <Flame className="h-4 w-4" /> },
  { value: 'nature', label: 'Forest', icon: <TreePine className="h-4 w-4" /> },
  { value: 'whitenoise', label: 'White', icon: <Wind className="h-4 w-4" /> },
  { value: 'cafe', label: 'Cafe', icon: <Coffee className="h-4 w-4" /> },
];

export function FocusMusic({
  isTimerRunning,
  defaultVolume = 50,
  onMusicChange,
}: FocusMusicProps) {
  const [audioSource, setAudioSource] = useState<AudioSource>('none');
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [selectedAmbient, setSelectedAmbient] = useState<SoundType>('none');
  const [volume, setVolume] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Pause music/ambient when the timer stops; resume when it starts again (as
  // long as something is selected and we are not muted). The initial play always
  // originates from a track/ambient click, so mobile autoplay restrictions are
  // satisfied before this effect ever resumes playback.
  useEffect(() => {
    if (audioSource === 'none') return;

    if (!isTimerRunning) {
      if (audioSource === 'music') getTrackPlayer().pause();
      else getFocusSoundPlayer().stop();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
    }
  }, [isTimerRunning, audioSource]);

  // Handle volume changes.
  useEffect(() => {
    if (isMuted) return;
    if (audioSource === 'music') getTrackPlayer().setVolume(volume);
    else if (audioSource === 'ambient') getFocusSoundPlayer().setVolume(volume / 100);
  }, [volume, audioSource, isMuted]);

  // Handle mute toggle.
  useEffect(() => {
    if (audioSource === 'music') {
      getTrackPlayer().setVolume(isMuted ? 0 : volume);
    } else if (audioSource === 'ambient') {
      if (isMuted) getFocusSoundPlayer().stop();
      else if (isPlaying && selectedAmbient !== 'none') {
        getFocusSoundPlayer().play(selectedAmbient, volume / 100);
      }
    }
  }, [isMuted, audioSource, volume, isPlaying, selectedAmbient]);

  const handleTrackSelect = useCallback((track: MusicTrack) => {
    getFocusSoundPlayer().stop();
    setAudioSource('music');
    setSelectedTrack(track);
    setSelectedAmbient('none');
    // Start on the click (user gesture) so mobile allows playback.
    getTrackPlayer().play(track.src, isMuted ? 0 : volume);
    setIsPlaying(!isMuted);
    onMusicChange?.('music', track.id);
  }, [isMuted, volume, onMusicChange]);

  const handleAmbientSelect = useCallback((sound: SoundType) => {
    getTrackPlayer().pause();

    if (sound === selectedAmbient) {
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
    if (!isMuted) {
      getFocusSoundPlayer().play(sound, volume / 100);
      setIsPlaying(true);
    }
    onMusicChange?.('ambient', sound);
  }, [selectedAmbient, isMuted, volume, onMusicChange]);

  const handleTogglePlayPause = useCallback(() => {
    if (audioSource === 'none') return;

    if (isPlaying) {
      if (audioSource === 'music') getTrackPlayer().pause();
      else getFocusSoundPlayer().stop();
      setIsPlaying(false);
    } else {
      if (audioSource === 'music' && selectedTrack) {
        getTrackPlayer().play(selectedTrack.src, isMuted ? 0 : volume);
      } else if (audioSource === 'ambient' && selectedAmbient !== 'none') {
        getFocusSoundPlayer().play(selectedAmbient, volume / 100);
      }
      setIsPlaying(true);
    }
  }, [audioSource, isPlaying, selectedTrack, selectedAmbient, isMuted, volume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
    setIsMuted(false);
  }, []);

  const stopAll = useCallback(() => {
    getTrackPlayer().stop();
    getFocusSoundPlayer().stop();
    setAudioSource('none');
    setSelectedTrack(null);
    setSelectedAmbient('none');
    setIsPlaying(false);
    onMusicChange?.('none');
  }, [onMusicChange]);

  const currentLabel = audioSource === 'music' && selectedTrack
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
          className={cn('gap-2', isPlaying && 'text-primary')}
        >
          <Music className={cn('h-4 w-4', isPlaying && 'animate-pulse')} />
          <span className="hidden sm:inline max-w-24 truncate">{currentLabel}</span>
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

          <Tabs defaultValue="music" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="music" className="text-xs">
                <Music className="h-3 w-3 mr-1" />
                Music
              </TabsTrigger>
              <TabsTrigger value="ambient" className="text-xs">
                <Waves className="h-3 w-3 mr-1" />
                Ambient
              </TabsTrigger>
            </TabsList>

            <TabsContent value="music" className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {MUSIC_TRACKS.map((track) => (
                  <Button
                    key={track.id}
                    variant={selectedTrack?.id === track.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 px-3 justify-start text-left flex-col items-start gap-0.5"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <span className="truncate text-xs w-full">{track.title}</span>
                    <span className="truncate text-[10px] text-muted-foreground w-full">{track.mood}</span>
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{MUSIC_ATTRIBUTION}</p>
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
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? 'Unmute music' : 'Mute music'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
