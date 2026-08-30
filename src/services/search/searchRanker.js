/**
 * Multi-Factor Ranking Service
 * Ranks search results based on relevance, availability, popularity, personalization, and promotions
 */

export class SearchRanker {
    constructor(userProfile = {}) {
        this.userProfile = userProfile;

        // Ranking weights
        this.weights = {
            relevance: 0.35,
            availability: 0.25,
            popularity: 0.15,
            personalization: 0.15,
            promotion: 0.10
        };
    }

    /**
     * Rank search results
     * @param {Array} products - Filtered products
     * @param {string} query - Original query
     * @param {Object} intent - Detected intent
     * @returns {Array} Ranked products
     */
    rank(products, query, intent) {
        const rankedProducts = products.map(product => {
            const scores = {
                relevance: this.calculateRelevance(product, query, intent),
                availability: this.calculateAvailability(product),
                popularity: this.calculatePopularity(product),
                personalization: this.calculatePersonalization(product),
                promotion: this.calculatePromotion(product)
            };

            // Calculate final score
            const finalScore = (
                scores.relevance * this.weights.relevance +
                scores.availability * this.weights.availability +
                scores.popularity * this.weights.popularity +
                scores.personalization * this.weights.personalization +
                scores.promotion * this.weights.promotion
            );

            return {
                ...product,
                searchScores: scores,
                finalScore
            };
        });

        // Sort by final score (descending)
        rankedProducts.sort((a, b) => b.finalScore - a.finalScore);

        return rankedProducts;
    }

    /**
     * Calculate relevance score (0-100)
     */
    calculateRelevance(product, query, intent) {
        let score = 0;
        const queryLower = query.toLowerCase();
        const nameLower = (product.name || '').toLowerCase();
        const brandLower = (product.brand || '').toLowerCase();
        const categoryLower = (product.category || '').toLowerCase();

        // Exact match bonus
        if (nameLower === queryLower) {
            score += 100;
            return score;
        }

        // Prefix match
        if (nameLower.startsWith(queryLower)) {
            score += 50;
        }

        // Brand match (for brand intent)
        if (intent.type === 'BRAND' && brandLower === intent.brand?.toLowerCase()) {
            score += 40;
        }

        // Category match
        if (intent.category && categoryLower === intent.category.toLowerCase()) {
            score += 30;
        }

        // Term frequency in name
        const queryTokens = queryLower.split(' ');
        const nameTokens = nameLower.split(' ');
        const matchCount = queryTokens.filter(qt =>
            nameTokens.some(nt => nt.includes(qt))
        ).length;
        score += (matchCount / queryTokens.length) * 20;

        // Contains all query terms
        const containsAll = queryTokens.every(qt => nameLower.includes(qt));
        if (containsAll) {
            score += 15;
        }

        // Brand name match
        if (brandLower.includes(queryLower) || queryLower.includes(brandLower)) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    /**
     * Calculate availability score (0-100)
     */
    calculateAvailability(product) {
        let score = 50; // Base availability score

        // Stock level (simulated - in production would come from inventory)
        const stockQuantity = product.stockQuantity || 100;

        if (stockQuantity > 50) {
            score += 30;
        } else if (stockQuantity > 20) {
            score += 20;
        } else if (stockQuantity > 0) {
            score += 10;
        } else {
            return 0; // Out of stock
        }

        // Delivery time (simulated - assume 10 mins for all)
        const deliveryTime = product.deliveryTime || 10;
        const deliveryPenalty = Math.max(0, (deliveryTime - 10) / 2);
        score -= deliveryPenalty;

        return Math.max(0, Math.min(score, 100));
    }

    /**
     * Calculate popularity score (0-100)
     */
    calculatePopularity(product) {
        let score = 0;

        // Rating-based score
        const rating = product.rating || 0;
        score += (rating / 5) * 40;

        // Review count (logarithmic scale)
        const reviewCount = product.reviewCount || 0;
        score += Math.min(Math.log(reviewCount + 1) * 8, 30);

        // Global popularity (simulated)
        const popularity = product.popularity || 50;
        score += (popularity / 100) * 30;

        return Math.min(score, 100);
    }

    /**
     * Calculate personalization score (0-100)
     */
    calculatePersonalization(product) {
        if (!this.userProfile || Object.keys(this.userProfile).length === 0) {
            return 50; // Neutral score if no user profile
        }

        let score = 0;

        // Purchase history
        if (this.userProfile.purchasedProducts?.includes(product.id)) {
            score += 40; // Repeat purchase boost
        }

        // Category preference
        const categoryPref = this.userProfile.categoryPreferences?.[product.category] || 0;
        score += categoryPref * 20;

        // Brand preference
        const brandPref = this.userProfile.brandPreferences?.[product.brand] || 0;
        score += brandPref * 15;

        // Recent views
        if (this.userProfile.recentlyViewed?.includes(product.id)) {
            score += 25;
        }

        // Time-based preferences
        score += this.getTimeBasedBoost(product);

        return Math.min(score, 100);
    }

    /**
     * Get time-based boost for products
     */
    getTimeBasedBoost(product) {
        const hour = new Date().getHours();
        const tags = product.tags || [];

        // Breakfast items (6 AM - 11 AM)
        if (hour >= 6 && hour < 11 && tags.includes('breakfast')) {
            return 15;
        }

        // Snacks (4 PM - 7 PM)
        if (hour >= 16 && hour < 19 && tags.includes('snacks')) {
            return 10;
        }

        return 0;
    }

    /**
     * Calculate promotion score (0-100)
     */
    calculatePromotion(product) {
        let score = 0;

        const discount = product.originalPrice
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;

        if (discount > 0) {
            score += 50;

            if (discount > 30) {
                score += 30;
            } else if (discount > 15) {
                score += 20;
            } else {
                score += 10;
            }
        }

        return Math.min(score, 100);
    }

    /**
     * Update user profile for personalization
     */
    updateUserProfile(profile) {
        this.userProfile = profile;
    }
}

export default SearchRanker;
