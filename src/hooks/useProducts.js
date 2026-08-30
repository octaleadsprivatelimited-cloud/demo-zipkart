import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, limit as firestoreLimit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection name - must match firestoreService.js
const SKUS_COLLECTION = 'skus';

/**
 * Normalizes product data from Firestore document
 * Mirrors the normalizeProduct logic from firestoreService.js
 */
const normalizeProduct = (id, data) => {
    if (!data) return null;

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
        name: data.name || data.productName || data.product_name || 'Unnamed Product',
        price: parseFloat(data.price || data.sellingPrice || data.productPrice || data.selling_price || data.sale_price || data.discountedPrice || 0),
        originalPrice: parseFloat(data.originalPrice || data.mrp || data.product_mrp || data.oldPrice || 0),
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || data.subcategoryId,
        subcategoryId: data.subCategoryId || data.subcategoryId,
        frontImage,
        backImage,
        detailImage,
        images: data.images || {},
        productImages, // All extracted image URLs for imageUtils
        image: frontImage || data.image || '',
        isOutOfStock:
            (data.inStock === false) ||
            (
                ((data.stock !== undefined && data.stock !== null) && parseInt(data.stock) <= 0) ||
                ((data.quantity !== undefined && data.quantity !== null) && parseInt(data.quantity) <= 0) ||
                ((data.availableQty !== undefined && data.availableQty !== null) && parseInt(data.availableQty) <= 0)
            ) && !(data.inStock === true)
    };

    // Fallback: If price is 0 but originalPrice exists, use originalPrice
    if (normalized.price <= 0 && normalized.originalPrice > 0) {
        normalized.price = normalized.originalPrice;
    }

    return normalized;
};

/**
 * Custom hook to fetch products from Firestore using REAL-TIME listeners.
 * When admin adds/edits/deletes products or changes images, the UI updates instantly.
 *
 * @param {number|string} categoryId - Optional category ID to filter products
 * @param {number} limitCount - Optional limit on number of products
 * Returns: { products, loading, error, refetch }
 */
export const useProducts = (categoryId = null, limitCount = null) => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null); // Moved up to be accessible in derived state block
    const [loading, setLoading] = useState(true);
    const [prevParams, setPrevParams] = useState({ categoryId, limitCount });

    if (categoryId !== prevParams.categoryId || limitCount !== prevParams.limitCount) {
        setPrevParams({ categoryId, limitCount });
        if (!loading) setLoading(true);
        if (error) setError(null);
    }
    const unsubRef = useRef(null);

    useEffect(() => {
        // Clean up previous listener
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        const productsRef = collection(db, SKUS_COLLECTION);
        let q = productsRef;

        // Build query based on parameters
        const constraints = [];

        if (categoryId) {
            constraints.push(where('categoryId', '==', categoryId.toString()));
        }

        if (limitCount) {
            constraints.push(firestoreLimit(limitCount));
        }

        if (constraints.length > 0) {
            q = query(productsRef, ...constraints);
        }

        // Set up real-time listener using onSnapshot
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data()));
            setProducts(data);
            setLoading(false);
        }, (err) => {
            console.error('Error in useProducts real-time listener:', err);
            setError(err.message || 'Failed to fetch products');
            setLoading(false);
        });

        unsubRef.current = unsub;

        // Cleanup on unmount or dependency change
        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [categoryId, limitCount]);

    // Manual refetch: tear down and re-create listener
    const refetch = useCallback(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }
        setLoading(true);
        setError(null);

        const productsRef = collection(db, SKUS_COLLECTION);
        let q = productsRef;
        const constraints = [];

        if (categoryId) {
            constraints.push(where('categoryId', '==', categoryId.toString()));
        }
        if (limitCount) {
            constraints.push(firestoreLimit(limitCount));
        }
        if (constraints.length > 0) {
            q = query(productsRef, ...constraints);
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => normalizeProduct(doc.id, doc.data()));
            setProducts(data);
            setLoading(false);
        }, (err) => {
            console.error('Error in useProducts refetch:', err);
            setError(err.message || 'Failed to fetch products');
            setLoading(false);
        });

        unsubRef.current = unsub;
    }, [categoryId, limitCount]);

    return {
        products,
        loading,
        error,
        refetch
    };
};
