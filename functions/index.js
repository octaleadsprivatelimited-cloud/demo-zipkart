const functions = require("firebase-functions");
const admin = require("firebase-admin");
const path = require("path");

// Load environment variables from functions/.env file
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const cors = require("cors")({ origin: true });
const axios = require("axios");

admin.initializeApp();

// Cashfree Configuration - Production Mode
const CASHFREE_API_VERSION = "2023-08-01";
// Use production URL if production keys are provided, otherwise use sandbox
const CASHFREE_URL = process.env.CASHFREE_SECRET_KEY?.includes('_prod_')
    ? "https://api.cashfree.com/pg/orders" // Production URL
    : "https://sandbox.cashfree.com/pg/orders"; // Sandbox URL

// HTTPS Function to create Cashfree Order
exports.createOrder = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method Not Allowed" });
            }

            const { orderId, orderAmount, customerPhone, customerName } = req.body;

            if (!orderId || !orderAmount) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            const appId = process.env.CASHFREE_APP_ID;
            const secretKey = process.env.CASHFREE_SECRET_KEY;

            if (!appId || !secretKey) {
                console.error("Cashfree keys are missing in environment variables.");
                return res.status(500).json({ error: "Server configuration error" });
            }

            console.log("Creating Cashfree order:", orderId, "Amount:", orderAmount);

            const payload = {
                order_id: orderId.toString(),
                order_amount: parseFloat(orderAmount),
                order_currency: "INR",
                customer_details: {
                    customer_id: "cust_" + orderId,
                    customer_phone: customerPhone || "9999999999",
                    customer_name: customerName || "Zipcart User"
                },
                order_meta: {
                    return_url: `${req.headers.origin || 'http://localhost:5173'}/order-tracking/${orderId}?status={order_status}`
                }
            };

            const response = await axios.post(CASHFREE_URL, payload, {
                headers: {
                    "x-client-id": appId,
                    "x-client-secret": secretKey,
                    "x-api-version": CASHFREE_API_VERSION,
                    "Content-Type": "application/json"
                }
            });

            return res.status(200).json({
                payment_session_id: response.data.payment_session_id,
                order_id: response.data.order_id
            });

        } catch (error) {
            console.error("Error creating Cashfree order:", error.response?.data || error.message);
            return res.status(500).json({
                error: "Failed to create order",
                details: error.response?.data || error.message
            });
        }
    });
});

// HTTPS Function to verify payment status
exports.verifyPayment = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method Not Allowed" });
            }

            const { orderId } = req.body;

            if (!orderId) {
                return res.status(400).json({ error: "Order ID is required" });
            }
            const appId = process.env.CASHFREE_APP_ID;
            const secretKey = process.env.CASHFREE_SECRET_KEY;

            console.log("Verifying payment for order:", orderId);

            // Get order status from Cashfree
            const response = await axios.get(`${CASHFREE_URL}/${orderId}`, {
                headers: {
                    "x-client-id": appId,
                    "x-client-secret": secretKey,
                    "x-api-version": CASHFREE_API_VERSION
                }
            });

            const orderData = response.data;
            const paymentStatus = orderData.order_status;

            console.log("Cashfree order status:", paymentStatus);

            // Update Firestore order based on payment status
            if (paymentStatus === "PAID") {
                await admin.firestore().collection("orders").doc(orderId.toString()).update({
                    status: "confirmed",
                    isPaid: true,
                    "payment.status": "completed",
                    "payment.completedAt": admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else if (paymentStatus === "EXPIRED" || paymentStatus === "CANCELLED") {
                await admin.firestore().collection("orders").doc(orderId.toString()).update({
                    status: "failed",
                    "payment.status": "failed",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return res.status(200).json({
                success: true,
                orderId: orderId,
                status: paymentStatus,
                orderDetails: orderData
            });

        } catch (error) {
            console.error("Error verifying payment:", error.response?.data || error.message);
            return res.status(500).json({
                error: "Failed to verify payment",
                details: error.response?.data || error.message
            });
        }
    });
});

// Cashfree Webhook Handler - receives payment status updates from Cashfree
exports.cashfreeWebhook = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method Not Allowed" });
            }

            const webhookData = req.body;
            console.log("Received Cashfree webhook:", JSON.stringify(webhookData));

            const { data } = webhookData;

            if (!data || !data.order || !data.order.order_id) {
                console.error("Invalid webhook data");
                return res.status(400).json({ error: "Invalid webhook data" });
            }

            const orderId = data.order.order_id;
            const paymentStatus = data.payment?.payment_status || data.order.order_status;

            console.log(`Webhook: Order ${orderId} status: ${paymentStatus}`);

            // Update order in Firestore
            const orderRef = admin.firestore().collection("orders").doc(orderId.toString());
            const orderDoc = await orderRef.get();

            if (!orderDoc.exists) {
                console.error("Order not found:", orderId);
                return res.status(404).json({ error: "Order not found" });
            }

            if (paymentStatus === "SUCCESS" || paymentStatus === "PAID") {
                await orderRef.update({
                    status: "confirmed",
                    isPaid: true,
                    "payment.status": "completed",
                    "payment.transactionId": data.payment?.cf_payment_id || null,
                    "payment.completedAt": admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Check if order has membership and activate it
                const order = orderDoc.data();
                if (order.hasMembership && order.userId) {
                    await admin.firestore().collection("users").doc(order.userId).update({
                        "membership.isActive": true,
                        "membership.activatedAt": admin.firestore.FieldValue.serverTimestamp(),
                        "membership.expiresAt": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    });
                    console.log("Membership activated for user:", order.userId);
                }

                console.log("Order marked as paid:", orderId);
            } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
                await orderRef.update({
                    status: "failed",
                    "payment.status": "failed",
                    "payment.failureReason": data.payment?.payment_message || "Payment failed",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log("Order marked as failed:", orderId);
            }

            return res.status(200).json({ success: true, message: "Webhook processed" });

        } catch (error) {
            console.error("Webhook processing error:", error);
            return res.status(500).json({ error: "Webhook processing failed" });
        }
    });
});

/**
 * Triggered when a new order is created in Firestore.
 * Notifies Admin and the assigned Vendor.
 */
exports.onOrderCreated = functions.firestore
    .document("orders/{orderId}")
    .onCreate(async (snapshot, context) => {
        const orderData = snapshot.data();
        const { orderId, total, vendorId } = orderData;

        console.log(`New Order Created: ${orderId} for Vendor: ${vendorId}`);

        // 1. Notify Admins
        const adminTokens = await getTokensByRole("admin");
        if (adminTokens.length > 0) {
            await sendPushNotification(adminTokens, {
                title: "New Zipcart Order! 🛍️",
                body: `Order #${orderId} for ₹${total} has been placed.`,
                orderId: orderId
            });
        }

        // 2. Notify Vendor
        if (vendorId) {
            const vendorTokens = await getUserTokens(vendorId);
            if (vendorTokens.length > 0) {
                await sendPushNotification(vendorTokens, {
                    title: "You have a new order! 🍳",
                    body: `Order #${orderId} is ready for you to prepare.`,
                    orderId: orderId
                });
            }
        }

        return null;
    });

/**
 * Triggered when an order document is updated.
 * Handles status change notifications for User and Delivery Partners.
 */
exports.onOrderUpdated = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const prevData = change.before.data();
        const { orderId, userId, status, deliveryPartnerId } = newData;

        // Only act if status has changed
        if (newData.status === prevData.status) return null;

        console.log(`Order ${orderId} status changed from ${prevData.status} to ${status}`);

        // 1. Notify User of Status Updates
        const userTokens = await getUserTokens(userId);
        if (userTokens.length > 0) {
            let title = "Order Update 📦";
            let body = `Your order #${orderId} is now ${status}.`;

            if (status === "accepted") {
                title = "Order Accepted! ✅";
                body = "Your order is being prepared by the vendor.";
            } else if (status === "out_for_delivery") {
                title = "Out for Delivery! 🛵";
                body = "Your delivery partner is on the way.";
            } else if (status === "completed") {
                title = "Order Delivered! 🎉";
                body = "Hope you enjoy your purchase!";
            }

            await sendPushNotification(userTokens, { title, body, orderId });
        }

        // 2. Notify Delivery Partner when order is ready for pickup
        if (status === "accepted" && !deliveryPartnerId) {
            const partnerTokens = await getTokensByRole("delivery_partner");
            if (partnerTokens.length > 0) {
                await sendPushNotification(partnerTokens, {
                    title: "New Delivery Assignment! 🛵",
                    body: `A new order #${orderId} is ready for pickup.`,
                    orderId: orderId
                });
            }
        }

        return null;
    });

/**
 * Helper to fetch FCM tokens for a specific user ID
 */
async function getUserTokens(userId) {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const data = userDoc.data();
    return data && data.fcmTokens ? data.fcmTokens : [];
}

/**
 * Helper to fetch FCM tokens for all users with a specific role
 */
async function getTokensByRole(role) {
    const snapshot = await admin.firestore()
        .collection("users")
        .where("role", "==", role)
        .get();

    let tokens = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens) {
            tokens = tokens.concat(data.fcmTokens);
        }
    });
    return tokens;
}

/**
 * Helper to send FCM notifications
 */
async function sendPushNotification(tokens, notification) {
    const message = {
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: {
            orderId: notification.orderId,
            click_action: "FLUTTER_NOTIFICATION_CLICK" // Common for mobile apps
        },
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`${response.successCount} messages were sent successfully`);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

/**
 * Triggered when a SUB-ORDER is created.
 * Responsible for decrementing stock in 'skus' (for Admin) or 'sku_source_map' (for Vendors).
 */
exports.updateStockOnSubOrderCreate = functions.firestore
    .document("sub_orders/{subOrderId}")
    .onCreate(async (snapshot, context) => {
        const subOrder = snapshot.data();
        const { subOrderId, vendorId, items } = subOrder;

        if (!items || !Array.isArray(items) || items.length === 0) {
            console.log(`No items to process for sub-order ${subOrderId}`);
            return null;
        }

        console.log(`Processing stock update for sub-order ${subOrderId} (Vendor: ${vendorId})`);
        const db = admin.firestore();

        try {
            // Process each item sequentially to avoid race conditions on the same doc if multiple items point to it
            // (though usually items in an order are distinct)
            for (const item of items) {
                const productId = item.productId || item.id;
                const quantityToDeduct = item.quantity || 1;

                if (!productId) continue;

                await db.runTransaction(async (transaction) => {
                    if (vendorId === 'admin') {
                        // ---------------------------------------------------------
                        // CASE A: Fulfilled by Admin -> Update 'skus' collection
                        // ---------------------------------------------------------
                        const skuRef = db.collection('skus').doc(productId.toString());
                        const skuDoc = await transaction.get(skuRef);

                        if (!skuDoc.exists) {
                            console.warn(`Product ${productId} not found in 'skus' collection. Skipping stock update.`);
                            return;
                        }

                        const data = skuDoc.data();
                        const updatePayload = {};

                        // Check which field tracks stock and decrement it
                        if (typeof data.stock === 'number') {
                            const newStock = data.stock - quantityToDeduct;
                            updatePayload.stock = newStock < 0 ? 0 : newStock;
                        }
                        if (typeof data.quantity === 'number') { // Fallback/Alternative field
                            const newQty = data.quantity - quantityToDeduct;
                            updatePayload.quantity = newQty < 0 ? 0 : newQty;
                        }
                        if (typeof data.availableQty === 'number') { // Fallback/Alternative field
                            const newAvail = data.availableQty - quantityToDeduct;
                            updatePayload.availableQty = newAvail < 0 ? 0 : newAvail;
                        }

                        // Also update explicit boolean if it hits zero
                        // This logic depends on which field is primary, but updating all numeric ones is safest for consistency
                        if (Object.keys(updatePayload).length > 0) {
                            transaction.update(skuRef, updatePayload);
                            console.log(`Decremented Admin stock for ${productId} by ${quantityToDeduct}`);
                        } else {
                            console.log(`No numeric stock field found for ${productId} (Admin). Skipping.`);
                        }

                    } else {
                        // ---------------------------------------------------------
                        // CASE B: Fulfilled by Vendor -> Update 'sku_source_map'
                        // ---------------------------------------------------------
                        // 1. Find the mapping document
                        const mapRef = db.collection('sku_source_map');
                        const queryMap = mapRef
                            .where('skuId', '==', productId)
                            .where('sourceId', '==', vendorId)
                            .limit(1);

                        // Transactional query
                        const mapSnapshot = await transaction.get(queryMap);

                        if (mapSnapshot.empty) {
                            console.warn(`No source mapping found for SKU ${productId} and Vendor ${vendorId}. Skipping stock update.`);
                            return;
                        }

                        const mapDoc = mapSnapshot.docs[0];
                        const mapData = mapDoc.data();
                        const mapDocRef = mapDoc.ref;

                        const updatePayload = {};

                        // Primary field in sku_source_map is usually 'availableQty' or 'stock'
                        if (typeof mapData.availableQty === 'number') {
                            const newQty = mapData.availableQty - quantityToDeduct;
                            updatePayload.availableQty = newQty < 0 ? 0 : newQty;
                        } else if (typeof mapData.stock === 'number') {
                            const newStock = mapData.stock - quantityToDeduct;
                            updatePayload.stock = newStock < 0 ? 0 : newStock;
                        }

                        if (Object.keys(updatePayload).length > 0) {
                            transaction.update(mapDocRef, updatePayload);
                            console.log(`Decremented Vendor ${vendorId} stock for ${productId} by ${quantityToDeduct}`);
                        } else {
                            console.log(`No numeric stock field found for ${productId} (Vendor ${vendorId}). Skipping.`);
                        }
                    }
                });
            }

            console.log(`Stock update completed for sub-order ${subOrderId}`);

        } catch (error) {
            console.error(`Failed to update stock for sub-order ${subOrderId}:`, error);
        }

        return null;
    });
/**
 * Securely fetch vendor pickup location for checkout.
 * This prevents exposing sensitive vendor bank/document details via public Firestore rules.
 */
exports.getVendorLocation = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method Not Allowed" });
            }

            const { vendorId } = req.body;
            if (!vendorId) {
                return res.status(400).json({ error: "Vendor ID is required" });
            }

            console.log(`Fetching public info for vendor: ${vendorId}`);
            const db = admin.firestore();

            let vendorData = null;
            let resolvedVendorId = null; // Track the actual doc ID for logging

            // Strategy 1: Try direct document ID lookup
            const vendorDoc = await db.collection("vendors").doc(vendorId).get();
            if (vendorDoc.exists) {
                vendorData = vendorDoc.data();
                resolvedVendorId = vendorId;
            } else {
                // Strategy 2: Query by multiple possible identifier fields
                const queryFields = ['vendorCode', 'vendorId', 'sourceId'];
                for (const field of queryFields) {
                    if (vendorData) break;
                    try {
                        const querySnap = await db.collection("vendors").where(field, "==", vendorId).limit(1).get();
                        if (!querySnap.empty) {
                            vendorData = querySnap.docs[0].data();
                            resolvedVendorId = querySnap.docs[0].id;
                            console.log(`✅ Found vendor via ${field} = ${vendorId}`);
                        }
                    } catch (queryErr) {
                        console.log(`Query by ${field} failed, trying next...`);
                    }
                }

                // Strategy 3: Use sources collection as a bridge
                // sources/{VND66482745} may have a uid/ownerId linking to the Auth UID
                if (!vendorData) {
                    try {
                        const sourceDoc = await db.collection("sources").doc(vendorId).get();
                        if (sourceDoc.exists) {
                            const sourceData = sourceDoc.data();
                            // Look for any field that stores the Auth UID
                            const authUid = sourceData.uid || sourceData.ownerId || sourceData.userId || sourceData.vendorUid || sourceData.createdBy;
                            if (authUid) {
                                const vendorByUid = await db.collection("vendors").doc(authUid).get();
                                if (vendorByUid.exists) {
                                    vendorData = vendorByUid.data();
                                    resolvedVendorId = authUid;
                                    console.log(`✅ Found vendor via sources bridge: ${vendorId} → ${authUid}`);
                                }
                            }
                        }
                    } catch (bridgeErr) {
                        console.log(`Sources bridge lookup failed:`, bridgeErr.message);
                    }
                }
            }

            if (!vendorData) {
                return res.status(404).json({ error: "Vendor not found" });
            }

            // Extract ONLY safe public fields
            const vPickup = vendorData.pickupLocation || vendorData.location || vendorData.storeLocation;

            const publicInfo = {
                businessName: vendorData.businessName || vendorData.storeName || vendorData.name || vendorData.profile?.businessName || "Zipcart Vendor",
                phone: vendorData.phone || vendorData.phoneNumber || vendorData.profile?.phone || "",
                pickupLocation: vPickup ? {
                    address: vPickup.address || vendorData.address || "Vendor Location",
                    lat: vPickup.lat || vendorData.lat || null,
                    lng: vPickup.lng || vendorData.lng || null
                } : null
            };

            return res.status(200).json(publicInfo);

        } catch (error) {
            console.error("Error fetching vendor location:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
});

// ============================================================
// VENDOR PROFILE SYNC TRIGGER
// Automatically syncs pickupLocation from vendors → sources & sku_source_map
// whenever a vendor updates their profile
// ============================================================
exports.onVendorProfileUpdate = functions.firestore
    .document('vendors/{vendorId}')
    .onWrite(async (change, context) => {
        const vendorId = context.params.vendorId; // This is the Auth UID
        const after = change.after.exists ? change.after.data() : null;

        if (!after) {
            console.log(`Vendor ${vendorId} was deleted, skipping sync.`);
            return null;
        }

        const pickupLocation = after.pickupLocation;
        if (!pickupLocation || (!pickupLocation.lat && !pickupLocation.lng)) {
            console.log(`No pickupLocation for vendor ${vendorId}, skipping sync.`);
            return null;
        }

        // Check if pickupLocation actually changed
        const before = change.before.exists ? change.before.data() : {};
        const beforeLoc = before.pickupLocation || {};
        if (beforeLoc.lat === pickupLocation.lat &&
            beforeLoc.lng === pickupLocation.lng &&
            beforeLoc.address === pickupLocation.address) {
            return null; // No location change
        }

        console.log(`📍 Syncing pickupLocation for vendor ${vendorId}: ${pickupLocation.address} (${pickupLocation.lat}, ${pickupLocation.lng})`);
        const db = admin.firestore();
        const batch = db.batch();

        // Prepare the location data in multiple formats for compatibility
        const locationFields = {
            pickupLocation: {
                address: pickupLocation.address || '',
                lat: pickupLocation.lat || null,
                lng: pickupLocation.lng || null,
                city: pickupLocation.city || '',
                pincode: pickupLocation.pincode || '',
                name: pickupLocation.name || ''
            },
            // Also update these nested/flat fields used by sources collection
            'location.lat': pickupLocation.lat || null,
            'location.lng': pickupLocation.lng || null,
        };

        // Collect all source IDs to sync to
        const sourceIdsToSync = new Set([vendorId]); // Always includes Auth UID

        // Check vendor doc for vendorCode
        const vendorCode = after.vendorCode || after.vendorId || after.sourceId;
        if (vendorCode && vendorCode !== vendorId) {
            sourceIdsToSync.add(vendorCode);
        }

        // Search sku_source_map to find any sourceId linked to this vendor
        // This bridges the Auth UID → vendorCode gap
        try {
            // Try querying by Auth UID first
            let skuMaps = await db.collection('sku_source_map')
                .where('vendorUid', '==', vendorId)
                .limit(10)
                .get();

            // If nothing found, try other linking fields
            if (skuMaps.empty) {
                skuMaps = await db.collection('sku_source_map')
                    .where('ownerId', '==', vendorId)
                    .limit(10)
                    .get();
            }

            skuMaps.docs.forEach(doc => {
                const sourceId = doc.data().sourceId;
                if (sourceId) sourceIdsToSync.add(sourceId);
            });
        } catch (e) {
            console.log('Could not query sku_source_map for vendor linking:', e.message);
        }

        console.log(`📦 Syncing to source IDs: ${[...sourceIdsToSync].join(', ')}`);

        // 1. Update all matching sources documents
        for (const sourceId of sourceIdsToSync) {
            const sourceRef = db.collection('sources').doc(sourceId);
            batch.set(sourceRef, locationFields, { merge: true });
        }

        // 2. Update sku_source_map entries with location data
        for (const sourceId of sourceIdsToSync) {
            try {
                const skuMaps = await db.collection('sku_source_map')
                    .where('sourceId', '==', sourceId)
                    .limit(100)
                    .get();

                skuMaps.docs.forEach(mapDoc => {
                    batch.update(mapDoc.ref, {
                        'location.lat': pickupLocation.lat,
                        'location.lng': pickupLocation.lng,
                        'location.address': pickupLocation.address || ''
                    });
                });

                if (!skuMaps.empty) {
                    console.log(`✅ Updated ${skuMaps.size} sku_source_map entries for sourceId: ${sourceId}`);
                }
            } catch (e) {
                console.log(`Could not update sku_source_map for ${sourceId}:`, e.message);
            }
        }

        await batch.commit();
        console.log(`✅ Successfully synced pickupLocation for vendor ${vendorId} to ${sourceIdsToSync.size} sources`);
        return null;
    });

/**
 * Triggered when a SUB-ORDER status is updated.
 * Synchronizes the status back to the main order document for unified tracking.
 */
exports.syncSubOrderStatusToMainOrder = functions.firestore
    .document("sub_orders/{subOrderId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const prevData = change.before.data();
        const mainOrderId = newData.mainOrderId;

        if (!mainOrderId) return null;

        // Only act if status actually changed
        if (newData.status === prevData.status) return null;

        console.log(`Sub-order ${context.params.subOrderId} changed to ${newData.status}. Syncing to Main Order: ${mainOrderId}`);

        const db = admin.firestore();

        try {
            // 1. Get all sub-orders for this main order
            const subOrdersSnapshot = await db.collection("sub_orders")
                .where("mainOrderId", "==", mainOrderId)
                .get();

            const subOrders = subOrdersSnapshot.docs.map(doc => doc.data());
            const statuses = subOrders.map(so => so.status?.toLowerCase());

            // 2. Determine aggregate status
            // Logic:
            // - If all sub-orders are 'delivered', main order is 'delivered'
            // - If any sub-order is 'out_for_delivery', main order is 'out_for_delivery'
            // - If any sub-order is 'packed' or 'processing', main order is 'processing'
            // - Otherwise, keep current or use 'confirmed'

            let finalStatus = "confirmed";

            if (statuses.every(s => s === "delivered" || s === "completed")) {
                finalStatus = "delivered";
            } else if (statuses.some(s => ["out_for_delivery", "picked_up", "in_transit"].includes(s))) {
                finalStatus = "out_for_delivery";
            } else if (statuses.some(s => ["packed", "ready", "processing", "preparing"].includes(s))) {
                finalStatus = "processing";
            } else if (statuses.some(s => s === "cancelled")) {
                // If some are cancelled but others are moving, we might need more complex logic.
                // For now, if all are cancelled, mark main as cancelled.
                if (statuses.every(s => s === "cancelled")) {
                    finalStatus = "cancelled";
                }
            }

            console.log(`Calculated Final Aggregate Status: ${finalStatus}`);

            // 3. Update main order
            const orderRef = db.collection("orders").doc(mainOrderId.toString());
            const orderDoc = await orderRef.get();

            if (orderDoc.exists) {
                const currentData = orderDoc.data();

                // Only update if status is actually different to avoid unnecessary triggers
                if (currentData.status !== finalStatus) {
                    await orderRef.update({
                        status: finalStatus,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`✅ Main Order ${mainOrderId} updated to: ${finalStatus}`);
                }
            } else {
                console.warn(`Main order ${mainOrderId} not found for sync.`);
            }

        } catch (error) {
            console.error(`Error syncing sub-order status to main order ${mainOrderId}:`, error);
        }

        return null;
    });

// ============================================================
// OPTIMIZED MULTI-VENDOR FULFILLMENT (2-SOURCE LIMIT)
// Centralized logic for Web & Mobile to ensure Admin Profit
// ============================================================

/**
 * Helper: Calculate Distance
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Callable Function to Process Optimized Order
 * Handles: Fulfillment Planning (2-Source Limit), Main Order, and Sub-Order creation.
 */
exports.processOptimizedOrder = functions.https.onCall(async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = context.auth.uid;
    const { orderData } = data; // Contains items, shippingAddress, amounts, etc.

    if (!orderData || !orderData.items || orderData.items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing order items.');
    }

    const db = admin.firestore();
    const customerLat = orderData.shippingAddress?.lat || orderData.deliveryAddress?.lat;
    const customerLng = orderData.shippingAddress?.lng || orderData.deliveryAddress?.lng;

    try {
        console.log(`🚀 [FULFILLMENT] Starting optimized checkout for user: ${userId}`);

        // A. Load Admin Config
        const adminDoc = await db.collection('sources').doc('admin').get();
        const adminConfig = {
            sourceId: 'admin',
            sourceName: 'Zipcart Dark Store',
            location: {
                lat: adminDoc.data()?.location?.lat || 17.4575,
                lng: adminDoc.data()?.location?.lng || 78.3707,
                address: adminDoc.data()?.location?.address || 'Vendor Warehouse'
            }
        };

        // Helper to get source info (location/name)
        const getSourceInfo = async (sourceId) => {
            if (sourceId === 'admin') return adminConfig;
            const sDoc = await db.collection('sources').doc(sourceId).get();
            if (sDoc.exists) {
                const sData = sDoc.data();
                return {
                    sourceId,
                    sourceName: sData.sourceName || sData.name || 'Partner Vendor',
                    location: {
                        lat: sData.location?.lat || sData.lat || 0,
                        lng: sData.location?.lng || sData.lng || 0,
                        address: sData.location?.address || sData.address || ''
                    }
                };
            }
            return null;
        };

        // B. PHASE 1: Scan availability for ALL items
        const itemAnalysis = [];
        for (const item of orderData.items) {
            const productId = item.productId || item.id;
            const quantity = item.quantity || 1;

            if (!productId) {
                console.warn("⚠️ [CLOUD FUNCTION] Missing productId for item:", item.name);
                itemAnalysis.push({ item, adminStockData: null, possibleVendors: [], assigned: false });
                continue;
            }

            let adminStockData = null;
            const possibleVendors = [];

            // Check Admin
            const adminSnap = await db.collection('skus').doc(productId.toString()).get();
            if (adminSnap.exists) {
                const sData = adminSnap.data();
                const stock = Number(sData.stock || sData.availableQty || sData.quantity || 0);
                if (sData.inStock !== false && stock >= quantity) {
                    adminStockData = { ...sData, id: adminSnap.id, stock };
                }
            }

            // Check Vendors
            const possibleIds = [productId];
            if (typeof productId === 'string') {
                const numId = Number(productId);
                if (!isNaN(numId)) possibleIds.push(numId);
            } else if (typeof productId === 'number') {
                possibleIds.push(productId.toString());
            }

            const mapSnap = await db.collection('sku_source_map')
                .where('skuId', 'in', possibleIds)
                .where('status', '==', 'ACTIVE')
                .get();

            for (const docSnap of mapSnap.docs) {
                const vData = docSnap.data();
                const vStock = Number(vData.availableQty || vData.stock || 0);
                if (vStock >= quantity && vData.sourceId !== 'admin') {
                    // Fetch real location from 'sources'
                    const sInfo = await getSourceInfo(vData.sourceId);
                    const vLoc = sInfo?.location || vData.location || { lat: 0, lng: 0, address: '' };

                    const dist = (vLoc.lat && customerLat)
                        ? calculateDistance(customerLat, customerLng, vLoc.lat, vLoc.lng)
                        : 999;
                    possibleVendors.push({
                        ...vData,
                        stock: vStock,
                        distance: dist,
                        sourceName: sInfo?.sourceName || vData.sourceName,
                        location: vLoc
                    });
                }
            }
            possibleVendors.sort((a, b) => a.distance - b.distance);
            itemAnalysis.push({ item, adminStockData, possibleVendors, assigned: false });
        }

        // C. PHASE 2: Selection Strategy (Strict max 2 Sources)
        const finalizedSourceIds = new Set();

        // Step 1: Admin Absorption
        const adminEligible = itemAnalysis.filter(e => e.adminStockData);
        if (adminEligible.length > 0) {
            finalizedSourceIds.add(adminConfig.sourceId);
            adminEligible.forEach(e => {
                e.assigned = true;
                e.assignedSourceId = adminConfig.sourceId;
            });
        }

        // Step 2: Top Vendor Ranking for leftovers
        const slotsRemaining = 2 - finalizedSourceIds.size;
        if (slotsRemaining > 0) {
            const remaining = itemAnalysis.filter(e => !e.assigned);
            if (remaining.length > 0) {
                const vendorStats = {};
                remaining.forEach(entry => {
                    entry.possibleVendors.forEach(v => {
                        if (!vendorStats[v.sourceId]) vendorStats[v.sourceId] = { count: 0, items: [], data: v };
                        vendorStats[v.sourceId].count++;
                        vendorStats[v.sourceId].items.push(entry);
                    });
                });

                const sortedVendors = Object.values(vendorStats).sort((a, b) => b.count - a.count);
                const winners = sortedVendors.slice(0, slotsRemaining);
                winners.forEach(w => {
                    finalizedSourceIds.add(w.data.sourceId);
                    w.items.forEach(e => {
                        if (!e.assigned) {
                            e.assigned = true;
                            e.assignedSourceId = w.data.sourceId;
                            e.assignedSourceData = w.data;
                        }
                    });
                });
            }
        }

        // D. PHASE 3: Validation & Final Plan
        const fulfillmentItems = [];
        const unfulfillable = [];
        for (const entry of itemAnalysis) {
            if (!entry.assigned) {
                unfulfillable.push(entry.item);
                continue;
            }
            // Resolve Item source details
            if (entry.assignedSourceId === adminConfig.sourceId) {
                fulfillmentItems.push({
                    ...entry.item,
                    productId: entry.item.productId || entry.item.id,
                    skuId: entry.item.productId || entry.item.id,
                    sourceId: adminConfig.sourceId,
                    sourceName: adminConfig.sourceName,
                    sourceType: 'DARKSTORE',
                    location: adminConfig.location,
                    subtotal: (entry.item.price || 0) * (entry.item.quantity || 1),
                    originalPrice: entry.item.originalPrice || entry.item.mrp || entry.item.price
                });
            } else {
                fulfillmentItems.push({
                    ...entry.item,
                    productId: entry.item.productId || entry.item.id,
                    skuId: entry.item.productId || entry.item.id,
                    sourceId: entry.assignedSourceId,
                    sourceName: entry.assignedSourceData.sourceName || 'Partner Vendor',
                    sourceType: 'VENDOR',
                    location: entry.assignedSourceData.location || null,
                    subtotal: (entry.item.price || 0) * (entry.item.quantity || 1),
                    originalPrice: entry.item.originalPrice || entry.item.mrp || entry.item.price
                });
            }
        }

        if (unfulfillable.length > 0) {
            return {
                success: false,
                error: `Some items are unavailable in the optimized fulfillment plan: ${unfulfillable.map(i => i.name).join(', ')}`,
                unfulfillable
            };
        }

        // E. PHASE 4: Execute Firestore Persistence
        const orderId = orderData.orderId || `ZC-${Date.now()}`;
        const createdAt = admin.firestore.FieldValue.serverTimestamp();

        const mainOrderDoc = {
            ...orderData,
            orderId,
            userId,
            status: 'confirmed',
            fulfillmentSummary: {
                sourceCount: finalizedSourceIds.size,
                isSplitOrder: finalizedSourceIds.size > 1,
                sources: Array.from(finalizedSourceIds)
            },
            createdAt,
            updatedAt: createdAt
        };

        // Batch Writes
        const batch = db.batch();
        batch.set(db.collection('orders').doc(orderId), mainOrderDoc);

        // Group by Source for Sub-Orders
        const grouped = {};
        fulfillmentItems.forEach(i => {
            if (!grouped[i.sourceId]) grouped[i.sourceId] = [];
            grouped[i.sourceId].push(i);
        });

        for (const [sid, items] of Object.entries(grouped)) {
            const subId = `${orderId}_${sid}`;
            const first = items[0];

            // Calculate totals for specifically this sub-order
            const subItemTotal = items.reduce((sum, i) => sum + (i.subtotal || 0), 0);

            // Partition Fees (Simplified: In real split, you might want to share fees proportionally)
            // Here we prioritize showing items accurately.

            batch.set(db.collection('sub_orders').doc(subId), {
                subOrderId: subId,
                mainOrderId: orderId,
                vendorId: sid,
                vendorName: first.sourceName || 'Partner Vendor',
                sourceType: first.sourceType || 'VENDOR',
                items: items,
                status: 'pending',
                pickupLocation: {
                    address: first.location?.address || 'Vendor Location',
                    lat: first.location?.lat || 0,
                    lng: first.location?.lng || 0
                },
                deliveryAddress: orderData.deliveryAddress || {
                    address: orderData.shippingAddress?.address || '',
                    lat: orderData.shippingAddress?.lat || 0,
                    lng: orderData.shippingAddress?.lng || 0,
                    name: orderData.customerName || 'User'
                },
                billDetails: {
                    itemTotal: subItemTotal,
                    subtotal: subItemTotal,
                    deliveryFee: (sid === Array.from(finalizedSourceIds)[0]) ? (orderData.billDetails?.deliveryFee || 0) : 0,
                    platformFee: (sid === Array.from(finalizedSourceIds)[0]) ? (orderData.billDetails?.platformFee || 0) : 0,
                    discount: 0,
                    total: subItemTotal + ((sid === Array.from(finalizedSourceIds)[0]) ? ((orderData.billDetails?.deliveryFee || 0) + (orderData.billDetails?.platformFee || 0)) : 0)
                },
                customerName: orderData.customerName || 'User',
                customerPhone: orderData.customerPhone || '',
                timeline: [
                    {
                        status: 'pending',
                        description: 'Order received from customer',
                        timestamp: new Date().toISOString()
                    }
                ],
                isAdminFallback: false,
                isPaid: orderData.isPaid || false,
                createdAt
            });
        }

        await batch.commit();

        return {
            success: true,
            orderId,
            sourceCount: finalizedSourceIds.size
        };

    } catch (err) {
        console.error('Checkout Function Error:', err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});

