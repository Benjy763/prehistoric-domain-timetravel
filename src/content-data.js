/**
 * The contents of the globe: the file the sync robot keeps up to date when this
 * build has one (staging, beta), else the file built in. The built-in file is
 * also the fallback, so that a failure on R2 never leaves the globe empty.
 */
export async function fetchContentData() {
  if (__CONTENT_DATA_URL__) {
    try {
      const response = await fetch(__CONTENT_DATA_URL__);
      if (response.ok) {
        return response;
      }
      console.warn(`⚠️  Content file: HTTP ${response.status}, using the built-in file`);
    } catch (error) {
      console.warn("⚠️  Content file unreachable, using the built-in file:", error.message);
    }
  }
  return fetch(`assets/data/content-data.json?v=${__CONTENT_DATA_HASH__}`);
}
