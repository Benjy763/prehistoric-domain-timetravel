/**
 * PREHISTORIC DOMAIN - Shared Constants
 * Geological periods mapping and other app-wide constants
 */

/**
 * Maps period names to their geological age in millions of years (Ma)
 * Used for filtering content by time period
 * @constant {Object.<string, string>}
 */
export const PERIOD_TO_AGE_MAP = {
  today: "0",
  quaternary: "2",
  neogene: "15",
  paleogene: "50",
  cretaceous: "100",
  jurassic: "160",
  triassic: "220",
  permian: "280",
  carboniferous: "320",
  devonian: "380",
  silurian: "410",
  ordovician: "450",
  cambrian: "500",
};

/**
 * Geological periods in chronological order (oldest to newest)
 * @constant {Array.<string>}
 */
export const GEOLOGICAL_PERIODS = [
  "cambrian",
  "ordovician",
  "silurian",
  "devonian",
  "carboniferous",
  "permian",
  "triassic",
  "jurassic",
  "cretaceous",
  "paleogene",
  "neogene",
  "quaternary",
  "today",
];

// Expose to window for legacy code compatibility
if (typeof window !== "undefined") {
  window.PERIOD_TO_AGE_MAP = PERIOD_TO_AGE_MAP;
  window.GEOLOGICAL_PERIODS = GEOLOGICAL_PERIODS;
}
