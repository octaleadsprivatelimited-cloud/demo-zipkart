import { db } from '../config/firebase';
import {
    doc,
    updateDoc,
    Timestamp,
    runTransaction,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
// import { addMessageToTicket } from './supportService';

/**
 * Resolution Service
 * Handles automated resolution of support issues
 */

const COLLECTIONS = {
    ORDERS: 'orders',
    REFUNDS: 'refunds',
    WALLET: 'wallet_transactions'
};

/**
 * Check if an issue can be auto-resolved
 * @param {string} issueType - Type of issue
 * @param {Object} orderData - Order data
 * @returns {Object} Resolution eligibility and suggested action
 */
export const canAutoResolve = (issueType, orderData) => {
    if (!orderData) {
        return { canResolve: false, reason: 'Order not found' };
    }

    const now = new Date();
    const orderAge = (now - orderData.createdAt) / (1000 * 60 * 60); // hours
    const status = orderData.status?.toLowerCase();

    switch (issueType) {
        case 'missing_items':
            if (orderAge <= 24 && status === 'delivered') {
                return {
                    canResolve: true,
                    action: 'instant_refund',
                    reason: 'Order delivered within 24 hours'
                };
            }
            return {
                canResolve: false,
                reason: 'Order too old for instant refund',
                escalate: true
            };

        case 'wrong_items':
            if (orderAge <= 48 && status === 'delivered') {
                return {
                    canResolve: true,
                    action: 'return_refund',
                    reason: 'Order delivered within 48 hours'
                };
            }
            return {
                canResolve: false,
                reason: 'Order too old for return',
                escalate: true
            };

        case 'delayed_delivery':
            if (['confirmed', 'processing', 'out_for_delivery'].includes(status)) {
                const etaPassed = orderData.deliveryETA && now > orderData.deliveryETA;
                return {
                    canResolve: true,
                    action: etaPassed ? 'update_eta' : 'show_eta',
                    reason: 'Active order'
                };
            }
            return {
                canResolve: false,
                reason: 'Order not active',
                escalate: true
            };

        case 'payment_failed':
            if (status === 'payment_failed' || orderData.paymentStatus === 'failed') {
                return {
                    canResolve: true,
                    action: 'retry_payment',
                    reason: 'Payment failed'
                };
            }
            return {
                canResolve: false,
                reason: 'Payment already successful'
            };

        case 'refund_status':
            return {
                canResolve: true,
                action: 'show_refund_status',
                reason: 'Always available'
            };

        case 'cancel_order':
            if (['pending', 'confirmed'].includes(status)) {
                return {
                    canResolve: true,
                    action: 'cancel_order',
                    reason: 'Order not yet dispatched'
                };
            }
            return {
                canResolve: false,
                reason: 'Order already dispatched',
                escalate: true
            };

        default:
            return {
                canResolve: false,
                reason: 'Unknown issue type',
                escalate: true
            };
    }
};

/**
 * Execute instant refund to original payment method
 * @param {string} orderId - Order ID
 * @param {number} amount - Refund amount
 * @param {string} reason - Refund reason
 * @param {Array} items - Items to refund (optional)
 * @returns {Promise<Object>} Refund result
 */
export const executeRefund = async (orderId, amount, reason, items = []) => {
    try {
        const refundId = `REF-${Date.now()}`;

        // Create refund record
        const refundData = {
            refundId,
            orderId,
            amount,
            reason,
            items,
            status: 'processing',
            method: 'original_payment',
            createdAt: Timestamp.now(),
            estimatedCompletion: Timestamp.fromDate(
                new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
            )
        };

        await addDoc(collection(db, COLLECTIONS.REFUNDS), refundData);

        // Update order status
        const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
        await updateDoc(orderRef, {
            refundStatus: 'processing',
            refundAmount: amount,
            updatedAt: Timestamp.now()
        });

        console.log(`✅ Refund initiated: ${refundId} for ₹${amount}`);

        return {
            success: true,
            refundId,
            amount,
            estimatedDays: 5,
            message: `Refund of ₹${amount} initiated. Will be credited in 5-7 business days.`
        };

    } catch (error) {
        console.error('❌ Error executing refund:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Credit amount to user's wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit
 * @param {string} reason - Credit reason
 * @param {string} orderId - Related order ID
 * @returns {Promise<Object>} Credit result
 */
export const creditToWallet = async (userId, amount, reason, orderId) => {
    try {
        const transactionId = `WLT-${Date.now()}`;

        // Create wallet transaction
        const walletData = {
            transactionId,
            userId,
            orderId,
            amount,
            type: 'credit',
            reason,
            status: 'completed',
            createdAt: Timestamp.now()
        };

        await addDoc(collection(db, COLLECTIONS.WALLET), walletData);

        console.log(`✅ Wallet credited: ${transactionId} for ₹${amount}`);

        return {
            success: true,
            transactionId,
            amount,
            message: `₹${amount} credited to your wallet instantly!`
        };

    } catch (error) {
        console.error('❌ Error crediting wallet:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Update delivery ETA
 * @param {string} orderId - Order ID
 * @param {Date} newETA - New estimated delivery time
 * @returns {Promise<Object>} Update result
 */
export const updateDeliveryETA = async (orderId, newETA) => {
    try {
        const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);

        await updateDoc(orderRef, {
            deliveryETA: Timestamp.fromDate(newETA),
            etaUpdated: true,
            updatedAt: Timestamp.now()
        });

        console.log(`✅ ETA updated for order ${orderId}`);

        return {
            success: true,
            newETA,
            message: `Delivery ETA updated to ${newETA.toLocaleTimeString()}`
        };

    } catch (error) {
        console.error('❌ Error updating ETA:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Cancel order and initiate refund
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @param {number} refundAmount - Amount to refund
 * @returns {Promise<Object>} Cancellation result
 */
export const cancelOrder = async (orderId, reason, refundAmount) => {
    try {
        const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);

        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists()) {
                throw new Error('Order not found');
            }

            const orderData = orderDoc.data();

            // Check if order can be cancelled
            if (!['pending', 'confirmed'].includes(orderData.status)) {
                throw new Error('Order cannot be cancelled at this stage');
            }

            // Update order status
            transaction.update(orderRef, {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        });

        // Initiate refund if payment was made
        let refundResult = null;
        if (refundAmount > 0) {
            refundResult = await executeRefund(orderId, refundAmount, `Order cancelled: ${reason}`);
        }

        console.log(`✅ Order cancelled: ${orderId}`);

        return {
            success: true,
            message: 'Order cancelled successfully',
            refund: refundResult
        };

    } catch (error) {
        console.error('❌ Error cancelling order:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Retry payment for failed order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Payment retry result
 */
export const retryPayment = async (orderId) => {
    try {
        // In production, this would generate a new payment link
        // For now, return a mock payment URL
        const paymentUrl = `/checkout/retry/${orderId}`;

        console.log(`✅ Payment retry initiated for order ${orderId}`);

        return {
            success: true,
            paymentUrl,
            message: 'Payment link generated'
        };

    } catch (error) {
        console.error('❌ Error retrying payment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get refund status for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Refund status
 */
export const getRefundStatus = async (orderId) => {
    try {
        const refundsRef = collection(db, COLLECTIONS.REFUNDS);
        const q = query(refundsRef, where('orderId', '==', orderId), orderBy('createdAt', 'desc'), limit(1));

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return {
                hasRefund: false,
                message: 'No refund found for this order'
            };
        }

        const refundData = snapshot.docs[0].data();

        return {
            hasRefund: true,
            refundId: refundData.refundId,
            amount: refundData.amount,
            status: refundData.status,
            estimatedCompletion: refundData.estimatedCompletion?.toDate(),
            message: `Refund of ₹${refundData.amount} is ${refundData.status}`
        };

    } catch (error) {
        console.error('❌ Error fetching refund status:', error);
        return {
            hasRefund: false,
            error: error.message
        };
    }
};

/**
 * Handle automated resolution flow
 * @param {string} issueType - Type of issue
 * @param {Object} orderData - Order data
 * @param {Object} options - Additional options (amount, items, etc.)
 * @returns {Promise<Object>} Resolution result
 */
export const handleAutomatedResolution = async (issueType, orderData, options = {}) => {
    const eligibility = canAutoResolve(issueType, orderData);

    if (!eligibility.canResolve) {
        return {
            success: false,
            needsEscalation: eligibility.escalate,
            reason: eligibility.reason
        };
    }

    try {
        let result;

        switch (eligibility.action) {
            case 'instant_refund':
                if (options.useWallet) {
                    result = await creditToWallet(
                        orderData.userId,
                        options.amount,
                        `Missing items: ${issueType}`,
                        orderData.id
                    );
                } else {
                    result = await executeRefund(
                        orderData.id,
                        options.amount,
                        `Missing items`,
                        options.items
                    );
                }
                break;

            case 'return_refund':
                result = await executeRefund(
                    orderData.id,
                    options.amount,
                    `Wrong items`,
                    options.items
                );
                break;

            case 'update_eta': {
                const newETA = new Date(Date.now() + 30 * 60 * 1000); // +30 mins
                result = await updateDeliveryETA(orderData.id, newETA);
                break;
            }

            case 'cancel_order':
                result = await cancelOrder(
                    orderData.id,
                    options.reason || 'Customer request',
                    orderData.total
                );
                break;

            case 'retry_payment':
                result = await retryPayment(orderData.id);
                break;

            case 'show_refund_status':
                result = await getRefundStatus(orderData.id);
                break;

            default:
                return {
                    success: false,
                    reason: 'Unknown action type'
                };
        }

        return {
            success: result.success,
            action: eligibility.action,
            result
        };

    } catch (error) {
        console.error('❌ Error in automated resolution:', error);
        return {
            success: false,
            error: error.message,
            needsEscalation: true
        };
    }
};
