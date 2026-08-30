import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * Real-time stock & pricing hook.
 * Listens to `sku_source_map` for each product and returns a map of
 * productId → { price, mrp, stock, isOutOfStock }
 *
 * @param {Array} products - Array of product objects (must have `.id`)
 * @returns {Object} Map of productId → real-time stock/price info
 */
export const useRealTimeStock = (products) => {
    const [stockMap, setStockMap] = useState({});
    // Keep a ref to track current product IDs to avoid unnecessary re-subscriptions
    const prevIdsRef = useRef('');

    // Stabilize the product IDs so the effect doesn't re-run on every render
    const productIds = useMemo(() => {
        if (!products || products.length === 0) return [];
        return products.map(p => String(p.id)).filter(Boolean).sort();
    }, [products]);

    const idsKey = useMemo(() => productIds.join(','), [productIds]);

    useEffect(() => {
        if (productIds.length === 0) {
            // Only reset if we previously had data
            if (prevIdsRef.current !== '') {
                setStockMap({});
                prevIdsRef.current = '';
            }
            return;
        }

        // Skip if the product IDs haven't changed
        if (idsKey === prevIdsRef.current) return;
        prevIdsRef.current = idsKey;

        const unsubscribers = [];

        // Firestore 'in' operator supports max 10 values.
        // We query both string and number variants of each ID, so batch size is 5.
        const BATCH_SIZE = 5;

        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            const batch = productIds.slice(i, i + BATCH_SIZE);

            // Expand to include both string and numeric types for safety
            const queryIds = [];
            batch.forEach(id => {
                queryIds.push(id);
                const num = Number(id);
                if (!isNaN(num)) queryIds.push(num);
            });
            const uniqueQueryIds = [...new Set(queryIds)].slice(0, 10);

            if (uniqueQueryIds.length === 0) continue;

            const mapRef = collection(db, 'sku_source_map');
            // Fetch ALL entries (not just ACTIVE) so we always have price/MRP data.
            // Stock availability is determined from availableQty and status fields.
            const q = query(
                mapRef,
                where('skuId', 'in', uniqueQueryIds)
            );

            const unsub = onSnapshot(q, (snapshot) => {
                setStockMap(prev => {
                    const updated = { ...prev };

                    // Group entries by skuId
                    const entriesBySkuId = {};
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const skuId = String(data.skuId);
                        if (!entriesBySkuId[skuId]) {
                            entriesBySkuId[skuId] = [];
                        }
                        entriesBySkuId[skuId].push(data);
                    });

                    // Process each SKU's entries
                    batch.forEach(id => {
                        const entries = entriesBySkuId[id];
                        if (entries && entries.length > 0) {
                            let bestPrice = null;
                            let bestMrp = null;
                            let totalStock = 0;

                            entries.forEach(entry => {
                                // Stock — only count ACTIVE entries
                                const isActive = entry.status === 'ACTIVE';
                                const qty = parseInt(entry.availableQty);
                                if (isActive && !isNaN(qty)) totalStock += qty;

                                // Price — pick the lowest vendor price (from any entry that has one)
                                const p = parseFloat(entry.sellingPrice || entry.price || entry.unitPrice || 0);
                                if (p > 0 && (bestPrice === null || p < bestPrice)) {
                                    bestPrice = p;
                                }

                                // MRP — pick the highest MRP
                                const m = parseFloat(entry.mrp || 0);
                                if (m > 0 && (bestMrp === null || m > bestMrp)) {
                                    bestMrp = m;
                                }
                            });

                            updated[id] = {
                                price: bestPrice || 0,
                                mrp: bestMrp || 0,
                                stock: totalStock,
                                isOutOfStock: totalStock <= 0,
                            };
                        }
                        // If no entries found, we don't override any existing data
                        // The product may just not have vendor entries yet
                    });

                    return updated;
                });
            });

            unsubscribers.push(unsub);
        }

        // Cleanup listeners on unmount or when products change
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [productIds, idsKey]);

    return stockMap;
};
