import { load } from '@cashfreepayments/cashfree-js';
import logger from '../utils/logger';

/**
 * Payment Service
 * Handles Cashfree payment integration for the Zipcart application
 */

// Get configuration from environment variables
const DEFAULT_FUNCTIONS_URL = import.meta.env.DEV
    ? 'http://127.0.0.1:5001/zipcart-e4531/us-central1'
    : 'https://us-central1-zipcart-e4531.cloudfunctions.net';
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || DEFAULT_FUNCTIONS_URL;
const CASHFREE_MODE = import.meta.env.VITE_CASHFREE_MODE || 'production';

let cashfreeInstance = null;

/**
 * Initialize Cashfree SDK
 * @returns {Promise<Object>} Cashfree instance
 */
export const initializeCashfree = async () => {
    if (!cashfreeInstance) {
        cashfreeInstance = await load({
            mode: CASHFREE_MODE // 'sandbox' for testing, 'production' for live
        });
    }
    return cashfreeInstance;
};

/**
 * Create a payment session via Cloud Function
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Payment session data
 */
export const createPaymentSession = async (paymentData) => {
    const { orderId, orderAmount, customerPhone, customerName } = paymentData;

    try {
        logger.log('💳 [PAYMENT] Creating payment session for order:', orderId);
        logger.log('💳 [PAYMENT] Functions URL:', FUNCTIONS_URL);

        const response = await fetch(`${FUNCTIONS_URL}/createOrder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId,
                orderAmount,
                customerPhone: customerPhone || '9999999999',
                customerName: customerName || 'Zipcart User'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [PAYMENT] Server error:', errorData);
            throw new Error(errorData.error || 'Failed to create payment session');
        }

        const data = await response.json();

        if (!data.payment_session_id) {
            throw new Error('No payment session ID received');
        }

        return {
            success: true,
            paymentSessionId: data.payment_session_id,
            orderId: data.order_id
        };
    } catch (error) {
        console.error('❌ [PAYMENT] Error creating payment session:', error);

        // Check if it's a network error
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            console.error('❌ [PAYMENT] Network error - Cloud Function may not be running');
            console.error('💡 [PAYMENT] Make sure Firebase Functions are deployed or emulator is running');
            return {
                success: false,
                error: 'Payment service unavailable. Please try Cash on Delivery or contact support.'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to create payment session'
        };
    }
};

/**
 * Open Cashfree checkout
 * @param {string} paymentSessionId - Payment session ID from createPaymentSession
 * @param {string} orderId - Order ID for return URL
 * @returns {Promise<void>}
 */
export const openCashfreeCheckout = async (paymentSessionId, orderId) => {
    try {
        console.log('💳 [PAYMENT] Initializing Cashfree SDK...');
        const cashfree = await initializeCashfree();

        const checkoutOptions = {
            paymentSessionId,
            returnUrl: `${window.location.origin}/order-tracking/${orderId}?status={order_status}`
        };

        console.log('💳 [PAYMENT] Opening Cashfree checkout with options:', checkoutOptions);
        console.log('💳 [PAYMENT] Return URL:', checkoutOptions.returnUrl);

        // This will redirect to Cashfree payment page
        cashfree.checkout(checkoutOptions);

        console.log('💳 [PAYMENT] Cashfree checkout initiated - browser should redirect now');
    } catch (error) {
        console.error('❌ [PAYMENT] Error opening Cashfree checkout:', error);
        throw error;
    }
};

/**
 * Verify payment status via Cloud Function
 * @param {string} orderId - Order ID to verify
 * @returns {Promise<Object>} Payment verification result
 */
export const verifyPayment = async (orderId) => {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/verifyPayment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
        });

        if (!response.ok) {
            throw new Error('Payment verification failed');
        }

        const data = await response.json();
        return {
            success: true,
            status: data.status,
            orderId: data.orderId
        };
    } catch (error) {
        console.error('Error verifying payment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Process complete payment flow
 * @param {Object} orderData - Complete order data
 * @param {Object} user - Current user
 * @returns {Promise<Object>} Result of payment initiation
 */
export const processPayment = async (orderData, user) => {
    try {
        logger.log('💳 [PAYMENT] Starting payment processing for order:', orderData.orderId);
        logger.log('💳 [PAYMENT] Order amount:', orderData.total);

        // 1. Create payment session
        const sessionResult = await createPaymentSession({
            orderId: orderData.orderId,
            orderAmount: orderData.total,
            customerPhone: user.phoneNumber,
            customerName: user.displayName
        });

        logger.log('💳 [PAYMENT] Payment session result:', sessionResult);

        if (!sessionResult.success) {
            logger.error('❌ [PAYMENT] Failed to create payment session:', sessionResult.error);
            return {
                success: false,
                error: sessionResult.error || 'Failed to create payment session'
            };
        }

        console.log('✅ [PAYMENT] Payment session created:', sessionResult.paymentSessionId);

        // 2. Open Cashfree checkout (this will redirect)
        await openCashfreeCheckout(sessionResult.paymentSessionId, orderData.orderId);

        console.log('✅ [PAYMENT] Payment processing initiated successfully');
        return {
            success: true,
            paymentSessionId: sessionResult.paymentSessionId
        };
    } catch (error) {
        console.error('❌ [PAYMENT] Error processing payment:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
