import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

// Default Admin Config (fallback if Firestore document not found)
const DEFAULT_ADMIN_CONFIG = {
  sourceId: 'admin',
  sourceName: 'Zipcart Dark Store',
  sourceType: 'DARKSTORE',
  location: { lat: 17.4575, lng: 78.3707, address: 'Vendor Warehouse' }
};

// Cached admin config fetched from Firestore
let _cachedAdminConfig = null;
const _cachedSources = new Map();

// Fetch specific source config (vendor details)
const getSourceDetail = async (sourceId) => {
  if (sourceId === 'admin') return await getAdminSourceConfig();
  if (_cachedSources.has(sourceId)) return _cachedSources.get(sourceId);

  try {
    const sourceDoc = await getDoc(doc(db, 'sources', sourceId));
    if (sourceDoc.exists()) {
      const data = sourceDoc.data();
      const detail = {
        sourceId,
        sourceName: data.sourceName || data.name || 'Partner Vendor',
        sourceType: data.sourceType || 'VENDOR',
        location: {
          lat: data.location?.lat || data.lat || 0,
          lng: data.location?.lng || data.lng || 0,
          address: data.location?.address || data.address || ''
        }
      };
      _cachedSources.set(sourceId, detail);
      return detail;
    }
  } catch (e) {
    console.warn(`⚠️ [SOURCE CONFIG] Failed to fetch details for ${sourceId}`);
  }
  return null;
};

// Fetch admin warehouse config from Firestore (sources/admin) with caching
const getAdminSourceConfig = async () => {
  if (_cachedAdminConfig) return _cachedAdminConfig;

  try {
    const adminDoc = await getDoc(doc(db, 'sources', 'admin'));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      _cachedAdminConfig = {
        sourceId: 'admin',
        sourceName: data.sourceName || data.name || DEFAULT_ADMIN_CONFIG.sourceName,
        sourceType: data.sourceType || DEFAULT_ADMIN_CONFIG.sourceType,
        location: {
          lat: data.location?.lat || data.lat || DEFAULT_ADMIN_CONFIG.location.lat,
          lng: data.location?.lng || data.lng || DEFAULT_ADMIN_CONFIG.location.lng,
          address: data.location?.address || data.address || DEFAULT_ADMIN_CONFIG.location.address
        }
      };
      return _cachedAdminConfig;
    }
  } catch (e) {
    console.warn('⚠️ [ADMIN CONFIG] Failed to fetch from Firestore, using defaults');
  }

  return DEFAULT_ADMIN_CONFIG;
};

// Helper: Calculate Distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const WebOrderService = {

  /**
   * MASTER CHECKOUT FUNCTION (Cloud-Powered)
   * Calls the centralized Firebase Cloud Function to handle 2-source fulfillment and order creation.
   */
  processCheckout: async (userId, orderData) => {
    try {
      console.log("🚀 [CHECKOUT] Calling Centralized Fulfillment Function...");

      const processOptimizedOrder = httpsCallable(functions, 'processOptimizedOrder');
      const result = await processOptimizedOrder({ orderData });

      if (result.data.success) {
        console.log("✅ [CHECKOUT] Order Created via Cloud:", result.data.orderId);
        return { success: true, orderId: result.data.orderId };
      } else {
        console.warn("⚠️ [CHECKOUT] Cloud fulfillment rejected:", result.data.error);
        return { success: false, error: result.data.error };
      }
    } catch (error) {
      console.error("❌ [CHECKOUT] Cloud Function failed:", error);
      return { success: false, error: error.message || "Failed to process order securely." };
    }
  },

  /**
   * DECIDE FULFILLMENT (Local Preview)
   * This logic is kept for UI feedback (e.g. showing "Split Order" badges) 
   * but the actual validation happens in the Cloud Function.
   */
  planFulfillment: async (cartItems, customerLat, customerLng, adminConfig = null) => {
    const ADMIN_SOURCE_CONFIG = adminConfig || await getAdminSourceConfig();
    const plan = {
      items: [],
      sourceIds: new Set(),
      unfulfillable: [],
      vendorFulfilled: [],
      adminFulfilled: [],
      canFulfill: true,
      sourceCount: 0,
      isSplitOrder: false
    };

    const itemAnalysis = [];
    for (const item of cartItems) {
      const productId = item.productId || item.id;
      const quantity = item.quantity || 1;
      let adminData = null;
      const possibleVendors = [];

      if (!productId) {
        console.warn("⚠️ [FULFILLMENT] Missing productId for item:", item?.name);
        itemAnalysis.push({ item, adminData, possibleVendors, assigned: false });
        continue;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'skus', productId));
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          const stock = Number(data.stock || data.availableQty || data.quantity || 0);
          if (data.inStock !== false && stock >= quantity) {
            adminData = { ...data, stock };
          }
        }

        const mapRef = collection(db, 'sku_source_map');
        const possibleIds = [productId];
        if (typeof productId === 'string') {
          const numId = Number(productId);
          if (!isNaN(numId)) possibleIds.push(numId);
        } else if (typeof productId === 'number') {
          possibleIds.push(productId.toString());
        }

        const q = query(mapRef, where('skuId', 'in', possibleIds), where('status', '==', 'ACTIVE'));
        const snapshot = await getDocs(q);

        for (const d of snapshot.docs) {
          const data = d.data();
          const stock = data.availableQty !== undefined ? data.availableQty : data.stock;

          if (stock >= quantity && data.sourceId !== 'admin') {
            // Fetch real source details (location, name) from 'sources' collection
            const sourceInfo = await getSourceDetail(data.sourceId);

            const vendorLocation = sourceInfo?.location || {
              lat: data.location?.lat || data.lat || 0,
              lng: data.location?.lng || data.lng || 0,
              address: data.location?.address || data.address || 'Partner Vendor'
            };

            const dist = (vendorLocation.lat && customerLat)
              ? calculateDistance(customerLat, customerLng, vendorLocation.lat, vendorLocation.lng)
              : 999;

            possibleVendors.push({
              ...data,
              sourceName: sourceInfo?.sourceName || data.sourceName || 'Partner Vendor',
              stock,
              distance: dist,
              location: vendorLocation
            });
          }
        }
        possibleVendors.sort((a, b) => a.distance - b.distance);
      } catch (err) {
        console.error("Error analyzing item:", productId, err);
      }
      itemAnalysis.push({ item, adminData, possibleVendors, assigned: false });
    }

    const finalizedSourceIds = new Set();
    const adminEligible = itemAnalysis.filter(e => e.adminData);
    if (adminEligible.length > 0) {
      finalizedSourceIds.add(ADMIN_SOURCE_CONFIG.sourceId);
      adminEligible.forEach(entry => {
        entry.assigned = true;
        entry.assignedSourceId = ADMIN_SOURCE_CONFIG.sourceId;
      });
    }

    const slotsRemaining = 2 - finalizedSourceIds.size;
    if (slotsRemaining > 0) {
      const remainingToFill = itemAnalysis.filter(e => !e.assigned);
      if (remainingToFill.length > 0) {
        const vendorStats = {};
        remainingToFill.forEach(entry => {
          entry.possibleVendors.forEach(v => {
            if (!vendorStats[v.sourceId]) vendorStats[v.sourceId] = { count: 0, items: [], data: v };
            vendorStats[v.sourceId].count++;
            vendorStats[v.sourceId].items.push(entry);
          });
        });

        const bestVendors = Object.values(vendorStats).sort((a, b) => b.count - a.count);
        const winners = bestVendors.slice(0, slotsRemaining);
        winners.forEach(winner => {
          finalizedSourceIds.add(winner.data.sourceId);
          winner.items.forEach(entry => {
            if (!entry.assigned) {
              entry.assigned = true;
              entry.assignedSourceId = winner.data.sourceId;
              entry.assignedSourceData = winner.data;
            }
          });
        });
      }
    }

    for (const entry of itemAnalysis) {
      if (!entry.assigned) {
        plan.unfulfillable.push(entry.item);
        continue;
      }
      if (entry.assignedSourceId === ADMIN_SOURCE_CONFIG.sourceId) {
        const item = {
          ...entry.item,
          sourceId: ADMIN_SOURCE_CONFIG.sourceId,
          sourceName: ADMIN_SOURCE_CONFIG.sourceName,
          sourceType: 'DARKSTORE',
          location: ADMIN_SOURCE_CONFIG.location,
          pickupLocation: ADMIN_SOURCE_CONFIG.location // Include for compatibility
        };
        plan.items.push(item);
        plan.adminFulfilled.push(item);
      } else {
        const item = {
          ...entry.item,
          sourceId: entry.assignedSourceId,
          sourceName: entry.assignedSourceData.sourceName,
          sourceType: 'VENDOR',
          location: entry.assignedSourceData.location,
          pickupLocation: entry.assignedSourceData.location // Include for compatibility
        };
        plan.items.push(item);
        plan.vendorFulfilled.push(item);
      }
      plan.sourceIds.add(entry.assignedSourceId);
    }

    plan.sourceCount = plan.sourceIds.size;
    plan.isSplitOrder = plan.sourceCount > 1;
    plan.canFulfill = plan.unfulfillable.length === 0;
    return plan;
  }
};
