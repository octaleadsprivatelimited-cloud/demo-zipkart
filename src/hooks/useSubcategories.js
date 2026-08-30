import { useState, useEffect, useCallback } from 'react';
import { getSubcategories, getSubcategoriesByCategoryId } from '../services/firestoreService';

/**
 * Custom hook to fetch subcategories from Firestore
 * @param {string|number} categoryId - Optional category ID to filter subcategories
 * Returns: { subcategories, loading, error, refetch }
 */
export const useSubcategories = (categoryId = null) => {
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSubcategories = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let data;
            if (categoryId) {
                // Fetch subcategories for a specific category
                data = await getSubcategoriesByCategoryId(categoryId);
            } else {
                // Fetch all subcategories
                data = await getSubcategories();
            }

            setSubcategories(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch subcategories');
            console.error('Error in useSubcategories:', err);
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => {
        fetchSubcategories();
    }, [fetchSubcategories]);

    return {
        subcategories,
        loading,
        error,
        refetch: fetchSubcategories
    };
};
