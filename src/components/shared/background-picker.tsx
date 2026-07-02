"use client";

import { Check } from "lucide-react";

import { GRADIENTS, SOLIDS, WALLPAPERS, swatchCss } from "~/lib/wallpapers";
import { cn } from "~/lib/utils";

function Swatch({
  value,
  selected,
  onSelect,
}: {
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Background ${value}`}
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={cn(
        "relative h-12 cursor-pointer rounded-sm ring-offset-2 ring-offset-[var(--surface-glass-overlay)]",
        selected && "ring-2 ring-[var(--border-focus)]",
      )}
      style={{ background: swatchCss(value) }}
    >
      {selected ? (
        <Check
          aria-hidden
          className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow"
        />
      ) : null}
    </button>
  );
}

/** Wallpaper + gradient + solid picker, shared by boards and app background. */
export function BackgroundPicker({
  value,
  onSelect,
  showDefault,
}: {
  value: string | null | undefined;
  onSelect: (value: string | null) => void;
  /** Show a "Default" tile that clears the override (used for the app background). */
  showDefault?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-secondary">Wallpapers</p>
        <div className="grid grid-cols-6 gap-2">
          {WALLPAPERS.map((w) => (
            <Swatch key={w} value={w} selected={value === w} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-secondary">Gradients &amp; colors</p>
        <div className="grid grid-cols-6 gap-2">
          {showDefault ? (
            <button
              type="button"
              aria-label="Default background"
              aria-pressed={!value}
              onClick={() => onSelect(null)}
              className={cn(
                "h-12 cursor-pointer rounded-sm border border-line-glass text-xs font-medium text-ink",
                !value && "ring-2 ring-[var(--border-focus)]",
              )}
              style={{ background: "var(--canvas-gradient)" }}
            >
              Default
            </button>
          ) : null}
          {[...GRADIENTS.map((g) => g.key), ...SOLIDS].map((g) => (
            <Swatch key={g} value={g} selected={value === g} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
