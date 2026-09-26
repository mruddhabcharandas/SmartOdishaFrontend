/**
 * Image URL formatter - normalizes image sources from strings or { url } objects.
 *
 * @param {string|{url?: string}|null|undefined} src - Image URL or object with url field.
 * @param {number|string} width - Desired width (reserved for future CDN transforms).
 * @param {boolean} blur - Whether to blur (reserved for future CDN transforms).
 * @returns {string} - Resolved image URL or empty string.
 */
export const getImageUrl = (src, width = 600, blur = false) => {
  if (!src) return '';
  const url = typeof src === 'string' ? src : (src.url || '');
  if (!url) return '';

  // Cloudinary smart auto-format and compression
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/f_auto') && !url.includes('/q_auto')) {
      const parts = url.split('/upload/');
      const transforms = ['f_auto', 'q_auto', 'c_limit'];
      if (width) transforms.push(`w_${width}`);
      if (blur) transforms.push('e_blur:1000');
      return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
    }
  }

  return url;
};
