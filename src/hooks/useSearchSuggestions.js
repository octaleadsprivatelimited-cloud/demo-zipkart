/**
 * Auto-Suggestion Hook
 * Provides search suggestions as user types
 */

import { useState, useEffect } from 'react';
import { searchEngine } from '../services/search';

export const useSearchSuggestions = (query, products, debounceMs = 300) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query || query.length < 2) {
            // Avoid synchronous state updates in effect
            setTimeout(() => setSuggestions([]), 0);
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        const timer = setTimeout(() => {
            const results = searchEngine.getSuggestions(query, products);
            setSuggestions(results);
            setLoading(false);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, products, debounceMs, setSuggestions, setLoading]);

    return { suggestions, loading };
};
