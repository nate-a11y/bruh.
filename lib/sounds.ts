"use client";

// Completion sound using Web Audio API
// This generates a pleasant chime sound without requiring an external file

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioContext;
}

export function playCompletionSound() {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Create a pleasant two-tone chime
    const frequencies = [523.25, 659.25]; // C5 and E5 notes

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now);

      // Envelope: quick attack, short decay
      gainNode.gain.setValueAtTime(0, now + index * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, now + index * 0.1 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.3);

      oscillator.start(now + index * 0.1);
      oscillator.stop(now + index * 0.1 + 0.3);
    });
  } catch (error) {
    // Silently fail if audio is not available
    console.debug("Audio playback failed:", error);
  }
}

export function playTimerEndSound() {
  try {
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Three-tone alert for timer end
    const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5 (A major chord)

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now);

      gainNode.gain.setValueAtTime(0, now + index * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.25, now + index * 0.15 + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.5);

      oscillator.start(now + index * 0.15);
      oscillator.stop(now + index * 0.15 + 0.5);
    });
  } catch (error) {
    console.debug("Audio playback failed:", error);
  }
}
