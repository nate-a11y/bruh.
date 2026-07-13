// Hosted focus-music tracks, served from /public/audio. All tracks are by Kevin
// MacLeod (incompetech.com), licensed under Creative Commons Attribution 4.0 --
// hence MUSIC_ATTRIBUTION, which the UI surfaces.

export interface MusicTrack {
  id: string;
  title: string;
  src: string;
  mood: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "deep-haze", title: "Deep Haze", src: "/audio/deep-haze.mp3", mood: "Ambient" },
  { id: "chill-wave", title: "Chill Wave", src: "/audio/chill-wave.mp3", mood: "Chill" },
  { id: "angel-share", title: "Angel Share", src: "/audio/angel-share.mp3", mood: "Calm" },
  { id: "meditation", title: "Meditation", src: "/audio/meditation.mp3", mood: "Meditative" },
  { id: "dreamy-flashback", title: "Dreamy Flashback", src: "/audio/dreamy-flashback.mp3", mood: "Dreamy" },
  { id: "sovereign", title: "Sovereign", src: "/audio/sovereign.mp3", mood: "Focus" },
];

export const MUSIC_ATTRIBUTION =
  "Music by Kevin MacLeod (incompetech.com), CC BY 4.0";
