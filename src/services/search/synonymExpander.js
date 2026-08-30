/**
 * Synonym Expansion Service
 * Supports English, Hindi, and Hinglish synonyms
 */

export class SynonymExpander {
    constructor() {
        // Synonym mappings (English, Hindi, Hinglish)
        this.synonyms = {
            // Dairy
            'milk': ['doodh', 'dudh', 'dairy'],
            'doodh': ['milk', 'dudh'],
            'dudh': ['milk', 'doodh'],
            'butter': ['makhan', 'makkhan'],
            'ghee': ['clarified butter'],
            'curd': ['dahi', 'yogurt'],
            'dahi': ['curd', 'yogurt'],
            'paneer': ['cottage cheese'],

            // Vegetables
            'onion': ['pyaaz', 'pyaj', 'kanda'],
            'pyaaz': ['onion', 'pyaj', 'kanda'],
            'pyaj': ['onion', 'pyaaz'],
            'potato': ['aloo', 'aaloo', 'batata'],
            'aloo': ['potato', 'aaloo'],
            'aaloo': ['potato', 'aloo'],
            'tomato': ['tamatar', 'tamater'],
            'tamatar': ['tomato', 'tamater'],
            'vegetables': ['veggies', 'sabzi', 'sabji'],
            'sabzi': ['vegetables', 'veggies', 'sabji'],
            'sabji': ['vegetables', 'sabzi'],
            'spinach': ['palak'],
            'palak': ['spinach'],
            'cauliflower': ['gobi', 'phool gobi'],
            'gobi': ['cauliflower'],

            // Fruits
            'fruits': ['phal', 'fal'],
            'phal': ['fruits', 'fal'],
            'apple': ['seb'],
            'seb': ['apple'],
            'banana': ['kela'],
            'kela': ['banana'],
            'mango': ['aam'],
            'aam': ['mango'],

            // Snacks & Biscuits
            'biscuit': ['cookies', 'biskut', 'biscoot'],
            'biskut': ['biscuit', 'cookies'],
            'cookies': ['biscuit', 'biskut'],
            'snacks': ['namkeen', 'farsan'],
            'namkeen': ['snacks', 'farsan'],
            'chips': ['wafers'],

            // Sweets
            'chocolate': ['choco', 'chocolaty'],
            'choco': ['chocolate'],
            'sweet': ['meetha', 'mithai'],
            'meetha': ['sweet', 'mithai'],
            'mithai': ['sweet', 'meetha'],

            // Beverages
            'water': ['paani', 'pani'],
            'paani': ['water', 'pani'],
            'pani': ['water', 'paani'],
            'tea': ['chai'],
            'chai': ['tea'],
            'coffee': ['kafi'],

            // Grains & Bread
            'bread': ['pav', 'double roti'],
            'pav': ['bread'],
            'rice': ['chawal'],
            'chawal': ['rice'],
            'wheat': ['gehun', 'atta'],
            'gehun': ['wheat', 'atta'],
            'atta': ['flour', 'wheat'],

            // Brands (common)
            'amul': ['amul milk', 'amul products'],
            'britannia': ['britannia biscuits'],
            'parle': ['parle g', 'parle products'],
            'nestle': ['nestle products'],
            'cadbury': ['cadbury chocolate'],

            // Categories
            'grocery': ['groceries', 'kirana'],
            'kirana': ['grocery', 'groceries'],

            // Modifiers
            'low': ['lite', 'light'],
            'lite': ['low', 'light'],
            'sugar free': ['no sugar', 'sugarfree'],
            'fat free': ['no fat', 'fatfree'],
            'organic': ['natural']
        };

        // Build reverse mapping for quick lookup
        this.reverseMap = this.buildReverseMap();
    }

    /**
     * Build reverse mapping for canonical terms
     */
    buildReverseMap() {
        const reverse = new Map();
        for (const [key, values] of Object.entries(this.synonyms)) {
            reverse.set(key, key);
            values.forEach(v => reverse.set(v, key));
        }
        return reverse;
    }

    /**
     * Expand query with synonyms
     * @param {string} query - Normalized query
     * @returns {string[]} Array of expanded terms including original
     */
    expand(query) {
        const tokens = query.split(' ');
        const expandedTerms = new Set([query]); // Include original

        // Single token expansion
        tokens.forEach(token => {
            const canonical = this.reverseMap.get(token);
            if (canonical && this.synonyms[canonical]) {
                this.synonyms[canonical].forEach(syn => {
                    expandedTerms.add(syn);
                });
                expandedTerms.add(canonical);
            }
        });

        // Multi-token phrase expansion
        const phrase = tokens.join(' ');
        const canonical = this.reverseMap.get(phrase);
        if (canonical && this.synonyms[canonical]) {
            this.synonyms[canonical].forEach(syn => {
                expandedTerms.add(syn);
            });
        }

        return Array.from(expandedTerms);
    }

    /**
     * Get canonical term for a word
     * @param {string} word - Word to get canonical form
     * @returns {string} Canonical term
     */
    getCanonical(word) {
        return this.reverseMap.get(word.toLowerCase()) || word;
    }
}

export default new SynonymExpander();
