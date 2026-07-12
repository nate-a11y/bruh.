"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateFocusSoundPreference } from "@/app/(dashboard)/actions";
import {
  getFocusSoundPlayer,
  SOUND_OPTIONS,
  type SoundType
} from "@/lib/audio/focus-sounds";

interface FocusSoundsProps {
  defaultSound?: SoundType;
  defaultVolume?: number;
  isPlaying?: boolean;
}

export function FocusSounds({
  defaultSound = "none",
  defaultVolume = 50,
  isPlaying = false
}: FocusSoundsProps) {
  const [sound, setSound] = useState<SoundType>(defaultSound);
  const [volume, setVolume] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);

  // Control playback based on isPlaying and sound selection
  useEffect(() => {
    const player = getFocusSoundPlayer();

    if (isPlaying && sound !== "none" && !isMuted) {
      player.play(sound, volume / 100);
    } else {
      player.stop();
    }

    return () => {
      player.stop();
    };
  }, [isPlaying, sound, isMuted]);

  // Update volume in real-time
  useEffect(() => {
    const player = getFocusSoundPlayer();
    if (isMuted) {
      player.setVolume(0);
    } else {
      player.setVolume(volume / 100);
    }
  }, [volume, isMuted]);

  const handleSoundChange = async (newSound: SoundType) => {
    const player = getFocusSoundPlayer();

    setSound(newSound);
    await updateFocusSoundPreference(newSound, volume);

    if (isPlaying && newSound !== "none" && !isMuted) {
      player.play(newSound, volume / 100);
    } else {
      player.stop();
    }
  };

  const handleVolumeChange = async (newVolume: number[]) => {
    setVolume(newVolume[0]);
    await updateFocusSoundPreference(sound, newVolume[0]);
  };

  const currentSound = SOUND_OPTIONS.find(s => s.value === sound);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            sound !== "none" && isPlaying && "text-primary"
          )}
        >
          {sound === "none" ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {currentSound?.label || "Sounds"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="font-medium text-sm">Focus Sounds</div>

          <div className="grid grid-cols-4 gap-2">
            {SOUND_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={sound === option.value ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={() => handleSoundChange(option.value)}
              >
                <span className="text-lg">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </Button>
            ))}
          </div>

          {sound !== "none" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Procedurally generated ambient sounds - no downloads needed
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Re-export types for convenience
export type { SoundType };
