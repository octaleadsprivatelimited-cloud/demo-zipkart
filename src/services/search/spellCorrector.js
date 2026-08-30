/**
 * Spell Correction Service
 * Uses Levenshtein distance for typo-tolerant search
 */

export class SpellCorrector {
    constructor() {
        // Product dictionary - will be populated from product catalog
        this.productDictionary = new Set();
        this.searchLogFrequency = new Map();
        this.bigramModel = new Map();
    }

    /**
     * Initialize dictionary from product catalog
     * @param {Array} products - Product array
     */
    initializeDictionary(products) {
        products.forEach(product => {
            // Add product name tokens
            const tokens = product.name?.toLowerCase().split(/\s+/) || [];
            tokens.forEach(token => {
                if (token.length > 2) {
                    this.productDictionary.add(token);
                    this.searchLogFrequency.set(token, (this.searchLogFrequency.get(token) || 0) + 1);
                }
            });

            // Add brand
            if (product.brand) {
                const brand = product.brand.toLowerCase();
                this.productDictionary.add(brand);
                this.searchLogFrequency.set(brand, (this.searchLogFrequency.get(brand) || 0) + 10);
            }

            // Add category
            if (product.category) {
                const category = product.category.toLowerCase();
                this.productDictionary.add(category);
                this.searchLogFrequency.set(category, (this.searchLogFrequency.get(category) || 0) + 5);
            }
        });

        // Build bigram model
        this.buildBigramModel(products);
    }

    /**
     * Build bigram model for context-aware correction
     */
    buildBigramModel(products) {
        products.forEach(product => {
            const tokens = product.name?.toLowerCase().split(/\s+/) || [];
            for (let i = 0; i < tokens.length - 1; i++) {
                const bigram = `${tokens[i]} ${tokens[i + 1]}`;
                this.bigramModel.set(bigram, (this.bigramModel.get(bigram) || 0) + 1);
            }
        });
    }

    /**
     * Correct spelling in query
     * @param {string} query - Normalized query
     * @returns {string} Corrected query
     */
    correct(query) {
        const tokens = query.split(' ');
        const corrected = tokens.map((token, idx) => {
            // Already correct
            if (this.productDictionary.has(token)) {
                return token;
            }

            // Find candidates using edit distance
            const candidates = this.getCandidates(token);

            if (candidates.length === 0) {
                return token; // No correction found
            }

            // Rank by frequency and context
            const context = idx > 0 ? tokens[idx - 1] : null;
            const best = this.rankCandidates(candidates, context);

            return best || token;
        });

        return corrected.join(' ');
    }

    /**
     * Get correction candidates using Levenshtein distance
     * @param {string} word - Word to correct
     * @param {number} maxDistance - Maximum edit distance
     * @returns {Array} Candidate corrections
     */
    getCandidates(word, maxDistance = 2) {
        const candidates = [];

        for (const dictWord of this.productDictionary) {
            const distance = this.levenshteinDistance(word, dictWord);
            if (distance <= maxDistance) {
                candidates.push({
                    word: dictWord,
                    distance,
                    frequency: this.searchLogFrequency.get(dictWord) || 0
                });
            }
        }

        return candidates;
    }

    /**
     * Rank candidates by score
     * @param {Array} candidates - Correction candidates
     * @param {string} context - Previous word for context
     * @returns {string} Best candidate
     */
    rankCandidates(candidates, context) {
        if (candidates.length === 0) return null;

        // Score = (1 / (distance + 1)) * log(frequency) * contextBoost
        candidates.forEach(c => {
            c.score = (1 / (c.distance + 1)) * Math.log(c.frequency + 1);

            // Context boost
            if (context && this.bigramModel.has(`${context} ${c.word}`)) {
                c.score *= 2;
            }
        });

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].word;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(a, b) {
        const matrix = Array(a.length + 1).fill(null)
            .map(() => Array(b.length + 1).fill(0));

        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,        // deletion
                    matrix[i][j - 1] + 1,        // insertion
                    matrix[i - 1][j - 1] + cost  // substitution
                );
            }
        }

        return matrix[a.length][b.length];
    }
}

export default new SpellCorrector();
