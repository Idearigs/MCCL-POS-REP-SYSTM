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

// Backend host derived from the API base URL (strips /api/v1 suffix)
const BACKEND_HOST = API_BASE.replace(/\/api\/v1\/?$/, '');

/**
 * Normalise any image URL for display:
 * - Google Drive URLs → backend proxy (Drive files are private)
 * - Relative /uploads paths → prefixed with the real backend host
 * - Stale localhost /uploads URLs (saved in DB) → rewritten to real backend host
 * - Everything else (CDN, external) → returned as-is
 */
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  // Google Drive → proxy
  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `${API_BASE}/file-storage/drive/${driveId}`;
  }

  // Relative path e.g. /uploads/product-images/...
  if (url.startsWith('/uploads')) {
    return `${BACKEND_HOST}${url}`;
  }

  // Stale localhost URL stored in the database — rewrite to the real backend host
  if (/^https?:\/\/localhost(:\d+)?\/uploads/.test(url)) {
    return url.replace(/^https?:\/\/localhost(:\d+)?/, BACKEND_HOST);
  }

  return url;
}
