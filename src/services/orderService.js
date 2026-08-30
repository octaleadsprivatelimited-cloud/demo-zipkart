import { db, auth } from '../config/firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

/**
 * Order Service - Production Level
 * Handles order creation with fulfillmentOrders subcollection and deliveryTasks
 * 
 * Structure:
 * - orders/{orderId} → main order document
 * - orders/{orderId}/fulfillmentOrders/{foId} → subcollection for admin/vendor fulfillment
 * - deliveryTasks/{taskId} → top-level collection for rider assignment
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique order ID (Format: ZC-YYMMDD-ALPHANUM)
 */
export const generateOrderId = () => {
    const date = new Date();
    const dateStr = date.getFullYear().toString().slice(-2) +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
    const randomStr = Array(5).fill(0).map(() =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    return `ZC-${dateStr}-${randomStr}`;
};

/**
 * Generate fulfillment order ID
 */
export const generateFulfillmentOrderId = (type = 'admin') => {
    const randomStr = Array(4).fill(0).map(() =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    return `FO_${type}_${randomStr}`;
};

/**
 * Generate delivery task ID
 */
export const generateDeliveryTaskId = () => {
    const randomStr = Array(6).fill(0).map(() =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    return `DT_${randomStr}`;
};

// ==================== ORDER CREATION ====================

/**
 * Create a new order with production-level structure
 * @param {Object} orderData - Complete order data
 * @returns {Promise<Object>} Result with success status and order details
 */
export const createOrder = async (orderData) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to create an order');
        }

        const orderId = orderData.orderId || generateOrderId();
        const orderRef = doc(db, 'orders', orderId);

        // Build production-level order document
        const orderDocument = {
            orderId,
            userId: user.uid,

            // Root level total for backward compatibility
            total: orderData.total || orderData.pricing?.total || 0,

            // Timestamp for admin compatibility (milliseconds)
            timestamp: Date.now(),

            // Pricing structure
            pricing: {
                subtotal: orderData.billing?.cartTotal || orderData.pricing?.subtotal || 0,
                tax: orderData.pricing?.tax || 0,
                deliveryFee: orderData.billing?.deliveryFee || orderData.pricing?.deliveryFee || 0,
                platformFee: orderData.billing?.platformFee || orderData.pricing?.platformFee || 0,
                discount: orderData.billing?.discount || orderData.pricing?.discount || 0,
                total: orderData.total || orderData.pricing?.total || 0,
                currency: 'INR'
            },

            // Billing structure for backward compatibility
            billing: {
                cartTotal: orderData.billing?.cartTotal || orderData.pricing?.subtotal || 0,
                subtotal: orderData.billing?.cartTotal || orderData.pricing?.subtotal || 0,
                deliveryFee: orderData.billing?.deliveryFee || orderData.pricing?.deliveryFee || 0,
                platformFee: orderData.billing?.platformFee || orderData.pricing?.platformFee || 0,
                tax: orderData.pricing?.tax || 0,
                discount: orderData.billing?.discount || orderData.pricing?.discount || 0,
                total: orderData.total || orderData.pricing?.total || 0
            },

            // Payment structure
            payment: {
                method: orderData.paymentMethod?.id || orderData.payment?.method || 'upi',
                provider: orderData.payment?.provider || null,
                status: orderData.payment?.status || 'pending',
                transactionId: orderData.payment?.transactionId || null,
                paidAt: orderData.payment?.paidAt || null
            },

            // Legacy paymentMethod field for backward compatibility (string)
            paymentMethod: orderData.paymentMethod?.id || orderData.payment?.method || 'upi',

            // Shipping address structure
            shippingAddress: {
                name: orderData.address?.contactName || user.displayName || 'Zipcart User',
                phone: orderData.address?.contactPhone || user.phoneNumber || '',
                addressLine1: orderData.address?.flatNo || orderData.address?.address || '',
                addressLine2: orderData.address?.area || orderData.address?.landmark || '',
                city: orderData.address?.city || '',
                state: orderData.address?.state || 'Telangana',
                pincode: orderData.address?.pincode || '',
                lat: orderData.address?.lat || null,
                lng: orderData.address?.lng || null
            },

            // Delivery address for backward compatibility (duplicate of shippingAddress with legacy field names)
            deliveryAddress: {
                name: orderData.address?.contactName || user.displayName || 'Zipcart User',
                phone: orderData.address?.contactPhone || user.phoneNumber || '',
                flatNo: orderData.address?.flatNo || orderData.address?.address || '',
                area: orderData.address?.area || '',
                landmark: orderData.address?.landmark || '',
                city: orderData.address?.city || '',
                state: orderData.address?.state || 'Telangana',
                pincode: orderData.address?.pincode || '',
                lat: orderData.address?.lat || null,
                lng: orderData.address?.lng || null,
                type: orderData.address?.type || 'Home',
                contactName: orderData.address?.contactName || user.displayName || 'Zipcart User',
                contactPhone: orderData.address?.contactPhone || user.phoneNumber || ''
            },

            // Legacy address field for backward compatibility
            address: orderData.address || {},

            // Order status
            status: orderData.status || 'placed',
            statusHistory: [
                {
                    status: 'placed',
                    note: 'Order placed by user',
                    timestamp: Timestamp.now()
                }
            ],

            // Meta information
            meta: {
                schemaVersion: 2,
                appVersion: '1.0.0',
                source: 'web'
            },

            // Items (for backward compatibility and quick access)
            items: orderData.items || [],
            itemCount: orderData.items?.length || 0,

            // Membership flag
            hasMembership: orderData.hasMembership || false,

            // Delivery partner assignment (null = unassigned, available for pickup)
            deliveryPartnerId: null,
            deliveryPartnerName: null,
            deliveryPartnerPhone: null,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(orderRef, orderDocument);

        // Create fulfillment order(s) in subcollection
        // For user-web, we create a single admin fulfillment order by default
        const fulfillmentOrderId = generateFulfillmentOrderId('admin');
        await createFulfillmentOrder(orderId, {
            fulfillmentOrderId,
            orderId,
            fulfillmentType: 'admin',
            ownerId: 'admin',
            items: orderData.items || [],
            pricing: {
                subtotal: orderData.billing?.cartTotal || orderData.pricing?.subtotal || 0,
                tax: orderData.pricing?.tax || 0,
                discount: orderData.billing?.discount || orderData.pricing?.discount || 0,
                total: orderData.total || orderData.pricing?.total || 0
            },
            pickupLocation: {
                locationId: 'loc_admin_default',
                name: 'Zipcart Warehouse',
                lat: null,
                lng: null
            },
            status: 'pending'
        });

        return {
            success: true,
            orderId,
            fulfillmentOrderId,
            order: orderDocument
        };
    } catch (error) {
        // Error creating order
        return {
            success: false,
            error: error.message
        };
    }
};

// ==================== FULFILLMENT ORDERS ====================

/**
 * Create a fulfillment order in subcollection
 * @param {string} orderId - Parent order ID
 * @param {Object} fulfillmentData - Fulfillment order data
 * @returns {Promise<Object>} Result with success status
 */
export const createFulfillmentOrder = async (orderId, fulfillmentData) => {
    try {
        const foId = fulfillmentData.fulfillmentOrderId || generateFulfillmentOrderId(fulfillmentData.fulfillmentType);
        const fulfillmentRef = doc(db, 'orders', orderId, 'fulfillmentOrders', foId);

        const fulfillmentDocument = {
            fulfillmentOrderId: foId,
            orderId,

            fulfillmentType: fulfillmentData.fulfillmentType || 'admin',
            ownerId: fulfillmentData.ownerId || 'admin',

            items: (fulfillmentData.items || []).map(item => ({
                productId: item.productId || item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit || '1 pc',
                price: item.price,
                originalPrice: item.originalPrice || item.price,
                discount: item.discount || 0,
                subtotal: item.price * item.quantity
            })),

            pricing: {
                subtotal: fulfillmentData.pricing?.subtotal || 0,
                tax: fulfillmentData.pricing?.tax || 0,
                discount: fulfillmentData.pricing?.discount || 0,
                total: fulfillmentData.pricing?.total || 0
            },

            pickupLocation: {
                locationId: fulfillmentData.pickupLocation?.locationId || 'loc_default',
                name: fulfillmentData.pickupLocation?.name || 'Default Location',
                lat: fulfillmentData.pickupLocation?.lat || null,
                lng: fulfillmentData.pickupLocation?.lng || null
            },

            status: fulfillmentData.status || 'pending',
            statusHistory: [
                {
                    status: 'pending',
                    timestamp: Timestamp.now()
                }
            ],

            preparation: {
                estimatedReadyAt: null,
                packedAt: null
            },

            cancellation: {
                cancelledBy: null,
                reason: null,
                cancelledAt: null
            },

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(fulfillmentRef, fulfillmentDocument);

        return {
            success: true,
            fulfillmentOrderId: foId,
            fulfillmentOrder: fulfillmentDocument
        };
    } catch (error) {
        // Error creating fulfillment order
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get fulfillment orders for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Array of fulfillment orders
 */
export const getFulfillmentOrders = async (orderId) => {
    try {
        const fulfillmentRef = collection(db, 'orders', orderId, 'fulfillmentOrders');
        const snapshot = await getDocs(fulfillmentRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch {
        // Error fetching fulfillment orders
        return [];
    }
};

// ==================== DELIVERY TASKS ====================

/**
 * Create a delivery task (typically called by admin/system)
 * @param {Object} taskData - Delivery task data
 * @returns {Promise<Object>} Result with success status
 */
export const createDeliveryTask = async (taskData) => {
    try {
        const taskId = taskData.taskId || generateDeliveryTaskId();
        const taskRef = doc(db, 'deliveryTasks', taskId);

        const taskDocument = {
            taskId,

            orderId: taskData.orderId,
            fulfillmentOrderId: taskData.fulfillmentOrderId,

            riderId: taskData.riderId || null,

            pickup: {
                locationId: taskData.pickup?.locationId || null,
                lat: taskData.pickup?.lat || null,
                lng: taskData.pickup?.lng || null
            },

            drop: {
                lat: taskData.drop?.lat || null,
                lng: taskData.drop?.lng || null
            },

            route: {
                distanceKm: taskData.route?.distanceKm || null,
                estimatedTimeMin: taskData.route?.estimatedTimeMin || null
            },

            status: taskData.status || 'unassigned',

            proof: {
                pickupImage: null,
                deliveryImage: null
            },

            timestamps: {
                assignedAt: null,
                pickedAt: null,
                deliveredAt: null
            },

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(taskRef, taskDocument);

        return {
            success: true,
            taskId,
            task: taskDocument
        };
    } catch (error) {
        // Error creating delivery task
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get delivery tasks for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Array of delivery tasks
 */
export const getDeliveryTasksByOrder = async (orderId) => {
    try {
        const tasksRef = collection(db, 'deliveryTasks');
        const q = query(tasksRef, where('orderId', '==', orderId));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch {
        // Error fetching delivery tasks
        return [];
    }
};

/**
 * Subscribe to real-time order updates including delivery tasks
 * Use this for order tracking page to get live updates when delivery partner is assigned
 * @param {string} orderId - Order ID to subscribe to
 * @param {Function} callback - Callback function that receives updated order data
 * @returns {Function} Unsubscribe function to cancel the subscription
 */
export const subscribeToOrder = (orderId, callback) => {
    // Reference to the order document
    const orderRef = doc(db, 'orders', orderId.toString());

    // Reference to root-level sub_orders for this main order
    const subOrdersRef = collection(db, 'sub_orders');
    const subOrdersQuery = query(subOrdersRef, where('mainOrderId', '==', orderId.toString()));

    // Reference to delivery tasks for this order
    const tasksRef = collection(db, 'deliveryTasks');
    const tasksQuery = query(tasksRef, where('orderId', '==', orderId.toString()));

    let currentOrderData = null;
    let currentDeliveryTasks = [];
    let currentSubOrders = [];

    // Helper to merge and call callback
    const updateCallback = () => {
        if (currentOrderData) {
            const mergedOrder = {
                ...currentOrderData,
                deliveryTasks: currentDeliveryTasks,
                subOrders: currentSubOrders
            };

            // Extract delivery partner info from the first active task
            const activeTask = currentDeliveryTasks.find(t =>
                t.riderId && ['assigned', 'picked_up', 'in_transit', 'at_location'].includes(t.status)
            ) || currentDeliveryTasks.find(t => t.riderId);

            // Check for delivery partner info from deliveryTasks OR directly from order document
            if (activeTask) {
                mergedOrder.deliveryPartner = {
                    riderId: activeTask.riderId,
                    name: activeTask.riderName || 'Delivery Partner',
                    phone: activeTask.riderPhone || null,
                    photo: activeTask.riderPhoto || null,
                    vehicleNumber: activeTask.vehicleNumber || null,
                    status: activeTask.status,
                    pickup: activeTask.pickup || null
                };
            } else if (currentOrderData.deliveryPartnerName || currentOrderData.deliveryPartnerId) {
                // Fallback: Read partner info directly from order document
                // This is set by the delivery partner app when accepting orders
                mergedOrder.deliveryPartner = {
                    riderId: currentOrderData.deliveryPartnerId || null,
                    name: currentOrderData.deliveryPartnerName || 'Delivery Partner',
                    phone: currentOrderData.deliveryPartnerPhone || null,
                    photo: null,
                    vehicleNumber: null,
                    status: currentOrderData.status
                };
            }

            callback(mergedOrder);
        }
    };

    // Subscribe to order document
    const unsubscribeOrder = onSnapshot(orderRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            currentOrderData = {
                id: docSnapshot.id,
                ...docSnapshot.data()
            };
            updateCallback();
        } else {
            // Order not found
            callback(null);
        }
    }, (error) => {
        console.error('Order subscription error:', error);
    });

    // Subscribe to delivery tasks
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        currentDeliveryTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        updateCallback();
    }, (error) => {
        console.error('Tasks subscription error:', error);
    });

    // Subscribe to sub_orders
    const unsubscribeSubOrders = onSnapshot(subOrdersQuery, (snapshot) => {
        currentSubOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        updateCallback();
    }, (error) => {
        console.error('Sub-orders subscription error:', error);
    });

    // Return combined unsubscribe function
    return () => {
        unsubscribeOrder();
        unsubscribeTasks();
        unsubscribeSubOrders();
    };
};

// ==================== ORDER STATUS MANAGEMENT ====================

/**
 * Update order status with history tracking
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {string} note - Optional status note
 * @returns {Promise<boolean>} Success status
 */
export const updateOrderStatus = async (orderId, status, note = '') => {
    try {
        const orderRef = doc(db, 'orders', orderId.toString());
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
            throw new Error('Order not found');
        }

        const currentData = orderDoc.data();
        const statusHistory = currentData.statusHistory || [];

        // Add new status to history
        statusHistory.push({
            status,
            note: note || `Status changed to ${status}`,
            timestamp: Timestamp.now()
        });

        await updateDoc(orderRef, {
            status,
            statusHistory,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch {
        // Error updating order status
        return false;
    }
};

/**
 * Update payment status after payment completion
 * @param {string} orderId - Order ID
 * @param {string} paymentStatus - Payment status (paid, failed, refunded)
 * @param {Object} paymentData - Additional payment data
 * @returns {Promise<boolean>} Success status
 */
export const updatePaymentStatus = async (orderId, paymentStatus, paymentData = {}) => {
    try {
        const orderRef = doc(db, 'orders', orderId.toString());
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
            throw new Error('Order not found');
        }

        const updateData = {
            'payment.status': paymentStatus,
            updatedAt: serverTimestamp()
        };

        if (paymentStatus === 'paid') {
            updateData['payment.paidAt'] = Timestamp.now();
            updateData.status = 'confirmed';
        }

        if (paymentData.transactionId) {
            updateData['payment.transactionId'] = paymentData.transactionId;
        }

        if (paymentData.provider) {
            updateData['payment.provider'] = paymentData.provider;
        }

        // Add to status history if status changed
        if (paymentStatus === 'paid') {
            const currentData = orderDoc.data();
            const statusHistory = currentData.statusHistory || [];
            statusHistory.push({
                status: 'confirmed',
                note: 'Payment successful',
                timestamp: Timestamp.now()
            });
            updateData.statusHistory = statusHistory;
        }

        // Handle membership activation
        if (paymentStatus === 'paid' && orderDoc.data().hasMembership) {
            updateData.membershipActivated = true;
        }

        await updateDoc(orderRef, updateData);

        return true;
    } catch {
        // Error updating payment status
        return false;
    }
};

/**
 * Update fulfillment order status
 * @param {string} orderId - Order ID
 * @param {string} fulfillmentOrderId - Fulfillment order ID
 * @param {string} status - New status
 * @returns {Promise<boolean>} Success status
 */
export const updateFulfillmentStatus = async (orderId, fulfillmentOrderId, status) => {
    try {
        const fulfillmentRef = doc(db, 'orders', orderId, 'fulfillmentOrders', fulfillmentOrderId);
        const fulfillmentDoc = await getDoc(fulfillmentRef);

        if (!fulfillmentDoc.exists()) {
            throw new Error('Fulfillment order not found');
        }

        const currentData = fulfillmentDoc.data();
        const statusHistory = currentData.statusHistory || [];

        statusHistory.push({
            status,
            timestamp: Timestamp.now()
        });

        await updateDoc(fulfillmentRef, {
            status,
            statusHistory,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch {
        // Error updating fulfillment status
        return false;
    }
};

// ==================== ORDER RETRIEVAL ====================

/**
 * Get order by ID with fulfillment orders
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Order data with fulfillment orders or null
 */
export const getOrderById = async (orderId) => {
    try {
        const orderRef = doc(db, 'orders', orderId.toString());
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
            return null;
        }

        const orderData = {
            id: orderDoc.id,
            ...orderDoc.data()
        };

        // Fetch fulfillment orders (sub-collection)
        orderData.fulfillmentOrders = await getFulfillmentOrders(orderId);

        // Fetch sub_orders (root collection - WebOrderService style)
        try {
            const subOrdersRef = collection(db, 'sub_orders');
            const q = query(subOrdersRef, where('mainOrderId', '==', orderId.toString()));
            const subSnapshot = await getDocs(q);
            orderData.subOrders = subSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (e) {
            console.error('Error fetching sub_orders:', e);
            orderData.subOrders = [];
        }

        // Fetch delivery tasks
        orderData.deliveryTasks = await getDeliveryTasksByOrder(orderId);

        return orderData;
    } catch (error) {
        console.error('Error in getOrderById:', error);
        return null;
    }
};

/**
 * Get all orders for current user
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<Array>} Array of orders
 */
export const getUserOrders = async (userId = null) => {
    try {
        const user = auth.currentUser;
        const targetUserId = userId || user?.uid;

        if (!targetUserId) {
            throw new Error('User ID required');
        }

        const ordersRef = collection(db, 'orders');
        // TEMPORARY: Removed orderBy to work without index
        // TODO: Re-add orderBy('createdAt', 'desc') after creating Firestore index
        const q = query(
            ordersRef,
            where('userId', '==', targetUserId)
            // orderBy('createdAt', 'desc') // Commented out until index is created
        );

        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return orders;
    } catch {
        // Error fetching user orders
        return [];
    }
};

/**
 * Get recent orders (last 10)
 * @returns {Promise<Array>} Array of recent orders
 */
export const getRecentOrders = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.slice(0, 10).map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch {
        // Error fetching recent orders
        return [];
    }
};

// ==================== BACKWARD COMPATIBILITY ====================

/**
 * Update delivery status (backward compatible)
 * @param {string} orderId - Order ID
 * @param {string} deliveryStatus - New delivery status
 * @returns {Promise<boolean>} Success status
 */
export const updateDeliveryStatus = async (orderId, deliveryStatus) => {
    try {
        const orderRef = doc(db, 'orders', orderId.toString());
        await updateDoc(orderRef, {
            deliveryStatus,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch {
        // Error updating delivery status
        return false;
    }
};
