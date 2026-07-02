/**
 * Wallpaper & background registry.
 *
 * A background value is one of:
 *   "wp-<name>"      → SVG wallpaper in /public/wallpapers/<name>.svg
 *   "gradient:<key>" → a built-in CSS gradient
 *   "color:#rrggbb"  → a solid color
 *
 * Board backgrounds and the app background both draw from this set, so a
 * single picker component (BackgroundPicker) serves both.
 */

export interface GradientPreset {
  key: string;
  css: string;
}

export const GRADIENTS: GradientPreset[] = [
  { key: "gradient:brand", css: "linear-gradient(135deg,#E4F0F6 0%,#8BBDD9 55%,#5BA4CF 100%)" },
  { key: "gradient:ocean", css: "linear-gradient(135deg,#0079BF 0%,#00C2E0 100%)" },
  { key: "gradient:sunset", css: "linear-gradient(135deg,#FF9F1A 0%,#EB5A46 60%,#C377E0 100%)" },
  { key: "gradient:forest", css: "linear-gradient(135deg,#0C3953 0%,#006D32 60%,#61BD4F 100%)" },
  { key: "gradient:berry", css: "linear-gradient(135deg,#C377E0 0%,#FF78CB 100%)" },
  { key: "gradient:slate", css: "linear-gradient(135deg,#172B4D 0%,#42526E 100%)" },
];

export const SOLIDS: string[] = [
  "color:#0079BF",
  "color:#61BD4F",
  "color:#FF9F1A",
  "color:#EB5A46",
  "color:#C377E0",
  "color:#344563",
];

/** 24 generated SVG wallpapers (keep in sync with public/wallpapers/manifest.json). */
export const WALLPAPERS: string[] = [
  "aurora", "ocean", "dusk", "sunset", "forest", "berry",
  "slate", "mint", "ember", "indigo", "peach", "teal",
  "grape", "sky", "coral", "lagoon", "plum", "sand",
  "rose", "steel", "lime", "magma", "twilight", "glacier",
].map((n) => `wp-${n}`);

/** CSS `background` value for any background key (or undefined = app default). */
export function backgroundCss(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("wp-")) {
    return `url("/wallpapers/${value}.svg") center / cover no-repeat`;
  }
  if (value.startsWith("color:")) return value.slice(6);
  const preset = GRADIENTS.find((g) => g.key === value);
  return preset?.css;
}

/** A small CSS value suitable for a swatch/thumbnail preview. */
export function swatchCss(value: string): string {
  if (value.startsWith("wp-")) return `url("/wallpapers/${value}.svg") center / cover no-repeat`;
  if (value.startsWith("color:")) return value.slice(6);
  return GRADIENTS.find((g) => g.key === value)?.css ?? value;
}
