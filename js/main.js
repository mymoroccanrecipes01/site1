// js/main.js - Main JavaScript Functionality

// Global variables and configuration
const siteConfig = {
    animations: {
        duration: 300,
        easing: 'ease-in-out'
    },
    breakpoints: {
        mobile: 768,
        tablet: 992,
        desktop: 1200
    },
    api: {
        baseUrl: '/api',
        endpoints: {
            recipes: '/recipes',
            categories: '/categories',
            search: '/search'
        }
    }
};

// Utility functions
const utils = {
    // Debounce function for search and scroll events
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Get current screen size
    getScreenSize: () => {
        const width = window.innerWidth;
        if (width < siteConfig.breakpoints.mobile) return 'mobile';
        if (width < siteConfig.breakpoints.tablet) return 'tablet';
        if (width < siteConfig.breakpoints.desktop) return 'desktop';
        return 'large';
    },

    // Smooth scroll to element
    scrollTo: (element, offset = 0) => {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    },

    // Format cooking time
    formatTime: (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },

    // Generate star rating HTML
    generateStarRating: (rating, maxStars = 5) => {
        let stars = '';
        for (let i = 1; i <= maxStars; i++) {
            if (i <= rating) {
                stars += '★';
            } else if (i - 0.5 <= rating) {
                stars += '☆';
            } else {
                stars += '☆';
            }
        }
        return stars;
    },

    // Local storage helpers
    storage: {
        get: (key) => {
            try {
                return JSON.parse(localStorage.getItem(key));
            } catch {
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove: (key) => localStorage.removeItem(key)
    }
};

// Navigation functionality
class Navigation {
    constructor() {
        this.header = document.querySelector('header');
        this.nav = document.querySelector('nav');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navLinks = document.querySelector('.nav-links');
        this.lastScrollY = window.scrollY;
        
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupScrollEffects();
        this.setupSmoothScrolling();
        this.setupActiveLinks();
    }

    setupMobileMenu() {
        if (this.mobileToggle && this.navLinks) {
            this.mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.nav.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Close mobile menu on window resize
            window.addEventListener('resize', () => {
                if (utils.getScreenSize() !== 'mobile') {
                    this.closeMobileMenu();
                }
            });
        }
    }

    toggleMobileMenu() {
        this.navLinks.classList.toggle('active');
        this.mobileToggle.setAttribute('aria-expanded', 
            this.navLinks.classList.contains('active'));
    }

    closeMobileMenu() {
        this.navLinks.classList.remove('active');
        this.mobileToggle.setAttribute('aria-expanded', 'false');
    }

    setupScrollEffects() {
        const throttledScroll = utils.throttle(() => {
            const currentScrollY = window.scrollY;
            
            // Add/remove header scroll class
            if (currentScrollY > 100) {
                this.header.classList.add('header-scroll');
            } else {
                this.header.classList.remove('header-scroll');
            }

            // Hide/show header on scroll
            if (currentScrollY > this.lastScrollY && currentScrollY > 200) {
                this.header.style.transform = 'translateY(-100%)';
            } else {
                this.header.style.transform = 'translateY(0)';
            }

            this.lastScrollY = currentScrollY;
        }, 100);

        window.addEventListener('scroll', throttledScroll);
    }

    setupSmoothScrolling() {
        const navLinks = this.navLinks.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    utils.scrollTo(target, this.header.offsetHeight);
                    this.closeMobileMenu();
                }
            });
        });
    }

    setupActiveLinks() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = this.navLinks.querySelectorAll('a[href^="#"]');

        const throttledScroll = utils.throttle(() => {
            let currentSection = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - this.header.offsetHeight - 50;
                if (window.scrollY >= sectionTop) {
                    currentSection = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        }, 100);

        window.addEventListener('scroll', throttledScroll);
    }
}

// Recipe and Category Card functionality
class CardManager {
    constructor() {
        this.recipeCards = document.querySelectorAll('.recipe-card');
        this.categoryCards = document.querySelectorAll('.category-card');
        this.favorites = utils.storage.get('favorites') || [];
        
        this.init();
    }

    init() {
        this.setupCardInteractions();
        this.setupFavorites();
        this.setupLazyLoading();
        this.setupIntersectionObserver();
    }

    setupCardInteractions() {
        // Recipe card clicks
        this.recipeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn')) {
                    this.handleRecipeClick(card);
                }
            });

            // Add keyboard support
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleRecipeClick(card);
                }
            });
        });

        // Category card clicks
        this.categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                this.handleCategoryClick(card);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCategoryClick(card);
                }
            });
        });
    }

    handleRecipeClick(card) {
        const recipeId = card.dataset.recipeId;
        const recipeTitle = card.querySelector('.recipe-title')?.textContent;
        
        // Add loading state
        card.classList.add('loading');
        
        // Simulate navigation delay
        setTimeout(() => {
            if (recipeId) {
                window.location.href = `pages/recipe-detail.html?id=${recipeId}`;
            } else {
                console.log(`Opening recipe: ${recipeTitle}`);
                // Fallback for demo
                this.showRecipeModal(card);
            }
            card.classList.remove('loading');
        }, 300);
    }

    handleCategoryClick(card) {
        const categoryName = card.querySelector('h3')?.textContent;
        const categoryId = card.dataset.categoryId;
        
        card.classList.add('loading');
        
        setTimeout(() => {
            if (categoryId) {
                window.location.href = `pages/category.html?id=${categoryId}`;
            } else {
                console.log(`Browsing category: ${categoryName}`);
                // Fallback for demo
                this.showCategoryModal(categoryName);
            }
            card.classList.remove('loading');
        }, 300);
    }

    setupFavorites() {
        // Add favorite buttons to recipe cards
        this.recipeCards.forEach(card => {
            const favoriteBtn = document.createElement('button');
            favoriteBtn.className = 'favorite-btn';
            favoriteBtn.innerHTML = '♡';
            favoriteBtn.setAttribute('aria-label', 'Add to favorites');
            
            const recipeId = card.dataset.recipeId || card.querySelector('.recipe-title')?.textContent;
            
            if (this.favorites.includes(recipeId)) {
                favoriteBtn.classList.add('active');
                favoriteBtn.innerHTML = '♥';
            }

            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(recipeId, favoriteBtn);
            });

            card.querySelector('.recipe-content').appendChild(favoriteBtn);
        });
    }

    toggleFavorite(recipeId, button) {
        const index = this.favorites.indexOf(recipeId);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            button.classList.remove('active');
            button.innerHTML = '♡';
            button.setAttribute('aria-label', 'Add to favorites');
        } else {
            this.favorites.push(recipeId);
            button.classList.add('active');
            button.innerHTML = '♥';
            button.setAttribute('aria-label', 'Remove from favorites');
        }

        utils.storage.set('favorites', this.favorites);
        
        // Add animation
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('.recipe-image, .category-card');
        
        images.forEach(img => {
            if (img.dataset.src) {
                const tempImg = new Image();
                tempImg.onload = () => {
                    img.style.backgroundImage = `url(${img.dataset.src})`;
                    img.classList.add('loaded');
                };
                tempImg.src = img.dataset.src;
            }
        });
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '50px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all cards
        [...this.recipeCards, ...this.categoryCards].forEach(card => {
            observer.observe(card);
        });
    }

    showRecipeModal(card) {
        const title = card.querySelector('.recipe-title')?.textContent;
        const description = card.querySelector('.recipe-description')?.textContent;
        
        const modal = this.createModal(`
            <h2>${title}</h2>
            <p>${description}</p>
            <p><em>This would normally open the full recipe page.</em></p>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
        `);
        
        document.body.appendChild(modal);
    }

    showCategoryModal(categoryName) {
        const modal = this.createModal(`
            <h2>${categoryName}</h2>
            <p>This would show all recipes in the ${categoryName} category.</p>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
        `);
        
        document.body.appendChild(modal);
    }

    createModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.closest('.modal').remove()"></div>
            <div class="modal-content">
                ${content}
            </div>
        `;
        return modal;
    }
}

// Search functionality
class SearchManager {
    constructor() {
        this.searchInput = document.querySelector('.search-bar');
        this.searchBtn = document.querySelector('.search-btn');
        this.searchResults = document.querySelector('.search-results');
        
        this.init();
    }

    init() {
        if (this.searchInput) {
            this.setupSearch();
        }
    }

    setupSearch() {
        const debouncedSearch = utils.debounce(() => {
            this.performSearch(this.searchInput.value);
        }, 300);

        this.searchInput.addEventListener('input', debouncedSearch);
        
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(this.searchInput.value);
            }
        });

        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => {
                this.performSearch(this.searchInput.value);
            });
        }
    }

    performSearch(query) {
        if (query.length < 2) return;

        console.log(`Searching for: ${query}`);
        
        // Show loading state
        this.searchBtn.innerHTML = '<span class="loading"></span>';
        
        // Simulate search API call
        setTimeout(() => {
            this.displaySearchResults(query);
            this.searchBtn.innerHTML = '🔍';
        }, 500);
    }

    displaySearchResults(query) {
        // This would normally make an API call
        console.log(`Search results for: ${query}`);
        
        // For demo purposes, show alert
        alert(`Search results for: "${query}"\n\nThis would normally display matching recipes and categories.`);
    }
}

// View More functionality
class ViewMoreManager {
    constructor() {
        this.viewMoreBtns = document.querySelectorAll('.view-more');
        this.init();
    }

    init() {
        this.viewMoreBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleViewMore(e.target);
            });
        });
    }

    handleViewMore(button) {
        const section = button.closest('section') || button.closest('.container');
        const sectionTitle = section.querySelector('.section-title')?.textContent;
        
        button.innerHTML = '<span class="loading"></span>';
        
        // Simulate loading more content
        setTimeout(() => {
            console.log(`Loading more items for: ${sectionTitle}`);
            this.loadMoreContent(section);
            button.innerHTML = 'View More →';
        }, 1000);
    }

    loadMoreContent(section) {
        const grid = section.querySelector('.recipe-grid, .category-grid');
        if (!grid) return;

        // Create dummy content for demo
        const isRecipeGrid = grid.classList.contains('recipe-grid');
        const newItems = this.createDummyItems(isRecipeGrid ? 'recipe' : 'category', 4);
        
        newItems.forEach(item => {
            grid.appendChild(item);
            // Trigger animation
            setTimeout(() => item.classList.add('fade-in-up'), 100);
        });
    }

    createDummyItems(type, count) {
        const items = [];
        
        for (let i = 0; i < count; i++) {
            const item = document.createElement('div');
            
            if (type === 'recipe') {
                item.className = 'recipe-card';
                item.innerHTML = `
                    <div class="recipe-image" style="background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)});"></div>
                    <div class="recipe-content">
                        <h3 class="recipe-title">New Recipe ${Date.now() + i}</h3>
                        <p class="recipe-description">A delicious new recipe that was just added to our collection!</p>
                        <div class="recipe-meta">
                            <span class="recipe-time">⏱️ ${Math.floor(Math.random() * 60 + 15)}m</span>
                            <span class="recipe-rating">${utils.generateStarRating(Math.floor(Math.random() * 5 + 1))}</span>
                        </div>
                    </div>
                `;
            } else {
                item.className = 'category-card';
                item.style.background = `linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`;
                item.innerHTML = `<h3>New Category ${Date.now() + i}</h3>`;
            }
            
            items.push(item);
        }
        
        return items;
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            interactionTime: 0
        };
        this.init();
    }

    init() {
        this.measureLoadTime();
        this.measureRenderTime();
        this.setupInteractionTracking();
    }

    measureLoadTime() {
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now();
            console.log(`Page load time: ${this.metrics.loadTime.toFixed(2)}ms`);
        });
    }

    measureRenderTime() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.metrics.renderTime = performance.now();
                console.log(`Render time: ${this.metrics.renderTime.toFixed(2)}ms`);
            });
        }
    }

    setupInteractionTracking() {
        const startTime = performance.now();
        
        ['click', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                if (this.metrics.interactionTime === 0) {
                    this.metrics.interactionTime = performance.now() - startTime;
                    console.log(`Time to first interaction: ${this.metrics.interactionTime.toFixed(2)}ms`);
                }
            }, { once: true });
        });
    }
}

// Main application initialization
class RecipeApp {
    constructor() {
        this.navigation = null;
        this.cardManager = null;
        this.searchManager = null;
        this.viewMoreManager = null;
        this.performanceMonitor = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            // Initialize performance monitoring first
            this.performanceMonitor = new PerformanceMonitor();
            
            // Initialize core components
            this.navigation = new Navigation();
            this.cardManager = new CardManager();
            this.searchManager = new SearchManager();
            this.viewMoreManager = new ViewMoreManager();
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            console.log('Recipe App initialized successfully');
        } catch (error) {
            console.error('Error initializing Recipe App:', error);
