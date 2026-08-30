/**
 * Intent Detection Service
 * Classifies search intent: BRAND, CATEGORY, PRODUCT, GENERIC
 */

export class IntentDetector {
    constructor() {
        // Known brands
        this.brands = new Set([
            'amul', 'britannia', 'parle', 'nestle', 'cadbury', 'haldiram',
            'mother dairy', 'kwality', 'vadilal', 'havmor', 'maggi',
            'lays', 'kurkure', 'bingo', 'balaji', 'bikaji',
            'tata', 'fortune', 'aashirvaad', 'pillsbury', 'saffola',
            'coca cola', 'pepsi', 'sprite', 'fanta', 'thums up',
            'bisleri', 'kinley', 'aquafina', 'real', 'tropicana',
            'kissan', 'tops', 'paper boat', 'frooti'
        ]);

        // Known categories
        this.categories = new Set([
            'milk', 'doodh', 'dairy', 'vegetables', 'sabzi', 'fruits', 'phal',
            'biscuit', 'cookies', 'chocolate', 'choco', 'snacks', 'namkeen',
            'bread', 'pav', 'rice', 'chawal', 'atta', 'flour',
            'oil', 'ghee', 'butter', 'paneer', 'curd', 'dahi',
            'tea', 'chai', 'coffee', 'water', 'paani',
            'chips', 'wafers', 'noodles', 'pasta', 'sauce', 'ketchup'
        ]);

        // Modifier keywords
        this.modifiers = new Set([
            'low', 'lite', 'light', 'fat', 'sugar', 'free', 'organic',
            'natural', 'fresh', 'whole', 'skimmed', 'toned', 'full cream',
            'salted', 'unsalted', 'sweetened', 'unsweetened'
        ]);
    }

    /**
     * Detect search intent
     * @param {string} query - Normalized query
     * @param {string[]} expandedTerms - Expanded synonym terms
     * @returns {Object} Intent object
     */
    detectIntent(query, expandedTerms = []) {
        const tokens = query.split(' ');
        const allTerms = [...tokens, ...expandedTerms];

        // Check for brand
        const brandMatch = allTerms.find(t => this.brands.has(t.toLowerCase()));

        // Check for category
        const categoryMatch = allTerms.find(t => this.categories.has(t.toLowerCase()));

        // Check for modifiers
        const modifierMatches = tokens.filter(t => this.modifiers.has(t.toLowerCase()));

        // Determine intent type
        let intentType = 'GENERIC';

        if (brandMatch && categoryMatch) {
            intentType = 'BRAND_CATEGORY'; // e.g., "amul milk"
        } else if (brandMatch) {
            intentType = 'BRAND'; // e.g., "amul"
        } else if (categoryMatch) {
            intentType = 'CATEGORY'; // e.g., "milk"
        } else if (tokens.length > 2 || modifierMatches.length > 0) {
            intentType = 'PRODUCT'; // e.g., "low fat milk", "choco biscuit"
        }

        return {
            type: intentType,
            brand: brandMatch || null,
            category: categoryMatch || null,
            modifiers: modifierMatches,
            isSpecific: tokens.length > 2 || modifierMatches.length > 0
        };
    }

    /**
     * Check if query is a brand search
     * @param {string} query
     * @returns {boolean}
     */
    isBrandSearch(query) {
        return this.brands.has(query.toLowerCase());
    }

    /**
     * Check if query is a category search
     * @param {string} query
     * @returns {boolean}
     */
    isCategorySearch(query) {
        return this.categories.has(query.toLowerCase());
    }
}

export default new IntentDetector();
