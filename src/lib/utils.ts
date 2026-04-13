import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3007/api/v1';

/**
 * Extract a Google Drive file ID from any known Drive URL format:
 *  - /file/d/<id>/view
 *  - uc?export=view&id=<id>
 *  - /api/v1/file-storage/drive/<id>  (our own proxy — already normalised)
 */
function extractDriveFileId(url: string): string | null {
  // Already our proxy URL
  const proxyMatch = url.match(/\/file-storage\/drive\/([^/?]+)/);
  if (proxyMatch) return proxyMatch[1];

  // /file/d/<id>/...
  const viewMatch = url.match(/\/file\/d\/([^/]+)\//);
  if (viewMatch) return viewMatch[1];

  // uc?export=view&id=<id>  or  uc?id=<id>
  const ucMatch = url.match(/[?&]id=([^&]+)/);
  if (ucMatch && url.includes('drive.google.com')) return ucMatch[1];

  return null;
}

/**
 * Rewrite any Google Drive URL to use our backend proxy.
 * Shared Drive files are private — the browser cannot load them directly.
 * The proxy authenticates with the service account and streams the file.
 */
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `${API_BASE}/file-storage/drive/${driveId}`;
  }

  return url;
}
