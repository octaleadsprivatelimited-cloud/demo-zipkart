/**
 * Main Search Engine Service
 * Orchestrates the complete search pipeline
 */

import queryNormalizer from './queryNormalizer.js';
import spellCorrector from './spellCorrector.js';
import synonymExpander from './synonymExpander.js';
import intentDetector from './intentDetector.js';
import SearchRanker from './searchRanker.js';

export class SearchEngine {
    constructor() {
        this.initialized = false;
        this.ranker = null;
    }

    /**
     * Initialize search engine with product catalog
     * @param {Array} products - Product catalog
     */
    initialize(products) {
        if (this.initialized) return;

        // Initialize spell corrector dictionary
        spellCorrector.initializeDictionary(products);

        this.initialized = true;
        console.log('Search engine initialized with', products.length, 'products');
    }

    /**
     * Perform search with full pipeline
     * @param {string} rawQuery - Raw user query
     * @param {Array} products - Product catalog
     * @param {Object} userProfile - User profile for personalization
     * @returns {Object} Search results with metadata
     */
    search(rawQuery, products, userProfile = {}) {
        // Ensure initialization
        if (!this.initialized && products.length > 0) {
            this.initialize(products);
        }

        // Initialize ranker with user profile
        this.ranker = new SearchRanker(userProfile);

        // Step 1: Normalize query
        const normalized = queryNormalizer.normalize(rawQuery);

        if (!normalized) {
            return {
                query: rawQuery,
                processed: { normalized: '', corrected: '', expanded: [], intent: null },
                results: [],
                total: 0
            };
        }

        // Step 2: Spell correction
        const corrected = spellCorrector.correct(normalized);

        // Step 3: Synonym expansion
        const expanded = synonymExpander.expand(corrected);

        // Step 4: Intent detection
        const intent = intentDetector.detectIntent(corrected, expanded);

        // Step 5: Search and filter
        const filtered = this.filterProducts(products, corrected, expanded, intent);

        // Step 6: Rank results
        const ranked = this.ranker.rank(filtered, corrected, intent);

        return {
            query: rawQuery,
            processed: {
                normalized,
                corrected,
                expanded,
                intent
            },
            results: ranked,
            total: ranked.length
        };
    }

    /**
     * Filter products based on query and expanded terms
     */
    filterProducts(products, query, expandedTerms, intent) {
        const queryLower = query.toLowerCase();
        const allTerms = [queryLower, ...expandedTerms.map(t => t.toLowerCase())];

        return products.filter(product => {
            const name = (product.name || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const searchText = `${name} ${brand} ${category} ${description}`;

            // Check if any expanded term matches
            const matchesAnyTerm = allTerms.some(term => {
                const tokens = term.split(' ');

                // All tokens must be present
                return tokens.every(token => searchText.includes(token));
            });

            if (matchesAnyTerm) return true;

            // Brand-specific filtering
            if (intent.type === 'BRAND' && brand === intent.brand?.toLowerCase()) {
                return true;
            }

            // Category-specific filtering
            if (intent.type === 'CATEGORY' && category === intent.category?.toLowerCase()) {
                return true;
            }

            return false;
        });
    }

    /**
     * Get auto-suggestions for a query prefix
     * @param {string} prefix - Query prefix
     * @param {Array} products - Product catalog
     * @param {Object} userProfile - User profile
     * @returns {Array} Suggestions
     */
    getSuggestions(prefix, products, userProfile = {}) {
        if (!prefix || prefix.length < 2) {
            return [];
        }

        const normalized = queryNormalizer.normalize(prefix);
        const suggestions = new Set();

        // Product name suggestions
        products.forEach(product => {
            const name = (product.name || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const category = (product.category || '').toLowerCase();

            if (name.startsWith(normalized)) {
                suggestions.add(product.name);
            }
            if (brand.startsWith(normalized)) {
                suggestions.add(product.brand);
            }
            if (category.startsWith(normalized)) {
                suggestions.add(product.category);
            }
        });

        // Personal history (if available)
        if (userProfile.searchHistory) {
            userProfile.searchHistory.forEach(query => {
                if (query.toLowerCase().startsWith(normalized)) {
                    suggestions.add(query);
                }
            });
        }

        return Array.from(suggestions).slice(0, 8);
    }
}

export default new SearchEngine();
