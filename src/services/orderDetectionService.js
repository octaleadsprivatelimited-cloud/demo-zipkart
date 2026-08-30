import { db } from '../config/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp
} from 'firebase/firestore';

/**
 * Order Detection Service
 * Fetches user's active and recent orders for support chatbot
 */

const COLLECTIONS = {
    ORDERS: 'orders'
};

/**
 * Get user's active orders (pending, confirmed, out_for_delivery)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of active orders
 */
export const getUserActiveOrders = async (userId) => {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const ordersRef = collection(db, COLLECTIONS.ORDERS);

        // Query for active orders (not delivered or cancelled)
        const activeStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery'];

        const q = query(
            ordersRef,
            where('userId', '==', userId),
            where('status', 'in', activeStatuses),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(q);

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            deliveryETA: doc.data().deliveryETA?.toDate()
        }));

        console.log(`✅ Found ${orders.length} active orders for user ${userId}`);
        return orders;

    } catch (error) {
        console.error('❌ Error fetching active orders:', error);
        return [];
    }
};

/**
 * Get user's recent orders (last 7 days, all statuses)
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Array>} Array of recent orders
 */
export const getUserRecentOrders = async (userId, days = 7) => {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const ordersRef = collection(db, COLLECTIONS.ORDERS);

        // Calculate date threshold
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const timestampThreshold = Timestamp.fromDate(dateThreshold);

        const q = query(
            ordersRef,
            where('userId', '==', userId),
            where('createdAt', '>=', timestampThreshold),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            deliveryETA: doc.data().deliveryETA?.toDate()
        }));

        console.log(`✅ Found ${orders.length} recent orders for user ${userId}`);
        return orders;

    } catch (error) {
        console.error('❌ Error fetching recent orders:', error);
        return [];
    }
};

/**
 * Get combined active and recent orders for chatbot
 * Prioritizes active orders, then recent delivered orders
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of orders sorted by relevance
 */
export const getChatbotOrders = async (userId) => {
    try {
        // Fetch both active and recent orders from Firestore
        let activeOrders = [], recentOrders = [];

        if (userId) {
            try {
                [activeOrders, recentOrders] = await Promise.all([
                    getUserActiveOrders(userId),
                    getUserRecentOrders(userId, 30) // Increased to 30 days
                ]);
            } catch (err) {
                console.warn('Firestore order fetch failed, falling back to local storage', err);
            }
        }

        // Get Local Storage orders as fallback/supplement
        let localOrders = [];
        try {
            const storedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            localOrders = storedOrders.map(order => {
                // Fix dates from JSON string to Date object
                let createdAt = new Date();
                if (order.createdAt?.seconds) {
                    createdAt = new Date(order.createdAt.seconds * 1000);
                } else if (order.createdAt) {
                    createdAt = new Date(order.createdAt);
                } else if (order.timestamp) {
                    createdAt = new Date(order.timestamp);
                }

                return {
                    id: order.orderId || order.id || `local_${Date.now()}`,
                    ...order,
                    createdAt
                };
            });
        } catch (e) {
            console.error('Error parsing local storage orders:', e);
        }

        // Combine and deduplicate
        const orderMap = new Map();

        // 1. Add active Firestore orders (Highest Priority)
        activeOrders.forEach(order => {
            orderMap.set(order.id, { ...order, priority: 1 });
        });

        // 2. Add local orders (Medium Priority - often contains the most recent user action)
        localOrders.forEach(order => {
            // Only add if not already present from Firestore active list
            if (!orderMap.has(order.orderId) && !orderMap.has(order.id)) {
                // Use a standard ID format
                const id = order.orderId ? order.orderId.toString() : order.id;
                orderMap.set(id, { ...order, id, priority: 2 });
            }
        });

        // 3. Add recent Firestore orders (Lower Priority)
        recentOrders.forEach(order => {
            if (!orderMap.has(order.id)) {
                orderMap.set(order.id, { ...order, priority: 3 });
            }
        });

        // Convert to array and sort by priority, then date
        const combinedOrders = Array.from(orderMap.values())
            .sort((a, b) => {
                // Sort by date descending (newest first)
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .slice(0, 5); // Limit to 5 most relevant orders

        console.log(`✅ Returning ${combinedOrders.length} orders for chatbot`);
        return combinedOrders;

    } catch (error) {
        console.error('❌ Error fetching chatbot orders:', error);
        return [];
    }
};

/**
 * Check if order is eligible for support actions
 * @param {Object} order - Order object
 * @returns {Object} Eligibility flags for different actions
 */
export const getOrderEligibility = (order) => {
    if (!order) {
        return {
            canCancel: false,
            canRefund: false,
            canReturn: false,
            canTrack: false,
            canReattempt: false
        };
    }

    const now = new Date();
    const orderAge = (now - order.createdAt) / (1000 * 60 * 60); // hours
    const status = order.status?.toLowerCase();

    return {
        // Can cancel if pending or confirmed
        canCancel: ['pending', 'confirmed'].includes(status),

        // Can refund if delivered within 24 hours or payment failed
        canRefund: (status === 'delivered' && orderAge <= 24) || status === 'payment_failed',

        // Can return if delivered within 48 hours
        canReturn: status === 'delivered' && orderAge <= 48,

        // Can track if active
        canTrack: ['confirmed', 'processing', 'out_for_delivery'].includes(status),

        // Can reattempt delivery if failed
        canReattempt: status === 'delivery_failed' && orderAge <= 24
    };
};

/**
 * Format order for chatbot display
 * @param {Object} order - Order object
 * @returns {Object} Formatted order data
 */
export const formatOrderForChatbot = (order) => {
    if (!order) return null;

    const now = new Date();
    const orderAge = Math.floor((now - order.createdAt) / (1000 * 60)); // minutes

    let timeAgo = '';
    if (orderAge < 60) {
        timeAgo = `${orderAge} min${orderAge !== 1 ? 's' : ''} ago`;
    } else if (orderAge < 1440) {
        const hours = Math.floor(orderAge / 60);
        timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(orderAge / 1440);
        timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    const statusLabels = {
        'pending': 'Order Placed',
        'confirmed': 'Confirmed',
        'processing': 'Preparing',
        'out_for_delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
        'delivery_failed': 'Delivery Failed',
        'payment_failed': 'Payment Failed'
    };

    return {
        id: order.id,
        displayId: order.id.substring(0, 8).toUpperCase(),
        itemCount: order.items?.length || 0,
        total: order.total || 0,
        status: order.status,
        statusLabel: statusLabels[order.status] || order.status,
        timeAgo,
        deliveryETA: order.deliveryETA,
        eligibility: getOrderEligibility(order)
    };
};
