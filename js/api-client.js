// js/api-client.js - Frontend API Client for Cloudflare D1 Integration

class RecipeAPI {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}_${url}`;
        
        // Check cache for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Cache successful GET requests
            if (!options.method || options.method === 'GET') {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Categories API
    async getCategories(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getFeaturedCategories() {
        return this.getCategories({ featured: 'true' });
    }

    async getCategory(slug) {
        return this.request(`/categories/${slug}`);
    }

    async getCategoryRecipes(categorySlug, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/categories/${categorySlug}/recipes${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    // Recipes API
    async getRecipes(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/recipes${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getFeaturedRecipes() {
        return this.getRecipes({ featured: 'true' });
    }

    async getRecipe(slug) {
        return this.request(`/recipes/${slug}`);
    }

    async getLatestRecipes(limit = 8) {
        return this.getRecipes({ 
            sort_by: 'created_at', 
            sort_order: 'DESC', 
            limit 
        });
    }

    async getPopularRecipes(limit = 8) {
        return this.getRecipes({ 
            sort_by: 'rating', 
            sort_order: 'DESC', 
            limit 
        });
    }

    async getQuickRecipes(maxTime = 30, limit = 8) {
        return this.getRecipes({ 
            max_time: maxTime, 
            sort_by: 'total_time', 
            sort_order: 'ASC', 
            limit 
        });
    }

    // Search API
    async searchRecipes(query, params = {}) {
        const searchParams = { q: query, ...params };
        const queryString = new URLSearchParams(searchParams).toString();
        return this.request(`/search?${queryString}`);
    }

    // Reviews API
    async getRecipeReviews(recipeSlug, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/recipes/${recipeSlug}/reviews${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async addRecipeReview(recipeSlug, reviewData) {
        return this.request(`/recipes/${recipeSlug}/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }

    // Authors API
    async getAuthors() {
        return this.request('/authors');
    }

    async getAuthor(authorId) {
        return this.request(`/authors/${authorId}`);
    }

    // Utility methods
    clearCache() {
        this.cache.clear();
    }

    // Format recipe data for display
    formatRecipe(recipe) {
        return {
            ...recipe,
            formattedTime: this.formatTime(recipe.total_time),
            formattedRating: this.formatRating(recipe.rating),
            formattedDate: this.formatDate(recipe.created_at)
        };
    }

    formatTime(minutes) {
        if (!minutes) return '';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    formatRating(rating) {
        if (!rating) return '☆☆☆☆☆';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return '★'.repeat(fullStars) + 
               (hasHalfStar ? '⭐' : '') + 
               '☆'.repeat(emptyStars);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Recipe Data Manager
class RecipeDataManager {
    constructor() {
        this.api = new RecipeAPI();
        this.favorites = this.loadFavorites();
        this.recentlyViewed = this.loadRecentlyViewed();
    }

    // Load homepage data
    async loadHomepageData() {
        try {
            const [categories, featuredRecipes, latestRecipes] = await Promise.all([
                this.api.getFeaturedCategories(),
                this.api.getFeaturedRecipes(),
                this.api.getLatestRecipes()
            ]);

            return {
                categories: categories.data || [],
                featuredRecipes: featuredRecipes.data || [],
                latestRecipes: latestRecipes.data || []
            };
        } catch (error) {
            console.error('Error loading homepage data:', error);
            return {
                categories: [],
                featuredRecipes: [],
                latestRecipes: []
            };
        }
    }

    // Load category page data
    async loadCategoryData(categorySlug, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const [category, recipes] = await Promise.all([
                this.api.getCategory(categorySlug),
                this.api.getCategoryRecipes(categorySlug, { limit, offset })
            ]);

            return {
                category: category.data,
                recipes: recipes.data || [],
                pagination: recipes.pagination
            };
        } catch (error) {
            console.error('Error loading category data:', error);
            throw error;
        }
    }

    // Load recipe detail data
    async loadRecipeDetail(recipeSlug) {
        try {
            const [recipe, reviews] = await Promise.all([
                this.api.getRecipe(recipeSlug),
                this.api.getRecipeReviews(recipeSlug, { limit: 5 })
            ]);

            // Add to recently viewed
            this.addToRecentlyViewed(recipe.data);

            return {
                recipe: recipe.data,
                reviews: reviews.data || [],
                reviewStats: reviews.statistics
            };
        } catch (error) {
            console.error('Error loading recipe detail:', error);
            throw error;
        }
    }

    // Search functionality
    async searchRecipes(query, filters = {}, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const params = { ...filters, limit, offset };
            const results = await this.api.searchRecipes(query, params);

            return {
                recipes: results.data || [],
                query: results.query,
                pagination: results.pagination,
                total: results.total
            };
        } catch (error) {
            console.error('Error searching recipes:', error);
            return {
                recipes: [],
                query,
                pagination: { limit, offset, hasMore: false },
                total: 0
            };
        }
    }

    // Favorites management
    addToFavorites(recipe) {
        if (!this.favorites.some(fav => fav.id === recipe.id)) {
            this.favorites.unshift(recipe);
            this.saveFavorites();
        }
    }

    removeFromFavorites(recipeId) {
        this.favorites = this.favorites.filter(fav => fav.id !== recipeId);
        this.saveFavorites();
    }

    isFavorite(recipeId) {
        return this.favorites.some(fav => fav.id === recipeId);
    }

    getFavorites() {
        return this.favorites;
    }

    loadFavorites() {
        try {
            const stored = localStorage.getItem('recipe_favorites');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('recipe_favorites', JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    // Recently viewed management
    addToRecentlyViewed(recipe) {
        // Remove if already exists
        this.recentlyViewed = this.recentlyViewed.filter(item => item.id !== recipe.id);
        
        // Add to beginning
        this.recentlyViewed.unshift({
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
            image_url: recipe.image_url,
            rating: recipe.rating,
            total_time: recipe.total_time,
            viewedAt: new Date().toISOString()
        });

        // Keep only last 20
        this.recentlyViewed = this.recentlyViewed.slice(0, 20);
        this.saveRecentlyViewed();
    }

    getRecentlyViewed() {
        return this.recentlyViewed;
    }

    loadRecentlyViewed() {
        try {
            const stored = localStorage.getItem('recently_viewed_recipes');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    saveRecentlyViewed() {
        try {
            localStorage.setItem('recently_viewed_recipes', JSON.stringify(this.recentlyViewed));
        } catch (error) {
            console.error('Error saving recently viewed:', error);
        }
    }

    // Submit review
    async submitReview(recipeSlug, reviewData) {
        try {
            const result = await this.api.addRecipeReview(recipeSlug, reviewData);
            
            // Clear cache for reviews to get updated data
            this.api.clearCache();
            
            return result;
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    }
}

// UI Helper Functions
class RecipeUIHelpers {
    static createRecipeCard(recipe) {
        const formattedTime = RecipeAPI.prototype.formatTime(recipe.total_time);
        const formattedRating = RecipeAPI.prototype.formatRating(recipe.rating);
        
        return `
            <article class="recipe-card" data-recipe-id="${recipe.id}">
                <div class="recipe-image" style="background-image: url('${recipe.image_url || ''}');">
                    <button class="favorite-btn ${recipe.isFavorite ? 'active' : ''}" 
                            data-recipe-id="${recipe.id}" 
                            aria-label="${recipe.isFavorite ? 'Remove from' : 'Add to'} favorites">
                        ${recipe.isFavorite ? '♥' : '♡'}
                    </button>
                </div>
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <p class="recipe-description">${recipe.description}</p>
                    <div class="recipe-meta">
                        <span class="recipe-time">⏱️ ${formattedTime}</span>
                        <span class="recipe-rating">${formattedRating}</span>
                        <span class="recipe-difficulty difficulty-${recipe.difficulty}">${recipe.difficulty}</span>
                    </div>
                    ${recipe.author_name ? `<div class="recipe-author">By ${recipe.author_name}</div>` : ''}
                </div>
            </article>
        `;
    }

    static createCategoryCard(category) {
        return `
            <div class="category-card" data-category-id="${category.id}" data-category-slug="${category.slug}">
                <div class="category-image" style="background-image: url('${category.image_url || ''}');"></div>
                <div class="category-content">
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                    <span class="recipe-count">${category.recipe_count} recipes</span>
                </div>
            </div>
        `;
    }

    static createLoadingState(count = 8) {
        return Array(count).fill(0).map(() => `
            <div class="recipe-card loading-skeleton">
                <div class="recipe-image skeleton"></div>
                <div class="recipe-content">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </div>
        `).join('');
    }

    static showErrorMessage(container, message = 'Something went wrong. Please try again.') {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <h3>Oops!</h3>
                <p>${message}</p>
                <button class="btn btn-primary retry-btn">Try Again</button>
            </div>
        `;
    }
}

// Initialize global instances
window.recipeAPI = new RecipeAPI();
window.recipeDataManager = new RecipeDataManager();
window.RecipeUIHelpers = RecipeUIHelpers;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RecipeAPI,
        RecipeDataManager,
        RecipeUIHelpers
    };
}
