"use client";

import { Check, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { GRADIENTS, PHOTOS, SOLIDS, WALLPAPERS, swatchCss } from "~/lib/wallpapers";
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
  allowUpload,
}: {
  value: string | null | undefined;
  onSelect: (value: string | null) => void;
  /** Show a "Default" tile that clears the override (used for the app background). */
  showDefault?: boolean;
  /** Show an "Upload image" button that stores a custom background. */
  allowUpload?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const customActive = Boolean(value?.startsWith("upload:"));

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { url: string };
      onSelect(`upload:${json.url}`);
      toast.success("Background uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {allowUpload ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden />
            Upload image
          </Button>
          {customActive ? (
            <span
              aria-hidden
              className="inline-flex h-9 w-14 items-center justify-center rounded-sm ring-2 ring-[var(--border-focus)]"
              style={{ background: swatchCss(value!) }}
            />
          ) : (
            <span className="text-sm text-ink-subtle">Or pick one below</span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload a background image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>
      ) : null}
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-secondary">Photos</p>
        <div className="grid grid-cols-6 gap-2">
          {PHOTOS.map((p) => (
            <Swatch key={p} value={p} selected={value === p} onSelect={onSelect} />
          ))}
        </div>
      </div>
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
