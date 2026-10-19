/**
 * CMS Helpers - Shared utilities for content data processing
 * CommonJS module for use in Node.js scripts
 *
 * Content source: the Prehistoric Domain site (pd-web, route /api/globe),
 * which replaced the Webflow CMS. It returns items in the same shape as the
 * former Webflow "Contents" collection, so the pipeline below is unchanged.
 */

const fs = require("fs");
const path = require("path");

// Staging until the switch to production (pd-web phase 9), then
// https://www.prehistoricdomain.com/api/globe
const DEFAULT_SOURCE_URL = "https://prehistoricdomain-staging.com/api/globe";

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

/**
 * Base URL of the site whose contents are read: content links on the globe
 * point back to it (staging until the switch, then production).
 * @returns {string} e.g. "https://prehistoricdomain-staging.com"
 */
function siteUrl() {
  return new URL(process.env.PD_CONTENT_SOURCE || DEFAULT_SOURCE_URL).origin;
}

/**
 * Fetch every content item from the site.
 * Item ids are kept stable by slug: an item already in content-data.json keeps
 * its former id (Webflow era), so favorites and manual fixes keep working.
 * @returns {Promise<Object[]>} Items shaped like the former Webflow items
 */
async function fetchSourceItems({ log = true } = {}) {
  const url = process.env.PD_CONTENT_SOURCE || DEFAULT_SOURCE_URL;
  if (log) console.log(`📥 Récupération des contenus depuis ${url}...`);

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Source error: ${response.status} ${response.statusText}`);
  }
  const { items = [] } = await response.json();

  const contentDataPath = path.join(__dirname, "../assets/data/content-data.json");
  const knownIds = new Map();
  if (fs.existsSync(contentDataPath)) {
    for (const item of JSON.parse(fs.readFileSync(contentDataPath, "utf8")).items || []) {
      if (item.slug) knownIds.set(item.slug, item.id);
    }
  }
  const stable = items.map((item) => ({
    ...item,
    id: knownIds.get(item.fieldData.slug) || item.id,
  }));

  if (log) console.log(`✅ ${stable.length} contenus trouvés\n`);
  return stable;
}

module.exports = {
  fetchSourceItems,
  siteUrl,
  CATEGORY_IDS,
  NON_GLOBE_CATEGORY_IDS,
  getCategoryName,
  getPreviewUrl,
  isNonGlobeCategory,
};
