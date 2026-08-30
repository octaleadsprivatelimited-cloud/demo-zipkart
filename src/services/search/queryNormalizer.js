/**
 * Query Normalization Service
 * Standardizes input queries for consistent processing
 */

export class QueryNormalizer {
    constructor() {
        // Common stop words (carefully selected - some are meaningful in grocery context)
        this.stopWords = new Set(['the', 'a', 'an', 'for', 'of', 'with']);
    }

    /**
     * Normalize a search query
     * @param {string} rawQuery - Raw user input
     * @returns {string} Normalized query
     */
    normalize(rawQuery) {
        if (!rawQuery || typeof rawQuery !== 'string') {
            return '';
        }

        let query = rawQuery.toLowerCase().trim();

        // Remove special characters except spaces and hyphens
        query = query.replace(/[^\w\s-]/g, ' ');

        // Collapse multiple spaces
        query = query.replace(/\s+/g, ' ');

        // Remove stop words (but keep them if query is very short)
        const tokens = query.split(' ');
        if (tokens.length > 2) {
            const filtered = tokens.filter(t => !this.stopWords.has(t));
            if (filtered.length > 0) {
                query = filtered.join(' ');
            }
        }

        return query.trim();
    }

    /**
     * Tokenize query into individual terms
     * @param {string} query - Normalized query
     * @returns {string[]} Array of tokens
     */
    tokenize(query) {
        return query.split(' ').filter(t => t.length > 0);
    }
}

export default new QueryNormalizer();
