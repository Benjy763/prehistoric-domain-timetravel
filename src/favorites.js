/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion des favoris (localStorage)
 */

class FavoritesManager {
  constructor() {
    this.favorites = new Set(this.loadFromStorage());
    this.listeners = [];
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem("pd-favorites");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading favorites:", error);
      return [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem("pd-favorites", JSON.stringify([...this.favorites]));
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  }

  toggle(contentId) {
    if (this.favorites.has(contentId)) {
      this.favorites.delete(contentId);
      console.log(`💔 Removed from favorites: ${contentId}`);
    } else {
      this.favorites.add(contentId);
      console.log(`💙 Added to favorites: ${contentId}`);
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  isFavorite(contentId) {
    return this.favorites.has(contentId);
  }

  getAll() {
    return Array.from(this.favorites);
  }

  clear() {
    this.favorites.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  // Observer pattern pour notifier les changements
  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }
}

window.FavoritesManager = FavoritesManager;
