/**
 * Resolves a website URL to a favicon image URL. Uses Google's public favicon
 * service (works for any public site, no API key). Returns null for empty/invalid
 * input so callers can fall back to a placeholder.
 */
export function faviconUrl(website: string | null | undefined, size = 64): string | null {
  if (!website) return null;
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`)
      .hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
  } catch {
    return null;
  }
}
