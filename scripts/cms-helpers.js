/**
 * CMS Helpers - Shared utilities for Webflow CMS data processing
 * CommonJS module for use in Node.js scripts
 */

/**
 * Webflow category IDs mapping — single source of truth for the whole pipeline.
 * IDs come from the Contents collection "top-category" option field (5 options).
 * Values are lowercase to match the frontend filters and stored data ("3d", not "3D").
 * Paleo Docs map to "videos" so the UI display stays unchanged.
 */
const CATEGORY_IDS = {
  "417c5eb49ea7a0509255526b460af1e6": "videos", // Video
  "3a0cdd4419856a1d01b35ff4681be638": "3d", // Immersion
  "224a8ccce14158309d6df3052fa7f1e1": "images", // Image
  "5b90531d7e27d60e0d1f4e226449b55e": "texts", // Behind The Scenes
  dd2eff6d4cc6f541654901dc2c377676: "videos", // Paleo Docs (excluded from globe)
};

/**
 * Category IDs that must never appear as pinpoints on the globe.
 * Behind The Scenes and Paleo Docs are display-only content.
 */
const NON_GLOBE_CATEGORY_IDS = new Set([
  "5b90531d7e27d60e0d1f4e226449b55e", // Behind The Scenes
  "dd2eff6d4cc6f541654901dc2c377676", // Paleo Docs
]);

/**
 * Get category name from Webflow category ID.
 * @param {string} categoryId - Webflow category ID
 * @returns {string} Category name (videos, images, 3d, texts, or unknown)
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

  // For other content: prefer gallery-low-quality-image (lighter CDN asset)
  // over the immersive background image
  if (item.fieldData["gallery-low-quality-image"]?.url) {
    return item.fieldData["gallery-low-quality-image"].url;
  }

  if (item.fieldData["background"]?.url) {
    return item.fieldData["background"].url;
  }

  return null;
}

/**
 * Returns true for category IDs that must never appear on the globe.
 * @param {string} categoryId - Webflow category ID
 * @returns {boolean}
 */
function isNonGlobeCategory(categoryId) {
  return NON_GLOBE_CATEGORY_IDS.has(categoryId);
}

module.exports = {
  CATEGORY_IDS,
  NON_GLOBE_CATEGORY_IDS,
  getCategoryName,
  getPreviewUrl,
  isNonGlobeCategory,
};
