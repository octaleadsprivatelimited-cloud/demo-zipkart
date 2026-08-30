import React, { useEffect, useState } from 'react';
import { Bell, X, Crown } from 'lucide-react';
import { getMembership, shouldShowExpiryNotification, getExpiryNotificationMessage } from '../../services/membershipService';
import { useCart } from '../../context/CartContext';

const MembershipNotification = () => {
    const { user } = useCart();
    const [notification, setNotification] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const checkMembership = async () => {
            if (!user || dismissed) return;

            const membership = await getMembership(user.uid);

            if (membership && shouldShowExpiryNotification(membership)) {
                const message = getExpiryNotificationMessage(membership.daysRemaining);
                setNotification({
                    message,
                    daysRemaining: membership.daysRemaining
                });
            }
        };

        checkMembership();

        // Check every hour
        const interval = setInterval(checkMembership, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user, dismissed]);

    if (!notification || dismissed) return null;

    return (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-in slide-in-from-right duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl p-4 border-2 border-amber-300">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="text-[14px] font-bold">Membership Expiring Soon!</h4>
                            <button
                                onClick={() => setDismissed(true)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[12px] font-medium opacity-95 mb-3">
                            {notification.message}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Navigate to membership renewal
                                    window.location.href = '/';
                                    setDismissed(true);
                                }}
                                className="flex-1 bg-white text-amber-600 font-bold py-2 px-3 rounded-lg text-[12px] hover:bg-amber-50 transition-all"
                            >
                                Renew Now
                            </button>
                            <button
                                onClick={() => setDismissed(true)}
                                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-[12px] font-bold transition-all"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembershipNotification;
