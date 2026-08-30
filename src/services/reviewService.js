import { db, auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * Submit a review for a delivery partner
 * @param {Object} reviewData
 * @param {string} reviewData.orderId - The ID of the order
 * @param {string} reviewData.toUserId - The delivery partner's UID
 * @param {number} reviewData.rating - Rating from 1-5
 * @param {string} reviewData.comment - Optional comment
 * @returns {Promise<{success: boolean}>}
 */
export const submitDeliveryReview = async ({ orderId, toUserId, rating, comment }) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User must be authenticated');

        if (!orderId || !toUserId) throw new Error('Missing required fields');
        if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

        // specific document ID enforcement: one review per order per user-partner pair
        // Format: ${orderId}_user_to_partner
        const reviewId = `${orderId}_user_to_partner`;
        const reviewRef = doc(db, 'order_reviews', reviewId);

        // Check if already reviewed (optional protection, but good for UX)
        // Firestore rules should also enforce this if 'create' only is allowed or immutable
        const existingDoc = await getDoc(reviewRef);
        if (existingDoc.exists()) {
            throw new Error('You have already reviewed this delivery.');
        }

        const reviewPayload = {
            orderId,
            fromUserId: currentUser.uid,
            toUserId,
            role: 'user_to_partner',
            rating,
            comment: comment || '',
            createdAt: serverTimestamp(),
            // Metadata for easier querying/debugging
            userEmail: currentUser.email || null,
            userPhone: currentUser.phoneNumber || null
        };

        await setDoc(reviewRef, reviewPayload);

        return { success: true };
    } catch (error) {
        console.error('Error submitting review:', error);
        throw error;
    }
};
