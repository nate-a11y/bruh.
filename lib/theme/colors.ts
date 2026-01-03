export const colors = {
  // Core
  black: '#0a0a0a',
  orange: '#ff6b00',
  white: '#ffffff',

  // Surfaces
  surface: {
    base: '#0a0a0a',
    raised: '#141414',
    elevated: '#1a1a1a',
    overlay: '#222222',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#888888',
    muted: '#555555',
    inverse: '#0a0a0a',
  },

  // Accent (Orange spectrum)
  accent: {
    DEFAULT: '#ff6b00',
    hover: '#ff8533',
    muted: '#ff6b0020',
    subtle: '#ff6b0010',
  },

  // Semantic
  success: '#00ff66',
  warning: '#ffcc00',
  danger: '#ff3366',
  info: '#0099ff',

  // Semantic muted (for backgrounds)
  successMuted: '#00ff6615',
  warningMuted: '#ffcc0015',
  dangerMuted: '#ff336615',
  infoMuted: '#0099ff15',
} as const;

export type Colors = typeof colors;
