/**
 * Product Image Utility
 * 
 * Robustly handles image selection by prioritizing strict database fields
 * and falling back to intelligent URL analysis to distinguish front vs back images.
 * 
 * Supports Firestore `images` as both a Map (object) and an Array.
 */

// Keywords to identify image types from URLs
const BACK_IMG_KEYWORDS = [
    'back', 'rear', 'nutrition', 'nutritional', 'ingredients',
    'info', 'label', 'details', 'detail', 'variant', 'fssai', 'mrp',
    '_b.', '_b_', '-b.', '-b_'
];

const FRONT_IMG_KEYWORDS = [
    'front', 'main', 'primary', 'hero', 'cover', 'display',
    'front_strict', 'original', 'default',
    '_f.', '_f_', '-f.', '-f_'
];

/**
 * Checks if a URL likely points to a back/nutrition image
 */
const isLikelyBackImage = (url) => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return BACK_IMG_KEYWORDS.some(k => lower.includes(k));
};

/**
 * Checks if a URL likely points to a front image
 */
const isLikelyFrontImage = (url) => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return FRONT_IMG_KEYWORDS.some(k => lower.includes(k)) && !BACK_IMG_KEYWORDS.some(k => lower.includes(k));
};

/**
 * Extract all valid image URLs from a product's `images` field,
 * whether it's a Firestore Map (object) or an Array.
 */
const collectAllImageUrls = (product) => {
    const urls = [];

    // 1. From `images` field - handle both Object (Firestore map) and Array
    if (product.images) {
        if (Array.isArray(product.images)) {
            product.images.forEach(url => {
                if (url && typeof url === 'string') urls.push(url);
            });
        } else if (typeof product.images === 'object') {
            // Firestore Map: { front: "url", back: "url", ... } or { 0: "url", 1: "url" }
            Object.values(product.images).forEach(url => {
                if (url && typeof url === 'string') urls.push(url);
            });
        }
    }

    // 2. From `productImages` array
    if (Array.isArray(product.productImages)) {
        product.productImages.forEach(url => {
            if (url && typeof url === 'string' && !urls.includes(url)) urls.push(url);
        });
    }

    // 3. From `image` field (single URL)
    if (product.image && typeof product.image === 'string' && !urls.includes(product.image)) {
        urls.push(product.image);
    }

    return urls;
};

/**
 * Get the front/primary image
 * Prioritizes:
 * 1. product.images.front (Nested object)
 * 2. product.frontImage (Direct field)
 * 3. Intelligent search in all collected image URLs
 * 4. Fallback to first non-back image
 */
export const getFrontImage = (product) => {
    if (!product) return '';

    // 1. Strict Nested Field
    if (product.images?.front) return product.images.front;

    // 2. Strict Direct Field
    if (product.frontImage || product.front_image || product.front) {
        return product.frontImage || product.front_image || product.front;
    }

    // 3. Collect ALL image URLs from all sources
    const validCandidates = collectAllImageUrls(product);
    if (validCandidates.length === 0) return '';

    // 4. Intelligent Search: Find explicit front image
    const explicitFront = validCandidates.find(url => isLikelyFrontImage(url));
    if (explicitFront) return explicitFront;

    // 5. Intelligent Search: Find any image that is explicitly NOT a back image
    const notBack = validCandidates.find(url => !isLikelyBackImage(url));
    if (notBack) return notBack;

    // 6. Ultimate Fallback
    return validCandidates[0];
};

/**
 * Get the back image
 */
export const getBackImage = (product) => {
    if (!product) return '';

    // 1. Strict Nested Field
    if (product.images?.back) return product.images.back;

    // 2. Strict Direct Field
    if (product.backImage || product.back_image || product.back) {
        return product.backImage || product.back_image || product.back;
    }

    // 3. Collect ALL image URLs and search for back image
    const validCandidates = collectAllImageUrls(product);
    const explicitBack = validCandidates.find(url => isLikelyBackImage(url));
    if (explicitBack) return explicitBack;

    // 4. If there are multiple images and no explicit back was found by URL analysis,
    //    return the second image as a likely back image
    const frontImage = getFrontImage(product);
    const otherImages = validCandidates.filter(url => url !== frontImage);
    if (otherImages.length > 0) return otherImages[0];

    return '';
};

/**
 * Get the detailed image
 */
export const getDetailedImage = (product) => {
    if (!product) return '';

    // 1. Strict Nested Field
    if (product.images?.detail || product.images?.details) return product.images.detail || product.images.details;

    // 2. Strict Direct Field
    if (product.detailsImage || product.detailImage || product.details) {
        return product.detailsImage || product.detailImage || product.details;
    }

    // 3. Collect all images and try 3rd unique image
    const allUrls = collectAllImageUrls(product);
    const front = getFrontImage(product);
    const back = getBackImage(product);
    const remaining = allUrls.filter(url => url !== front && url !== back);
    if (remaining.length > 0) return remaining[0];

    return '';
};

/**
 * Get all product images in strict order: [Front, Back, Details, ...others]
 * Ensures we show ALL available images from the Firestore images map.
 */
export const getProductImages = (product) => {
    if (!product) return [''];

    const front = getFrontImage(product);
    const back = getBackImage(product);
    const detail = getDetailedImage(product);

    // Build unique list preserving order: front, back, detail
    const images = [];
    const seen = new Set();

    const addUnique = (url) => {
        if (url && typeof url === 'string' && !seen.has(url)) {
            seen.add(url);
            images.push(url);
        }
    };

    addUnique(front);
    addUnique(back);
    addUnique(detail);

    // Also add any remaining images from the images map/array that we haven't used yet
    const allUrls = collectAllImageUrls(product);
    allUrls.forEach(url => addUnique(url));

    return images.length > 0 ? images : [''];
};

export const getImageByPriority = (product, index) => {
    const images = getProductImages(product);
    return images[index] || '';
};
