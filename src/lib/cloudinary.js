/**
 * Image URL formatter - normalizes image sources from strings or { url } objects.
 *
 * @param {string|{url?: string}|null|undefined} src - Image URL or object with url field.
 * @param {number|string} width - Desired width (reserved for future CDN transforms).
 * @param {boolean} blur - Whether to blur (reserved for future CDN transforms).
 * @returns {string} - Resolved image URL or empty string.
 */
export const getImageUrl = (src, width, blur = false) => {
  if (!src) return '';
  if (typeof src === 'string') return src;
  if (typeof src === 'object' && src.url) return src.url;
  return '';
};
