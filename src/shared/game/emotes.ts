// Emotes: /wave, /dance, … Shown as a character animation plus a little icon.

export const EMOTES: Record<string, { icon: string; label: string; loop: boolean }> = {
  wave: { icon: "👋", label: "Wave", loop: false },
  dance: { icon: "💃", label: "Dance", loop: true },
  cheer: { icon: "🎉", label: "Cheer", loop: false },
  bow: { icon: "🙇", label: "Bow", loop: false },
  sit: { icon: "🪑", label: "Sit", loop: true },
  laugh: { icon: "😂", label: "Laugh", loop: false },
  cry: { icon: "😢", label: "Cry", loop: false },
  heart: { icon: "💖", label: "Love", loop: false }
};

export const EMOTE_MS = 4000;
