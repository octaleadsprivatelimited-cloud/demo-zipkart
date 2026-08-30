import { db, storage } from '../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { ref, getDownloadURL, listAll } from 'firebase/storage';

// Define Collection Names constant to ensure consistency
export const COLLECTIONS = {
    CATEGORIES: 'categories',
    SUBCATEGORIES: 'subcategories',
    SKUS: 'skus',
    BANNERS: 'banners'
};

/**
 * Normalizes product data from the skus collection.
 * This ensures the web UI remains functional regardless of the source field names.
 */
const normalizeProduct = (id, data) => {
    if (!data) return null;

    // Explicitly extract nested image fields if they exist
    const frontImage = data.images?.front || data.frontImage || data.front_image || '';
    const backImage = data.images?.back || data.backImage || data.back_image || '';
    const detailImage = data.images?.detail || data.images?.details || data.detailsImage || '';

    // Collect ALL image URLs from the images map/array for imageUtils to work with
    const productImages = [];
    if (data.images && typeof data.images === 'object' && !Array.isArray(data.images)) {
        Object.values(data.images).forEach(url => {
            if (url && typeof url === 'string') productImages.push(url);
        });
    } else if (Array.isArray(data.images)) {
        data.images.forEach(url => {
            if (url && typeof url === 'string') productImages.push(url);
        });
    }
    if (Array.isArray(data.productImages)) {
        data.productImages.forEach(url => {
            if (url && typeof url === 'string' && !productImages.includes(url)) productImages.push(url);
        });
    }

    const normalized = {
        ...data,
        id: id,
        // Map master SKU fields to standard UI names
        name: data.name || data.productName || data.product_name || 'Unnamed Product',
        price: parseFloat(data.price || data.sellingPrice || data.productPrice || data.selling_price || data.sale_price || data.discountedPrice || 0),
        originalPrice: parseFloat(data.originalPrice || data.mrp || data.product_mrp || data.oldPrice || 0),
        // Ensure category and subcategory IDs are available in all formats
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || data.subcategoryId,
        subcategoryId: data.subCategoryId || data.subcategoryId, // lowercase fallback

        // Hoist image fields to top level for easier access
        frontImage,
        backImage,
        detailImage,
        images: data.images || {}, // Keep original structure too
        productImages, // All extracted image URLs for imageUtils

        // Standard image fallback
        image: frontImage || data.image || '',

        // Stock Normalization
        isOutOfStock:
            (data.inStock === false) ||
            (
                ((data.stock !== undefined && data.stock !== null) && parseInt(data.stock) <= 0) ||
                ((data.quantity !== undefined && data.quantity !== null) && parseInt(data.quantity) <= 0) ||
                ((data.availableQty !== undefined && data.availableQty !== null) && parseInt(data.availableQty) <= 0)
            ) && !(data.inStock === true) // inStock: true overrides numeric 0 for safety/fallback
    };

    // Fallback: If price is 0 but originalPrice exists, use originalPrice
    if (normalized.price <= 0 && normalized.originalPrice > 0) {
        normalized.price = normalized.originalPrice;
    }

    return normalized;
};

// ==================== CACHE LAYER ====================
// Simple in-memory cache to reduce Firestore calls
const cache = {
    categories: { data: null, timestamp: null },
    skus: { data: null, timestamp: null },
    subcategories: { data: null, timestamp: null }
};

// Promise cache to deduplicate in-flight requests
const promiseCache = {
    categories: null,
    skus: null,
    subcategories: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const isCacheValid = (cacheEntry) => {
    return cacheEntry.data && cacheEntry.timestamp && (Date.now() - cacheEntry.timestamp < CACHE_DURATION);
};

// Helper: Resolve Image URL (with basic caching)
// Note: We use a silent approach - failures return null without network errors
const imageUrlCache = new Map();
const failedPathsCache = new Set(); // Track paths that have already failed
const folderContentsCache = new Map(); // Cache folder contents to avoid repeated listAll calls

/**
 * Get the contents of a storage folder (with caching)
 */
const getFolderContents = async (folderPath) => {
    if (folderContentsCache.has(folderPath)) {
        return folderContentsCache.get(folderPath);
    }

    try {
        const folderRef = ref(storage, folderPath);
        const result = await listAll(folderRef);
        const files = result.items.map(item => item.fullPath);
        folderContentsCache.set(folderPath, files);
        return files;
    } catch {
        folderContentsCache.set(folderPath, []);
        return [];
    }
};

/**
 * Get category image URL by checking folder contents first (no 404 errors)
 */
const getCategoryImageUrl = async (categoryId) => {
    // Check cache first
    const cacheKey = `category_${categoryId}`;
    if (imageUrlCache.has(cacheKey)) {
        return imageUrlCache.get(cacheKey);
    }

    // Check if already known to not exist
    if (failedPathsCache.has(cacheKey)) {
        return null;
    }

    // Try finding the image in the category folder
    const possibleFolders = [
        `images/categories/${categoryId}`,
        `categories/${categoryId}`
    ];

    for (const folder of possibleFolders) {
        const files = await getFolderContents(folder);

        if (files.length > 0) {
            // Prefer certain file patterns
            const preferred = ['original.jpg', 'original.png', '256.png', '256.webp', '512.webp', '512.png'];
            let imageFile = null;

            // Try to find a preferred file first
            for (const pref of preferred) {
                const found = files.find(f => f.endsWith(`/${pref}`));
                if (found) {
                    imageFile = found;
                    break;
                }
            }

            // Otherwise use the first image file found
            if (!imageFile) {
                imageFile = files.find(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
            }

            if (imageFile) {
                try {
                    const imageRef = ref(storage, imageFile);
                    const url = await getDownloadURL(imageRef);
                    imageUrlCache.set(cacheKey, url);
                    return url;
                } catch {
                    // Continue to next folder
                }
            }
        }
    }

    // Mark as failed so we don't try again
    failedPathsCache.add(cacheKey);
    return null;
};



// ==================== CATEGORIES ====================

/**
 * Fetch all categories from Firestore (top-level collection)
 */
export const getCategories = async () => {
    // 1. Check Data Cache
    if (isCacheValid(cache.categories)) {
        return cache.categories.data;
    }

    // 2. Check Promise Cache (Deduplication)
    if (promiseCache.categories) {
        return promiseCache.categories;
    }

    // 3. Create new fetch promise
    promiseCache.categories = (async () => {
        try {
            const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
            const snapshot = await getDocs(categoriesRef);

            // Map docs to an array of promises to resolve image URLs
            const categoriesPromises = snapshot.docs.map(async (doc) => {
                const data = doc.data();
                let imageUrl = data.image;

                // Use the new getCategoryImageUrl helper to find images without 404 errors
                const resolvedUrl = await getCategoryImageUrl(doc.id);

                if (resolvedUrl) {
                    imageUrl = resolvedUrl;
                } else if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:'))) {
                    // FALLBACK: Use placeholder with category color
                    const bg = (data.color || 'E3F2FD').replace('#', '');
                    imageUrl = `https://placehold.co/400x400/${bg}/1e293b?text=${encodeURIComponent(data.name || 'Category')}`;
                }

                return {
                    id: doc.id,
                    ...data,
                    image: imageUrl
                };
            });

            const categories = await Promise.all(categoriesPromises);

            // Store in cache
            cache.categories = {
                data: categories,
                timestamp: Date.now()
            };

            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        } finally {
            promiseCache.categories = null;
        }
    })();

    return promiseCache.categories;
};


/**
 * Fetch a single category by ID
 */
export const getCategoryById = async (categoryId) => {
    try {
        const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId.toString());
        const categoryDoc = await getDoc(categoryRef);

        if (categoryDoc.exists()) {
            const data = categoryDoc.data();
            let imageUrl = data.image;

            // Use the new getCategoryImageUrl helper to find images without 404 errors
            const resolvedUrl = await getCategoryImageUrl(categoryId);

            if (resolvedUrl) {
                imageUrl = resolvedUrl;
            } else if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:'))) {
                // FALLBACK: Use placeholder with category color
                const bg = (data.color || 'E3F2FD').replace('#', '');
                imageUrl = `https://placehold.co/400x400/${bg}/1e293b?text=${encodeURIComponent(data.name || 'Category')}`;
            }

            return {
                id: categoryDoc.id,
                ...data,
                image: imageUrl
            };
        } else {
            throw new Error('Category not found');
        }
    } catch (error) {
        console.error('Error fetching category:', error);
        throw error;
    }
};

// ==================== SUBCATEGORIES ====================

/**
 * Fetch all subcategories from Firestore (top-level collection)
 */
export const getSubcategories = async () => {
    try {
        const subcategoriesRef = collection(db, COLLECTIONS.SUBCATEGORIES);
        const snapshot = await getDocs(subcategoriesRef);
        const subcategories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return subcategories;
    } catch (error) {
        console.error('Error fetching all subcategories:', error);
        throw error;
    }
};

/**
 * Fetch subcategories by category ID (using where clause on top-level collection)
 */
export const getSubcategoriesByCategoryId = async (categoryId) => {
    try {
        const subcategoriesRef = collection(db, COLLECTIONS.SUBCATEGORIES);

        // Try querying as string first (standard for Firestore IDs)
        let q = query(subcategoriesRef, where('categoryId', '==', categoryId.toString()));
        let snapshot = await getDocs(q);

        // If no results, and it looks like a number, try querying as number
        // (Handling legacy data or numeric IDs stored as numbers)
        if (snapshot.empty && !isNaN(parseInt(categoryId))) {
            q = query(subcategoriesRef, where('categoryId', '==', parseInt(categoryId)));
            snapshot = await getDocs(q);
        }

        const subcategories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return subcategories;
    } catch (error) {
        console.error('Error fetching subcategories by category:', error);
        throw error;
    }
};

// ==================== PRODUCTS ====================

/**
 * Fetch all products from Firestore (top-level collection)
 */
/**
 * Enriches a list of products with real-time stock data from sku_source_map
 */
const enrichProductsWithStock = async (products) => {
    if (!products || products.length === 0) return [];

    try {
        // Batch query sku_source_map using 'in' operator (max 30 per batch)
        // Batch query sku_source_map using 'in' operator
        // 'in' supports max 10 values. We double the IDs (string + number) so we batch 5 products max.
        const BATCH_SIZE = 5;
        const productIds = products.map(p => p.id);
        const sourceEntries = new Map(); // skuId -> [{ availableQty, ... }]

        // Create array of batch promises to fetch in parallel
        const batchPromises = [];
        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            const batch = productIds.slice(i, i + BATCH_SIZE);
            const queryIds = [];
            batch.forEach(id => {
                queryIds.push(id.toString());
                const num = Number(id);
                if (!isNaN(num)) queryIds.push(num);
            });
            const uniqueQueryIds = [...new Set(queryIds)].slice(0, 10);
            if (uniqueQueryIds.length === 0) continue;

            const mapRef = collection(db, 'sku_source_map');
            const q = query(mapRef, where('skuId', 'in', uniqueQueryIds));
            batchPromises.push(getDocs(q));
        }

        // Wait for all batches in parallel
        const snapshots = await Promise.all(batchPromises);
        
        // Process results
        snapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                const skuId = String(data.skuId);
                if (!sourceEntries.has(skuId)) {
                    sourceEntries.set(skuId, []);
                }
                sourceEntries.get(skuId).push(data);
            });
        });

        // Now enrich each product using the batched data
        return products.map(product => {
            try {
                // 1. If explicitly marked out of stock via inStock: false
                if (product.inStock === false) return { ...product, isOutOfStock: true, stock: 0 };

                // 2. Check batched source entries
                // Use String lookup
                const entries = sourceEntries.get(String(product.id));

                // Determine Pricing from Vendor entries (lowest price from any entry)
                let vendorPrice = null;
                let vendorTotalStock = 0;
                let hasVendor = false;

                if (entries && entries.length > 0) {
                    hasVendor = true;
                    entries.forEach(entry => {
                        // Stock — only count ACTIVE entries
                        const isActive = entry.status === 'ACTIVE';
                        const qty = parseInt(entry.availableQty);
                        if (isActive && !isNaN(qty)) vendorTotalStock += qty;

                        // Price — pick lowest vendor price (from any entry that has one)
                        const p = parseFloat(entry.sellingPrice || entry.price || entry.unitPrice || 0);
                        if (p > 0 && (vendorPrice === null || p < vendorPrice)) {
                            vendorPrice = p;
                        }
                    });
                }

                // Determine Final Stock
                let finalStock = 0;
                let isOutOfStock = true;

                if (hasVendor) {
                    finalStock = vendorTotalStock;
                    isOutOfStock = finalStock <= 0;
                } else {
                    // Check Master Doc fields if no vendor
                    const hasMasterStock = (
                        (product.inStock === true) ||
                        (product.stock !== undefined && product.stock !== null && parseInt(product.stock) > 0) ||
                        (product.quantity !== undefined && product.quantity !== null && parseInt(product.quantity) > 0) ||
                        (product.availableQty !== undefined && product.availableQty !== null && parseInt(product.availableQty) > 0)
                    );

                    if (hasMasterStock) {
                        finalStock = (product.stock || product.quantity || product.availableQty || (product.inStock ? 99 : 0));
                        isOutOfStock = false;
                    } else {
                        finalStock = 0;
                        isOutOfStock = true;
                    }
                }

                // Determine Final Price
                // Vendor Price > Product Price > 0
                const finalPrice = vendorPrice || product.price || product.productPrice || 0;

                return {
                    ...product,
                    isOutOfStock,
                    stock: parseInt(finalStock),
                    price: finalPrice // Override price with enriched price
                };

            } catch (err) {
                console.error(`Error checking stock for ${product.id}:`, err);
                return product;
            }
        });

    } catch (err) {
        console.error('Error in batched stock enrichment:', err);
        return products; // Return original on total failure
    }
};

// ==================== PRODUCTS ====================

/**
 * Fetch all products from Firestore (top-level collection)
 */
export const getProducts = async (limitCount = null) => {
    // 1. Check Data Cache (NOTE: Cache ignores limit, so if full cache exists, we use it)
    if (isCacheValid(cache.skus)) {
        const data = cache.skus.data;
        const sliced = limitCount ? data.slice(0, limitCount) : data;
        return await enrichProductsWithStock(sliced);
    }

    // 2. Check Promise Cache (Deduplication)
    if (promiseCache.skus) {
        const data = await promiseCache.skus;
        const sliced = limitCount ? data.slice(0, limitCount) : data;
        return await enrichProductsWithStock(sliced);
    }

    // 3. Create new fetch promise
    promiseCache.skus = (async () => {
        try {
            const productsRef = collection(db, COLLECTIONS.SKUS);
            let q = productsRef;
            if (limitCount && !isCacheValid(cache.skus)) {
                q = query(productsRef, limit(limitCount));
            }

            const snapshot = await getDocs(q);
            const products = snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data()));

            // Only cache if we fetched EVERYTHING (no limit)
            if (!limitCount) {
                cache.skus = {
                    data: products,
                    timestamp: Date.now()
                };
            }

            return products;
        } catch (error) {
            console.error('Error fetching all products:', error);
            throw error;
        } finally {
            promiseCache.skus = null;
        }
    })();

    const result = await promiseCache.skus;
    return await enrichProductsWithStock(result);
};

/**
 * Fetch products by category ID (using where clause on top-level collection)
 */
export const getProductsByCategory = async (categoryId, limitCount = null) => {
    try {
        const productsRef = collection(db, COLLECTIONS.SKUS);

        // Try querying as string first
        let q = query(productsRef, where('categoryId', '==', categoryId.toString()));
        if (limitCount) q = query(q, limit(limitCount));

        let snapshot = await getDocs(q);

        // If no results, and it looks like a number, try querying as number
        if (snapshot.empty && !isNaN(parseInt(categoryId))) {
            q = query(productsRef, where('categoryId', '==', parseInt(categoryId)));
            if (limitCount) q = query(q, limit(limitCount));
            snapshot = await getDocs(q);
        }

        const products = snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data()));
        return await enrichProductsWithStock(products);
    } catch (error) {
        console.error('Error fetching products by category:', error);
        throw error;
    }
};

/**
 * Fetch products by subcategory ID
 */
export const getProductsBySubcategory = async (subcategoryId) => {
    try {
        const productsRef = collection(db, COLLECTIONS.SKUS);
        // Try exact match first
        let q = query(productsRef, where('subCategoryId', '==', subcategoryId.toString()));
        let snapshot = await getDocs(q);

        const products = snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data()));
        return await enrichProductsWithStock(products);
    } catch (error) {
        console.error('Error fetching products by subcategory:', error);
        throw error;
    }
};

/**
 * Fetch a single product by ID
 */
export const getProductById = async (productId) => {
    try {
        const productRef = doc(db, COLLECTIONS.SKUS, productId.toString());
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
            const product = normalizeProduct(productDoc.id, productDoc.data());
            const enriched = await enrichProductsWithStock([product]);
            return enriched[0];
        } else {
            throw new Error('Product not found');
        }
    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
};

// ==================== DATA UPLOAD HELPERS ====================

/**
 * Upload categories to Firestore (top-level collection)
 */
export const uploadCategories = async (categories) => {
    try {
        console.log(`Attempting to upload ${categories.length} categories...`);

        for (const category of categories) {
            try {
                // Upload Category Document to top-level categories collection
                const categoryRef = doc(db, COLLECTIONS.CATEGORIES, category.id.toString());
                await setDoc(categoryRef, {
                    name: category.name,
                    slug: category.slug,
                    image: category.image
                });

                // Upload Subcategories to top-level subcategories collection
                if (category.subcategories && category.subcategories.length > 0) {
                    for (const sub of category.subcategories) {
                        const subRef = doc(db, COLLECTIONS.SUBCATEGORIES, sub.id.toString());
                        await setDoc(subRef, {
                            name: sub.name,
                            image: sub.image || '',
                            categoryId: category.id,
                            slug: sub.slug || ''
                        });
                    }
                }
                console.log(`✓ Uploaded category and subcategories for: ${category.name}`);
            } catch (err) {
                console.error(`✗ Failed to upload category ${category.name}:`, err);
                throw err;
            }
        }

        console.log('✅ All categories and subcategories uploaded successfully!');
        return { success: true, count: categories.length };
    } catch (error) {
        console.error('❌ Error uploading categories:', error);
        throw error;
    }
};

/**
 * Upload products to Firestore (top-level collection)
 */
export const uploadProducts = async (products) => {
    try {
        console.log(`Attempting to upload ${products.length} products...`);

        // Upload in batches of 10
        const batchSize = 10;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            const promises = batch.map(product => {
                const productId = product.id.toString();
                const subId = product.subCategoryId ? product.subCategoryId.toString() : 'misc';

                // Upload to top-level products collection
                const productRef = doc(db, COLLECTIONS.SKUS, productId);

                return setDoc(productRef, {
                    id: productId,
                    name: product.name,
                    weight: product.weight,
                    price: product.price,
                    time: product.time,
                    image: product.image,
                    categoryId: product.categoryId,
                    subCategoryId: subId,
                    subcategory: product.subcategory || ''
                });
            });

            await Promise.all(promises);
            console.log(`✓ Uploaded products ${i + 1} to ${Math.min(i + batchSize, products.length)}`);
        }

        console.log('✅ All products uploaded successfully!');
        return { success: true, count: products.length };
    } catch (error) {
        console.error('❌ Error uploading products:', error);
        throw error;
    }
};
