/**
 * CMS Helpers - Shared utilities for Webflow CMS data processing
 * CommonJS module for use in Node.js scripts
 */

/**
 * Webflow category IDs mapping
 * NOTE: The "texts" ID is a placeholder - update with real ID from Webflow
 */
const CATEGORY_IDS = {
  "417c5eb49ea7a0509255526b460af1e6": "videos",
  "224a8ccce14158309d6df3052fa7f1e1": "images",
  "5b8c7d31fc2d72b6c53b7ed1dded31a4": "3D",
  "PLACEHOLDER_TEXTS_ID": "texts", // TODO: Replace with actual Webflow ID for texts/BTS category
};

/**
 * Get category name from Webflow category ID
 * @param {string} categoryId - Webflow category ID
 * @returns {string} Category name (videos, images, 3D, texts, or unknown)
 */
function getCategoryName(categoryId) {
  return CATEGORY_IDS[categoryId] || "unknown";
}

/**
 * Get preview URL for a CMS item
 * @param {Object} item - CMS item from Webflow
 * @param {string} category - Category name (videos, images, etc.)
 * @returns {string|null} Preview image URL or null
 */
function getPreviewUrl(item, category) {
  // For videos: use YouTube thumbnail
  if (category === "videos" && item.fieldData["youtube-video-id"]) {
    return `https://img.youtube.com/vi/${item.fieldData["youtube-video-id"]}/maxresdefault.jpg`;
  }

  // For other content: use background or gallery image
  if (item.fieldData["background"]?.url) {
    return item.fieldData["background"].url;
  }

  if (item.fieldData["gallery-low-quality-image"]?.url) {
    return item.fieldData["gallery-low-quality-image"].url;
  }

  return null;
}

module.exports = {
  CATEGORY_IDS,
  getCategoryName,
  getPreviewUrl,
};
