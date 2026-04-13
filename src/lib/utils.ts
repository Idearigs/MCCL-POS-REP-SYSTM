import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalise a Google Drive URL so it can be used as an <img src>.
 * Drive's webViewLink (/view) is an HTML viewer page — browsers can't render it as an image.
 * Convert to the direct-download embed format instead.
 */
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  // Match /file/d/<id>/view or /file/d/<id>/view?usp=...
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}
