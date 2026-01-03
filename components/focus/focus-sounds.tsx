"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, CloudRain, Coffee, Music, Wind, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateFocusSoundPreference } from "@/app/(dashboard)/actions";

export type FocusSoundType = "none" | "rain" | "cafe" | "lofi" | "whitenoise" | "nature";

interface SoundOption {
  id: FocusSoundType;
  name: string;
  icon: React.ReactNode;
  // Using Web Audio API to generate sounds
  frequency?: number;
  type?: OscillatorType;
}

const SOUND_OPTIONS: SoundOption[] = [
  { id: "none", name: "None", icon: <VolumeX className="h-4 w-4" /> },
  { id: "rain", name: "Rain", icon: <CloudRain className="h-4 w-4" /> },
  { id: "cafe", name: "Cafe", icon: <Coffee className="h-4 w-4" /> },
  { id: "lofi", name: "Lo-Fi", icon: <Music className="h-4 w-4" /> },
  { id: "whitenoise", name: "White Noise", icon: <Wind className="h-4 w-4" /> },
  { id: "nature", name: "Nature", icon: <Trees className="h-4 w-4" /> },
];

interface FocusSoundsProps {
  defaultSound?: FocusSoundType;
  defaultVolume?: number;
  isPlaying?: boolean;
}

export function FocusSounds({
  defaultSound = "none",
  defaultVolume = 50,
  isPlaying = false
}: FocusSoundsProps) {
  const [sound, setSound] = useState<FocusSoundType>(defaultSound);
  const [volume, setVolume] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Create noise generator
  const createNoiseBuffer = (type: FocusSoundType): AudioBuffer | null => {
    if (!audioContextRef.current) return null;

    const ctx = audioContextRef.current;
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of audio
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      switch (type) {
        case "whitenoise":
          // Pure white noise
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          break;
        case "rain":
          // Brown noise (rain-like) - accumulated white noise
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Boost volume
          }
          break;
        case "nature":
          // Pink noise (nature-like)
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
          }
          break;
        case "cafe":
          // Filtered noise with occasional variations
          let lastCafe = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Low-pass filter for murmur effect
            data[i] = lastCafe * 0.95 + white * 0.05;
            lastCafe = data[i];
            // Add occasional "clinks" and variations
            if (Math.random() < 0.0001) {
              data[i] += (Math.random() - 0.5) * 0.3;
            }
          }
          break;
        case "lofi":
          // Filtered warm noise
          let lastLofi = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Heavier low-pass for warmth
            data[i] = lastLofi * 0.97 + white * 0.03;
            lastLofi = data[i];
            // Add subtle vinyl crackle
            if (Math.random() < 0.001) {
              data[i] += (Math.random() - 0.5) * 0.1;
            }
          }
          break;
        default:
          return null;
      }
    }

    return buffer;
  };

  const startSound = () => {
    if (sound === "none") return;

    stopSound();

    try {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioContextRef.current;

      const buffer = createNoiseBuffer(sound);
      if (!buffer) return;

      noiseNodeRef.current = ctx.createBufferSource();
      noiseNodeRef.current.buffer = buffer;
      noiseNodeRef.current.loop = true;

      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;

      noiseNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);

      noiseNodeRef.current.start();
    } catch (e) {
      console.error("Failed to start focus sound:", e);
    }
  };

  const stopSound = () => {
    try {
      noiseNodeRef.current?.stop();
      noiseNodeRef.current?.disconnect();
      audioContextRef.current?.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
    noiseNodeRef.current = null;
    audioContextRef.current = null;
    gainNodeRef.current = null;
  };

  // Start/stop based on isPlaying
  useEffect(() => {
    if (isPlaying && sound !== "none") {
      startSound();
    } else {
      stopSound();
    }

    return () => stopSound();
  }, [isPlaying, sound]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handleSoundChange = async (newSound: FocusSoundType) => {
    setSound(newSound);
    await updateFocusSoundPreference(newSound, volume);

    if (isPlaying) {
      stopSound();
      if (newSound !== "none") {
        setTimeout(startSound, 100);
      }
    }
  };

  const handleVolumeChange = async (newVolume: number[]) => {
    setVolume(newVolume[0]);
    await updateFocusSoundPreference(sound, newVolume[0]);
  };

  const currentSound = SOUND_OPTIONS.find(s => s.id === sound);

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
            {currentSound?.name || "Sounds"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="font-medium text-sm">Focus Sounds</div>

          <div className="grid grid-cols-3 gap-2">
            {SOUND_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={sound === option.id ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={() => handleSoundChange(option.id)}
              >
                {option.icon}
                <span className="text-xs">{option.name}</span>
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
            Ambient sounds play during focus sessions
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
