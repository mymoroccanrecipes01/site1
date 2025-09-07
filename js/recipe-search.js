// Search functionality
class RecipeSearch {
    constructor() {
        this.searchInput = document.querySelector('.search-bar');
        this.init();
    }

    init() {
        if (this.searchInput) {
            this.setupSearch();
        }
    }

    setupSearch() {
        // Search implementation
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new RecipeSearch();
});
