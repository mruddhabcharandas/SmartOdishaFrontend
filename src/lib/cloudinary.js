/**
 * Cloudinary URL formatter for image optimization.
 * 
 * @param {string} url - Original Cloudinary image URL.
 * @param {number|string} width - Desired width transformation (optional).
 * @param {boolean} blur - Whether to return a low-quality blurred placeholder (optional).
 * @returns {string} - Optimized image URL with q_auto, f_auto, and optional width.
 */
export const getCloudinaryUrl = (url, width, blur = false) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // Split at '/upload/' to insert transformations
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  // Standard optimizations: quality=auto, fetch_format=auto
  let transformations = 'q_auto,f_auto';
  
  if (blur) {
    // Low quality blurred placeholder
    transformations = 'q_10,f_auto,e_blur:1000,w_50,c_limit';
  } else if (width) {
    // Add width transformation if provided
    transformations += `,w_${width},c_limit`; // c_limit ensures we don't upscale beyond original
  }
  
  // Insert transformations after '/upload/'
  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};
