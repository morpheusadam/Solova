import Image from "next/image";

import { cn } from "~/lib/utils";

/** Letter-fallback avatar (company logos, the freelancer). */
export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return src ? (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
    />
  ) : (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-ink-onbrand",
        className,
      )}
    >
      {initials}
    </span>
  );
}
