"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { getFocusSoundPlayer, SOUND_OPTIONS, SoundType } from "@/lib/audio/focus-sounds";
import { cn } from "@/lib/utils";

interface SoundPickerProps {
  defaultSound?: SoundType;
  defaultVolume?: number;
  onSoundChange?: (sound: SoundType) => void;
}

export function SoundPicker({ defaultSound = 'none', defaultVolume = 50, onSoundChange }: SoundPickerProps) {
  const [sound, setSound] = useState<SoundType>(defaultSound);
  const [volume, setVolume] = useState(defaultVolume);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const player = getFocusSoundPlayer();
    return () => {
      player.stop();
    };
  }, []);

  function handleSoundChange(newSound: SoundType) {
    const player = getFocusSoundPlayer();
    setSound(newSound);
    if (newSound === 'none') {
      player.stop();
      setIsPlaying(false);
    } else {
      player.play(newSound, volume / 100);
      setIsPlaying(true);
    }
    onSoundChange?.(newSound);
  }

  function handleVolumeChange(newVolume: number[]) {
    const vol = newVolume[0];
    setVolume(vol);
    getFocusSoundPlayer().setVolume(vol / 100);
  }

  function togglePlayback() {
    const player = getFocusSoundPlayer();
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else if (sound !== 'none') {
      player.play(sound, volume / 100);
      setIsPlaying(true);
    }
  }

  const currentOption = SOUND_OPTIONS.find(o => o.value === sound);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span>{currentOption?.icon}</span>
          <span className="hidden sm:inline">{currentOption?.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="font-medium">Focus Sounds</div>

          {/* Sound options */}
          <div className="grid grid-cols-4 gap-2">
            {SOUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSoundChange(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  sound === option.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Volume */}
          {sound !== 'none' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Volume</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
