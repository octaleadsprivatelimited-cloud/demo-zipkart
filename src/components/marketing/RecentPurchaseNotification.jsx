import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, ChevronRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserOrders } from '../../services/orderService';
import { auth } from '../../config/firebase';

const RecentPurchaseNotification = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentPurchase, setCurrentPurchase] = useState(null);
    const [userItems, setUserItems] = useState([]);
    const [isClosing, setIsClosing] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // Fetch user's own recent items
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setIsAuthChecking(true);
            if (user) {
                try {
                    const orders = await getUserOrders(user.uid);
                    if (orders && orders.length > 0) {
                        // Extract unique products from recent orders
                        const items = [];
                        const seenIds = new Set();
                        
                        // Sort by date and get items
                        const sortedOrders = [...orders].sort((a, b) => {
                            const dateA = a.createdAt?.seconds || 0;
                            const dateB = b.createdAt?.seconds || 0;
                            return dateB - dateA;
                        });

                        sortedOrders.slice(0, 5).forEach(order => {
                            (order.items || []).forEach(item => {
                                const id = item.productId || item.id;
                                if (!seenIds.has(id)) {
                                    items.push({
                                        id,
                                        name: item.name,
                                        image: item.image || item.frontImage,
                                        price: item.price,
                                        orderedAt: order.createdAt
                                    });
                                    seenIds.add(id);
                                }
                            });
                        });
                        setUserItems(items);
                    }
                } catch (error) {
                    console.error('Failed to fetch user orders for notifications:', error);
                }
            } else {
                setUserItems([]);
            }
            setIsAuthChecking(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isAuthChecking || userItems.length === 0) {
            setIsVisible(false);
            return;
        }

        // Don't show if user has disabled
        const disabled = sessionStorage.getItem('zipcart_disable_recent_purchases');
        if (disabled) return;

        let currentIndex = 0;

        const showNotification = () => {
            const item = userItems[currentIndex];
            if (!item) return;

            setCurrentPurchase(item);
            setIsClosing(false);
            setIsVisible(true);

            // Hide after 6 seconds
            const hideTimeout = setTimeout(() => {
                setIsClosing(true);
                setTimeout(() => {
                    setIsVisible(false);
                    // Prepare next item
                    currentIndex = (currentIndex + 1) % userItems.length;
                }, 500);
            }, 6000);
            
            return hideTimeout;
        };

        // Start showing after 3 seconds
        const initialDelay = setTimeout(() => {
            showNotification();
        }, 3000);

        // Interval for subsequent items
        const interval = setInterval(() => {
            if (!isVisible) showNotification();
        }, 45000); // Show next item every 45s

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, [userItems, isAuthChecking, isVisible]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => setIsVisible(false), 500);
    };

    const handleDisable = (e) => {
        e.stopPropagation();
        sessionStorage.setItem('zipcart_disable_recent_purchases', 'true');
        handleClose();
    };

    if (!isVisible || !currentPurchase) return null;

    return (
        <div
            className={`fixed bottom-24 left-4 md:left-6 z-[80] w-[320px] md:w-[350px] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isClosing
                ? 'opacity-0 translate-y-8 md:translate-x-[-120%]'
                : 'opacity-100 translate-y-0 md:translate-x-0'
                }`}
        >
            <div className="bg-white/95 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-white/50 backdrop-blur-md">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <History className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white text-[11px] font-extrabold tracking-widest uppercase">
                            Previously Purchased
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors group"
                    >
                        <X className="w-4 h-4 text-white/80 group-hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 bg-gradient-to-br from-white to-blue-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-blue-50 shadow-sm shrink-0">
                            {currentPurchase.image ? (
                                <img
                                    src={currentPurchase.image}
                                    alt={currentPurchase.name}
                                    className="w-full h-full object-contain p-1.5 transition-transform duration-500 hover:scale-110"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <span className={`${currentPurchase.image ? 'hidden' : 'flex'} text-3xl`}>
                                📦
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-bold text-gray-900 line-clamp-1 leading-tight mb-1">
                                {currentPurchase.name}
                            </h4>
                            <p className="text-[12px] text-gray-500 font-medium">
                                You bought this recently
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[11px] font-bold text-blue-600">
                                    Available to re-order
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 bg-gray-50/30 pt-3">
                    <button
                        onClick={handleDisable}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                    >
                        Don't show again
                    </button>
                    <Link
                        to={`/product/${currentPurchase.id}`}
                        className="text-[12px] font-bold flex items-center gap-1 transition-all group text-blue-600 hover:text-blue-700"
                    >
                        View Product
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-100 relative">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-100"
                        style={{
                            animation: 'shrink 6s linear forwards'
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default RecentPurchaseNotification;
