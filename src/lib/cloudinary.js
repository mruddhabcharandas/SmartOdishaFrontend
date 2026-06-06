/**
 * Image URL formatter - returns URL as-is (using AWS instead of Cloudinary)
 * 
 * @param {string} url - Original image URL.
 * @param {number|string} width - Desired width (not used for AWS).
 * @param {boolean} blur - Whether to blur (not used for AWS).
 * @returns {string} - Original image URL.
 */
export const getCloudinaryUrl = (url, width, blur = false) => {
  // Just return the URL as-is since we're using AWS
  return url;
};
