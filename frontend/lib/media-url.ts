const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Resolves a relative media path (e.g. `/api/media/products/abc.jpg`)
 * to a full URL pointing at the backend.
 */
export function resolveMediaUrl(url: string): string {
  if (!url) return '';
  // Already an absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path starting with /api/media → prepend backend origin
  return `${BACKEND_URL}${url}`;
}
