/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion des filtres de contenu
 */

class FiltersManager {
    constructor() {
        this.activeFilters = new Set(['videos', 'images', '3d', 'texts']);
        this.filterElements = document.querySelectorAll('.filter-item');
        
        this.init();
    }

    init() {
        this.filterElements.forEach(element => {
            element.addEventListener('click', () => {
                this.toggleFilter(element);
            });
        });
    }

    toggleFilter(element) {
        const filterType = element.dataset.filter;
        
        if (this.activeFilters.has(filterType)) {
            this.activeFilters.delete(filterType);
            element.classList.remove('active');
        } else {
            this.activeFilters.add(filterType);
            element.classList.add('active');
        }
        
        // Notifier le contrôleur de l'application
        if (window.appController) {
            window.appController.onFiltersChanged(this.activeFilters);
        }
    }

    isActive(filterType) {
        return this.activeFilters.has(filterType);
    }

    getActiveFilters() {
        return Array.from(this.activeFilters);
    }

    reset() {
        this.activeFilters = new Set(['videos', 'images', '3d', 'texts']);
        this.filterElements.forEach(element => {
            element.classList.add('active');
        });
    }
}
