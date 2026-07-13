"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { useUpgrade } from "@/components/billing/use-upgrade";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Minimal typings for the Web Speech API. The DOM lib does not ship these, and
 * we only need the slice we use, so we declare a narrow shape rather than pull
 * `any` into the component.
 */
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser support never changes at runtime, so the store is static: an empty
// subscribe, a client snapshot that checks the API, and `false` on the server
// (which matches the first client render, then flips after hydration).
const noopSubscribe = () => () => {};
const getSupportSnapshot = () => getSpeechRecognition() !== null;
const getSupportServerSnapshot = () => false;

interface VoiceBrainDumpProps {
  /** Whether the current user has Pro access. Non-Pro taps open the upgrade modal. */
  isPro: boolean;
  /** Receives each finalized chunk of transcribed speech to append to the input. */
  onTranscript: (text: string) => void;
  /** Disable the control (e.g. while the dump is being processed). */
  disabled?: boolean;
}

/**
 * Mic button that dictates speech into the brain dump input via the Web Speech
 * API. Pro-gated on the client: free users get the upgrade modal instead of a
 * recording session. Hides gracefully to a disabled state with a tooltip when
 * the browser has no SpeechRecognition support.
 */
export function VoiceBrainDump({ isPro, onTranscript, disabled }: VoiceBrainDumpProps) {
  const upgrade = useUpgrade("voice_brain_dump");
  const supported = useSyncExternalStore(
    noopSubscribe,
    getSupportSnapshot,
    getSupportServerSnapshot
  );
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep the latest callback without re-binding recognition handlers.
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Tear down any live session on unmount.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startRecording = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }
      const trimmed = finalText.trim();
      if (trimmed) {
        onTranscriptRef.current(trimmed);
      }
    };

    recognition.onerror = () => {
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecording(true);
      trackEvent("feature_used", { feature: "voice_brain_dump" });
    } catch {
      // start() throws if already started; reset state defensively.
      setRecording(false);
      recognitionRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isPro) {
      upgrade.openUpgrade();
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    startRecording();
  }, [isPro, recording, startRecording, stopRecording, upgrade]);

  const tooltipLabel = useMemo(() => {
    if (!supported) return "Voice input isn't supported in this browser";
    if (!isPro) return "Voice brain dump is a Pro feature";
    return recording ? "Stop recording" : "Speak your brain dump";
  }, [supported, isPro, recording]);

  // No SpeechRecognition: render a disabled control with an explanatory tooltip.
  if (!supported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wrapper span keeps the tooltip working on a disabled button. */}
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                aria-label={tooltipLabel}
              >
                <MicOff className="h-4 w-4" aria-hidden="true" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={recording ? "default" : "outline"}
              size="icon"
              onClick={handleClick}
              disabled={disabled}
              aria-label={tooltipLabel}
              aria-pressed={recording}
              className={cn(
                recording &&
                  "relative bg-primary text-primary-foreground hover:bg-bruh-orange-hover"
              )}
            >
              {recording && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-md bg-primary/40"
                  aria-hidden="true"
                />
              )}
              <Mic
                className={cn("relative h-4 w-4", recording && "animate-pulse")}
                aria-hidden="true"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <UpgradeModal
        open={upgrade.open}
        onOpenChange={upgrade.setOpen}
        onUpgrade={upgrade.startCheckout}
        loading={upgrade.checkingOut}
        feature="Voice brain dump"
      />
    </>
  );
}
