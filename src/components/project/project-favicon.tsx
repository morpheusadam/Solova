"use client";

import { useState } from "react";

import { faviconUrl } from "~/lib/favicon";
import { cn } from "~/lib/utils";

/**
 * Shows the website's favicon for a project; falls back to a color dot when
 * there is no website or the icon fails to load.
 */
export function ProjectFavicon({
  website,
  color,
  size = 20,
  className,
}: {
  website?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(website, 64);

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn("rounded-sm object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{ width: size * 0.6, height: size * 0.6, backgroundColor: color ?? "#8993A4" }}
    />
  );
}
