import { db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Membership Service
 * Handles membership purchase, tracking, and expiry notifications
 */

const MEMBERSHIP_DURATION_DAYS = 26;
const MEMBERSHIP_PRICE = 25;
const FREE_DELIVERIES = 15;

/**
 * Purchase or activate membership for a user
 * @param {string} userId - User ID
 * @param {Object} billingDetails - Billing information (optional)
 * @param {string} orderId - Associated order ID (optional)
 * @returns {Promise<Object>} Membership details
 */
export const purchaseMembership = async (userId, billingDetails = null, orderId = null) => {
    try {
        const membershipRef = doc(db, 'memberships', userId);
        const now = new Date();
        const expiryDate = new Date(now.getTime() + MEMBERSHIP_DURATION_DAYS * 24 * 60 * 60 * 1000);

        const membershipData = {
            userId,
            purchaseDate: serverTimestamp(),
            expiryDate: expiryDate.toISOString(),
            freeDeliveriesRemaining: FREE_DELIVERIES,
            isActive: true,
            price: MEMBERSHIP_PRICE,
            updatedAt: serverTimestamp(),

            // Order & Billing Integration
            orderId: orderId || null,
            billingDetails: billingDetails ? {
                paymentMethod: billingDetails.paymentMethod || 'UPI',
                address: billingDetails.address || null,
                paidAmount: billingDetails.paidAmount || MEMBERSHIP_PRICE
            } : null
        };

        await setDoc(membershipRef, membershipData);

        // Schedule expiry notification (in a real app, this would be handled by Cloud Functions)
        scheduleExpiryNotification(userId, expiryDate);

        return {
            success: true,
            membership: membershipData
        };
    } catch (error) {
        console.error('Error purchasing membership:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get user's membership status
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Membership details or null
 */
export const getMembership = async (userId) => {
    try {
        const membershipRef = doc(db, 'memberships', userId);
        const membershipDoc = await getDoc(membershipRef);

        if (!membershipDoc.exists()) {
            return null;
        }

        const membership = membershipDoc.data();
        const now = new Date();
        const expiryDate = new Date(membership.expiryDate);

        // Check if expired
        if (now > expiryDate) {
            await updateDoc(membershipRef, {
                isActive: false,
                updatedAt: serverTimestamp()
            });
            return { ...membership, isActive: false, expired: true };
        }

        // Calculate days remaining
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        return {
            ...membership,
            daysRemaining,
            expiryDate: expiryDate.toISOString()
        };
    } catch (error) {
        console.error('Error getting membership:', error);
        return null;
    }
};

/**
 * Use a free delivery from membership
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const useFreeDelivery = async (userId) => {
    try {
        const membership = await getMembership(userId);

        if (!membership || !membership.isActive || membership.freeDeliveriesRemaining <= 0) {
            return false;
        }

        const membershipRef = doc(db, 'memberships', userId);
        await updateDoc(membershipRef, {
            freeDeliveriesRemaining: membership.freeDeliveriesRemaining - 1,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error using free delivery:', error);
        return false;
    }
};

/**
 * Check if user should receive expiry notification
 * @param {Object} membership - Membership object
 * @returns {boolean} Whether to show notification
 */
export const shouldShowExpiryNotification = (membership) => {
    if (!membership || !membership.isActive) return false;

    const daysRemaining = membership.daysRemaining;

    // Show notification when 7, 3, or 1 days remaining
    return daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1;
};

/**
 * Schedule expiry notification (placeholder for Cloud Function)
 * In production, this would trigger Cloud Functions to send push notifications
 * @param {string} userId - User ID
 * @param {Date} expiryDate - Expiry date
 */
const scheduleExpiryNotification = (userId, expiryDate) => {
    // This is a placeholder. In production, you would:
    // 1. Use Firebase Cloud Functions with scheduled triggers
    // 2. Send push notifications via FCM
    // 3. Store notification preferences in Firestore

    console.log(`Scheduled expiry notification for user ${userId} at ${expiryDate}`);

    // Store notification schedule in localStorage for demo purposes
    const notifications = JSON.parse(localStorage.getItem('membershipNotifications') || '[]');
    notifications.push({
        userId,
        expiryDate: expiryDate.toISOString(),
        scheduledAt: new Date().toISOString()
    });
    localStorage.setItem('membershipNotifications', JSON.stringify(notifications));
};

/**
 * Get expiry notification message
 * @param {number} daysRemaining - Days until expiry
 * @returns {string} Notification message
 */
export const getExpiryNotificationMessage = (daysRemaining) => {
    if (daysRemaining === 1) {
        return '⚠️ Your Zipcart Membership expires tomorrow! Renew now to continue enjoying free deliveries.';
    } else if (daysRemaining === 3) {
        return '⏰ Your Zipcart Membership expires in 3 days. Renew to keep your benefits!';
    } else if (daysRemaining === 7) {
        return '📢 Your Zipcart Membership expires in 7 days. Don\'t miss out on free deliveries!';
    }
    return '';
};

/**
 * Get membership by order ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Membership or null
 */
export const getMembershipByOrderId = async () => {
    // This is a simple implementation - in production you'd query Firestore
    // For now, we'll just return null and let the order callback handle activation
    return null;
};

export const MEMBERSHIP_CONFIG = {
    DURATION_DAYS: MEMBERSHIP_DURATION_DAYS,
    PRICE: MEMBERSHIP_PRICE,
    FREE_DELIVERIES: FREE_DELIVERIES
};
