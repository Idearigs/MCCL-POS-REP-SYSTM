/**
 * Rewrites image URLs that were stored with localhost in the database.
 *
 * When files are stored locally on the backend server the URL is generated as
 * `http://localhost:{port}/uploads/...` and saved to the database. When a
 * remote client loads the page, localhost resolves to their own machine — not
 * the server — so the image appears broken.
 *
 * This module replaces the localhost origin with the actual backend origin
 * derived from VITE_API_BASE_URL at runtime.
 */

const apiBase =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1';
// Strip "/api/v1" (or any trailing path) to get just the host + port
export const backendHost = apiBase.replace(/\/api\/v1\/?$/, '');

/**
 * Rewrites a single image URL so it points to the real backend host instead
 * of localhost. Leaves Google Drive URLs and other external URLs unchanged.
 */
export function rewriteImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Relative path (e.g. /uploads/product-images/...) — prepend backend host
  if (url.startsWith('/uploads')) {
    return `${backendHost}${url}`;
  }

  // Stale localhost URL saved in DB — swap localhost origin for the real one
  if (/^https?:\/\/localhost(:\d+)?\//.test(url)) {
    return url.replace(/^https?:\/\/localhost(:\d+)?/, backendHost);
  }

  // External URL (Google Drive, CDN, etc.) — leave as-is
  return url;
}

/**
 * Rewrites an array of image URLs.
 */
export function rewriteImageUrls(urls: string[]): string[] {
  return urls.map(rewriteImageUrl).filter(Boolean);
}
