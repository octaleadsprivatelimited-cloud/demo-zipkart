import React, { useState } from 'react';
import { submitDeliveryReview } from '../../services/reviewService';
import { Star, X } from 'lucide-react';

const RateDeliveryModal = ({ isOpen, onClose, order, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // If order doesn't exist or modal is closed, don't render
    if (!isOpen || !order) return null;

    // Assuming we can get the partner ID from the first delivery task or fulfillment order
    // In a real scenario, you'd pick the specific rider assigned.
    // Fallback: check deliveryTasks attached to order object if available, or assume a field exists.
    // strategies:
    // 1. Check order.deliveryPartner.riderId (Populated by subscription service)
    // 2. Check order.deliveryTasks[0].riderId (Raw task data)
    // 3. Check order.riderId (Direct assignment)
    const riderId = order.deliveryPartner?.riderId || order.deliveryTasks?.[0]?.riderId || order.riderId;

    const handleSubmit = async () => {
        if (rating === 0) return;
        if (!riderId) {
            setError('No delivery partner information found to rate.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await submitDeliveryReview({
                orderId: order.id || order.orderId,
                toUserId: riderId,
                rating,
                comment
            });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            // If already reviewed, treat as success for UX
            if (err.message && err.message.includes('already reviewed')) {
                if (onSuccess) onSuccess(); // Trigger success callback anyway
                onClose();
                return;
            }
            setError(err.message || 'Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900">Rate Delivery</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-gray-600">How was your delivery experience?</p>
                        <p className="text-sm text-gray-400">Order #{order.id || order.orderId}</p>
                    </div>

                    {/* Star Rating */}
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="group focus:outline-none transform transition-transform active:scale-95"
                            >
                                <Star
                                    className={`w-10 h-10 transition-colors ${rating >= star
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300 group-hover:text-yellow-200'
                                        }`}
                                    strokeWidth={1.5}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Comment Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Comments (Optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us more about the service..."
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none min-h-[100px] text-sm"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className={`w-full p-4 rounded-xl font-semibold text-white transition-all transform active:scale-[0.98] ${rating === 0 || isSubmitting
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                            }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateDeliveryModal;
