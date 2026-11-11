/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Favorites (2026-11-11): inside the site, they are the member's favorites of the site,
 * read and changed by the parent page (FullscreenFrame of pd-web-dinodeck), which holds
 * the session the globe never sees. Keyed by the piece's slug, shared with the site.
 * Standalone (no parent page), they stay in this browser.
 *
 * Messages with the parent page:
 *   globe → site  { type: "pd:favorites:get" }
 *   site → globe  { type: "pd:favorites", signedIn, slugs }   (answer, and after a change)
 *   globe → site  { type: "pd:favorites:set", slug, on }
 */

const STORAGE_KEY = "pd-favorite-slugs";

class FavoritesManager {
  constructor() {
    this.embedded = window.parent !== window;
    this.favorites = new Set();
    this.listeners = [];
    // Standalone: always on; embedded: once the site says a member is signed in
    this.available = !this.embedded;

    if (!this.embedded) {
      this.favorites = new Set(this.loadFromStorage());
      return;
    }
    this.parentOrigin = this.readParentOrigin();
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.data?.type !== "pd:favorites") return;
      if (this.parentOrigin !== "*" && event.origin !== this.parentOrigin) return;
      this.available = event.data.signedIn === true;
      this.favorites = new Set(Array.isArray(event.data.slugs) ? event.data.slugs : []);
      this.notifyListeners();
    });
    this.post({ type: "pd:favorites:get" });
  }

  /** The site's origin, the only page allowed to answer. */
  readParentOrigin() {
    try {
      return document.referrer ? new URL(document.referrer).origin : "*";
    } catch {
      return "*";
    }
  }

  post(message) {
    window.parent.postMessage(message, this.parentOrigin);
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.favorites]));
    } catch {
      // Private browsing: the favorites last for this visit
    }
  }

  /** A heart and a filter are shown only when favorites can be kept. */
  isAvailable() {
    return this.available;
  }

  toggle(slug) {
    if (!slug || !this.available) return;
    const on = !this.favorites.has(slug);
    if (on) {
      this.favorites.add(slug);
    } else {
      this.favorites.delete(slug);
    }
    if (this.embedded) {
      // Shown at once; the site answers with the list as it stands
      this.post({ type: "pd:favorites:set", slug, on });
    } else {
      this.saveToStorage();
    }
    this.notifyListeners();
  }

  isFavorite(slug) {
    return Boolean(slug) && this.favorites.has(slug);
  }

  getAll() {
    return Array.from(this.favorites);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }
}

window.FavoritesManager = FavoritesManager;
