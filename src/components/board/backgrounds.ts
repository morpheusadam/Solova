/** Preset board backgrounds (Trello-style solid colors + gradients). */
export const BOARD_BACKGROUNDS = [
  { key: "gradient:brand", css: "linear-gradient(135deg,#E4F0F6 0%,#8BBDD9 55%,#5BA4CF 100%)" },
  { key: "gradient:ocean", css: "linear-gradient(135deg,#0079BF 0%,#00C2E0 100%)" },
  { key: "gradient:sunset", css: "linear-gradient(135deg,#FF9F1A 0%,#EB5A46 60%,#C377E0 100%)" },
  { key: "gradient:forest", css: "linear-gradient(135deg,#0C3953 0%,#006D32 60%,#61BD4F 100%)" },
  { key: "gradient:berry", css: "linear-gradient(135deg,#C377E0 0%,#FF78CB 100%)" },
  { key: "gradient:slate", css: "linear-gradient(135deg,#172B4D 0%,#42526E 100%)" },
  { key: "color:#0079BF", css: "#0079BF" },
  { key: "color:#61BD4F", css: "#61BD4F" },
  { key: "color:#FF9F1A", css: "#FF9F1A" },
  { key: "color:#EB5A46", css: "#EB5A46" },
  { key: "color:#C377E0", css: "#C377E0" },
  { key: "color:#344563", css: "#344563" },
] as const;

export function boardBackgroundCss(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  const preset = BOARD_BACKGROUNDS.find((b) => b.key === key);
  if (preset) return preset.css;
  if (key.startsWith("color:")) return key.slice(6);
  return undefined;
}
