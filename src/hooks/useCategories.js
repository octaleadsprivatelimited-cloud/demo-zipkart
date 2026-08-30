import { useState, useEffect } from 'react';
import { getCategories } from '../services/firestoreService';

// Simple in-memory cache to prevent redundant fetches across multiple components
let categoryCache = null;
let categoryPromise = null;

/**
 * Custom hook to fetch categories from Firestore with semi-global caching
 * Returns: { categories, loading, error, refetch }
 */
export const useCategories = () => {
    const [categories, setCategories] = useState(categoryCache || []);
    const [loading, setLoading] = useState(!categoryCache);
    const [error, setError] = useState(null);

    const fetchCategories = async (force = false) => {
        if (!force && categoryCache) {
            setCategories(categoryCache);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // If already fetching, wait for that promise instead of starting a new one
            if (categoryPromise && !force) {
                const data = await categoryPromise;
                setCategories(data);
                return;
            }

            categoryPromise = getCategories();
            const data = await categoryPromise;
            categoryCache = data;
            setCategories(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch categories');
            console.error('Error in useCategories:', err);
        } finally {
            setLoading(false);
            categoryPromise = null;
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return {
        categories,
        loading,
        error,
        refetch: () => fetchCategories(true)
    };
};
