
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, MapPin, Clock, CheckCircle, Truck, Home, ChevronLeft, Phone, ShoppingCart, Info, TicketPercent, HandCoins, User, Crown, X, CreditCard, Wallet } from 'lucide-react';
import { getOrderById, updateOrderStatus, updatePaymentStatus, subscribeToOrder } from '../../services/orderService';
import DeliveryMap from '../../components/checkout/DeliveryMap';
import { purchaseMembership } from '../../services/membershipService';
import { useCart } from '../../context/CartContext';
import { useSupportChat } from '../../context/SupportChatContext';

import RateDeliveryModal from '../../components/modals/RateDeliveryModal';

const OrderTrackingPage = () => {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const { openChat } = useSupportChat();
    const [order, setOrder] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [membershipActivated, setMembershipActivated] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showRateModal, setShowRateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Convert order status to step number for timeline
    const getStepFromStatus = React.useCallback((status) => {
        const statusMap = {
            'placed': 0,
            'confirmed': 0,
            'success': 0,
            'processing': 1,
            'packed': 1,
            'preparing': 1,
            'ready': 1,
            'out_for_delivery': 2,
            'picked_up': 2,
            'in_transit': 2,
            'on_the_way': 2,
            'at_location': 3,
            'delivered': 3,
            'completed': 3
        };
        return statusMap[status?.toLowerCase()] ?? 0;
    }, []);

    // NEW: Calculate overall progress based on sub-orders
    const calculateOverallStep = React.useCallback((orderData) => {
        if (!orderData) return 0;

        const mainStep = getStepFromStatus(orderData.status);

        if (orderData.subOrders && orderData.subOrders.length > 0) {
            // Find the furthest progress among all sub-orders
            const subSteps = orderData.subOrders.map(so => getStepFromStatus(so.status));
            const furthestSubStep = Math.max(...subSteps);

            // Return the most advanced status found (main order or any sub-order)
            return Math.max(mainStep, furthestSubStep);
        }

        return mainStep;
    }, [getStepFromStatus]);

    useEffect(() => {
        const handlePaymentCallback = async () => {
            console.log('🔍 [ORDER TRACKING] Starting order fetch for:', orderId);
            console.log('🔍 [ORDER TRACKING] Payment status from URL:', searchParams.get('status'));

            // Get payment status from URL
            const paymentStatus = searchParams.get('status');

            try {
                // Fetch order from Firestore with retry logic
                let orderData = null;
                let retries = 0;
                const maxRetries = 5;

                console.log('🔄 [ORDER TRACKING] Starting order fetch with retry logic...');

                while (!orderData && retries < maxRetries) {
                    console.log(`🔄 [ORDER TRACKING] Attempt ${retries + 1}/${maxRetries}`);
                    orderData = await getOrderById(orderId);

                    if (orderData) {
                        console.log('✅ [ORDER TRACKING] Order found!', orderData);
                        break;
                    }

                    retries++;
                    if (retries < maxRetries) {
                        const delay = 1000 * retries; // 1s, 2s, 3s, 4s, 5s
                        console.log(`⏳ [ORDER TRACKING] Order not found, waiting ${delay}ms before retry ${retries + 1}/${maxRetries}...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }

                if (!orderData) {
                    console.error('❌ [ORDER TRACKING] Order not found after', maxRetries, 'retries');
                    console.error('❌ [ORDER TRACKING] Order ID:', orderId);
                    console.error('❌ [ORDER TRACKING] This might indicate the order was not saved to Firestore');
                    setIsLoading(false);
                    return;
                }

                console.log('✅ [ORDER TRACKING] Order fetched successfully from Firestore');
                setOrder(orderData);

                // 2. Handle payment callback
                if (paymentStatus) {
                    console.log('💳 [ORDER TRACKING] Processing payment status:', paymentStatus);

                    if ((paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') && orderData.payment?.status !== 'paid') {
                        console.log('💳 [ORDER TRACKING] Processing successful payment callback');
                        // Update payment status to paid
                        await updatePaymentStatus(orderId, 'paid', {
                            transactionId: searchParams.get('transaction_id') || null
                        });

                        // Show success modal
                        setShowSuccessModal(true);

                        // Activate membership if order contains membership
                        if (orderData.hasMembership && !orderData.membershipActivated) {
                            const billingDetails = {
                                paymentMethod: orderData.payment?.method || 'UPI',
                                address: orderData.deliveryAddress,
                                paidAmount: orderData.billing?.total || 25
                            };

                            const membershipResult = await purchaseMembership(
                                orderData.userId,
                                billingDetails,
                                orderId
                            );

                            if (membershipResult.success) {
                                setMembershipActivated(true);
                                await updateOrderStatus(orderId, 'success', {
                                    membershipActivated: true
                                });
                            }
                        }

                        // Clear cart
                        clearCart();

                        // Update local state  
                        const updatedOrder = { ...orderData, isPaid: true, status: 'success' };
                        setOrder(updatedOrder);
                    } else if (paymentStatus === 'FAILED') {
                        console.log('❌ [ORDER TRACKING] Payment failed');
                        await updateOrderStatus(orderId, 'failed');
                        setOrder({ ...orderData, status: 'failed' });
                    }
                }

                // Set step based on dynamic aggregation
                setCurrentStep(calculateOverallStep(orderData));
                setIsLoading(false);

                // Set up real-time subscription
                unsubscribeRef.current = subscribeToOrder(orderId, (updatedOrder) => {
                    if (updatedOrder) {
                        setOrder(updatedOrder);
                        setCurrentStep(calculateOverallStep(updatedOrder));
                    }
                });

            } catch (error) {
                console.error('❌ [ORDER TRACKING] Error handling payment callback:', error);
                setIsLoading(false);
            }
        };

        if (orderId) {
            handlePaymentCallback();
        } else {
            setTimeout(() => setIsLoading(false), 0);
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [orderId, searchParams, clearCart, calculateOverallStep, getStepFromStatus]);

    // Secondary Real-time updates subscription to catch any missed updates
    useEffect(() => {
        if (!orderId) return;

        const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
            if (updatedOrder) {
                setOrder(updatedOrder);
                setCurrentStep(calculateOverallStep(updatedOrder));
            }
        });

        return () => unsubscribe();
    }, [orderId, calculateOverallStep]);

    const orderSteps = [
        {
            id: 1,
            title: 'Order Confirmed',
            description: 'Your order has been placed',
            icon: CheckCircle,
            time: order?.timestamp || order?.createdAt ?
                new Date(order.timestamp || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                ''
        },
        { id: 2, title: 'Order Packed', description: 'Your order is being prepared', icon: Package, time: '' },
        { id: 3, title: 'Out for Delivery', description: 'Your order is on the way', icon: Truck, time: '' },
        { id: 4, title: 'Delivered', description: 'Your order has been delivered', icon: Home, time: '' }
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-40 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-20"></div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[300px] animate-pulse"></div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <div className="space-y-6">
                                    <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex gap-4">
                                                <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 h-20 animate-pulse"></div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                    <p className="text-gray-600 mb-6">We couldn't find the order # {orderId}. It might take a moment to appear.</p>
                    <button onClick={() => navigate('/')} className="w-full bg-[#0c831f] text-white font-bold py-3 rounded-lg">Go to Home</button>
                </div>
            </div>
        );
    }

    // Support both new pricing structure and legacy billing structure
    const billing = order.pricing ? {
        cartTotal: order.pricing.subtotal || 0,
        deliveryFee: order.pricing.deliveryFee || 0,
        platformFee: order.pricing.platformFee || 0,
        tax: order.pricing.tax || 0,
        discount: order.pricing.discount || 0,
        total: order.pricing.total || order.total || 0
    } : (order.billing || {
        cartTotal: order.total - 11, // Approximation for very old orders
        deliveryFee: 0,
        platformFee: 11,
        tax: 0,
        discount: 0,
        total: order.total || 0
    });

    // Get payment info
    const paymentMethod = order.payment?.method || order.paymentMethod?.id || order.paymentMethod?.name || 'upi';
    const paymentStatus = order.payment?.status || (order.isPaid ? 'paid' : 'pending');

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            {/* Payment Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 mb-8">Your order has been placed successfully.</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-zipcart-green hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Track Order
                        </button>
                    </div>
                </div>
            )}
            {/* Navbar */}
            <div className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-bold">Back to Home</span>
                    </button>
                    <div className="font-bold text-gray-900">Order #{order.orderId}</div>
                    <div className="w-20"></div> {/* Spacer */}
                </div>
            </div>

            {/* Membership Activation Banner */}
            {membershipActivated && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-4 shadow-lg">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <Crown className="w-6 h-6 animate-bounce" />
                        <div className="text-center">
                            <p className="font-bold text-lg">🎉 Membership Activated Successfully!</p>
                            <p className="text-sm opacity-90">Enjoy 15 free deliveries for the next 26 days</p>
                        </div>
                        <Crown className="w-6 h-6 animate-bounce" />
                    </div>
                </div>
            )}

            {/* Payment Status Banners */}
            {order.status === 'success' && !membershipActivated && (
                <div className="bg-green-50 border-b border-green-200 py-3 px-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-green-800 font-semibold">Payment Successful! Your order is confirmed.</p>
                    </div>
                </div>
            )}

            {order.status === 'failed' && (
                <div className="bg-red-50 border-b border-red-200 py-3 px-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                        <X className="w-5 h-5 text-red-600" />
                        <p className="text-red-800 font-semibold">Payment Failed. Please try again.</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Map & Timeline */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Live Map Visualization */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative h-[300px]">
                            {(() => {
                                // Dynamically determine pickup location
                                let pickupLoc = { lat: 17.4575, lng: 78.3707 }; // Default Zipcart Warehouse (Hyderabad)

                                if (order.deliveryPartner?.pickup?.lat) {
                                    pickupLoc = {
                                        lat: Number(order.deliveryPartner.pickup.lat),
                                        lng: Number(order.deliveryPartner.pickup.lng)
                                    };
                                } else if (order.subOrders && order.subOrders.length > 0) {
                                    // Use first sub-order's pickup location
                                    const firstSub = order.subOrders[0];
                                    if (firstSub.pickupLocation?.lat) {
                                        pickupLoc = {
                                            lat: Number(firstSub.pickupLocation.lat),
                                            lng: Number(firstSub.pickupLocation.lng)
                                        };
                                    } else if (firstSub.vendorLat) {
                                        pickupLoc = {
                                            lat: Number(firstSub.vendorLat),
                                            lng: Number(firstSub.vendorLng)
                                        };
                                    }
                                }

                                return (
                                    <DeliveryMap
                                        pickupLocation={pickupLoc}
                                        deliveryLocation={{
                                            lat: order.shippingAddress?.lat || order.address?.lat || 17.4483,
                                            lng: order.shippingAddress?.lng || order.address?.lng || 78.3915
                                        }} // Customer's delivery address
                                        currentStep={currentStep}
                                    />
                                );
                            })()}
                        </div>

                        {/* Order Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-lg font-extrabold text-[#111] mb-6">Order Status</h2>
                            <div className="relative">
                                {orderSteps.map((step, index) => {
                                    const isCompleted = index <= currentStep;

                                    return (
                                        <div key={step.id} className="relative pb-10 last:pb-0 pl-8 border-l-2 border-dashed border-gray-100 last:border-0">
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isCompleted ? 'bg-[#0c831f] border-[#0c831f]' : 'bg-white border-gray-300'}`}></div>

                                            <div className={`transition-all duration-500 ${isCompleted ? 'opacity-100' : 'opacity-50'}`}>
                                                <h3 className="font-bold text-base text-gray-900">{step.title}</h3>
                                                <p className="text-sm text-gray-500">{step.description}</p>
                                                {step.time && isCompleted && (
                                                    <div className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {step.time}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Package Breakdown for Split Orders */}
                            {order.subOrders && order.subOrders.length > 1 && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Delivery Breakdown</h3>
                                    <div className="space-y-3">
                                        {order.subOrders.map((sub, idx) => (
                                            <div key={sub.subOrderId || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                        <Package className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">{sub.vendorName || (sub.sourceType === 'DARKSTORE' ? 'Zipcart Dark Store' : 'Zipcart Partner Store')}</p>
                                                        <p className="text-[10px] text-gray-500">Package #{idx + 1}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${sub.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        sub.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {sub.status?.replace(/_/g, ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                                        Your order has been split into {order.subOrders.length} packages for faster delivery from multiple locations.
                                        The timeline above shows the furthest progress.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Bill & Details */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Delivery Partner Card */}
                        {order.deliveryPartner && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                                        {order.deliveryPartner.photo ? (
                                            <img src={order.deliveryPartner.photo} alt={order.deliveryPartner.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 leading-tight">{order.deliveryPartner.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
                                                {order.deliveryPartner.status === 'assigned' ? 'Assigned' :
                                                    order.deliveryPartner.status === 'picked_up' ? 'Picked Up' :
                                                        order.deliveryPartner.status === 'out_for_delivery' ? 'On the way' :
                                                            order.deliveryPartner.status || 'Active'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {order.deliveryPartner.phone && (
                                    <a href={'tel:' + order.deliveryPartner.phone} className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center hover:bg-green-100 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-sm border border-green-100">
                                        <Phone className="w-5 h-5 text-green-600" />
                                    </a>
                                )}
                            </div>
                        )}
                        {/* Customer Support Card */}
                        <button
                            onClick={openChat}
                            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between text-left hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Phone className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Need Help?</p>
                                    <p className="text-xs text-blue-600 font-medium">Chat with us</p>
                                </div>
                            </div>
                            <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180 group-hover:text-gray-600 transition-colors" />
                        </button>

                        {/* Delivery Partner Card - Shows when partner is assigned */}
                        {order.deliveryPartner && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex items-center gap-4">
                                    {/* Partner Photo/Avatar */}
                                    <div className="relative">
                                        {order.deliveryPartner.photo ? (
                                            <img
                                                src={order.deliveryPartner.photo}
                                                alt={order.deliveryPartner.name}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-green-500"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                                <User className="w-7 h-7 text-white" />
                                            </div>
                                        )}
                                        {/* Online indicator */}
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                                    </div>

                                    {/* Partner Details */}
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{order.deliveryPartner.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Delivery Partner</p>
                                        {order.deliveryPartner.vehicleNumber && (
                                            <p className="text-xs text-gray-400 mt-0.5">{order.deliveryPartner.vehicleNumber}</p>
                                        )}
                                    </div>

                                    {/* Call Button */}
                                    {order.deliveryPartner.phone && (
                                        <a
                                            href={`tel:${order.deliveryPartner.phone}`}
                                            className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            <Phone className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                </div>

                                {/* Status Badge */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {order.deliveryPartner.status === 'picked_up' || order.deliveryPartner.status === 'in_transit'
                                                ? 'On the way to you'
                                                : order.deliveryPartner.status === 'at_location'
                                                    ? 'Arrived at your location'
                                                    : 'Assigned to your order'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rate Delivery Card - Only show when delivered */}
                        {((order.status === 'delivered' || order.status === 'completed') || currentStep >= 4) && (
                            <button
                                onClick={() => setShowRateModal(true)}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 shadow-lg text-white flex items-center justify-between text-left hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <div className="text-xl">⭐</div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">Rate Delivery</p>
                                        <p className="text-xs text-white/90 font-medium">How was the partner?</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                    Review
                                </div>
                            </button>
                        )}

                        {/* Order Summary including Billing */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                <h3 className="font-bold text-gray-900">Bill Details</h3>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Items List (Collapsed view) */}
                                <div className="space-y-3">
                                    {(order.items || []).map((item, idx) => (
                                        <div key={item.id || idx} className="flex justify-between items-start text-sm">
                                            <div className="flex gap-2">
                                                <div className="w-4 h-4 bg-green-100 border border-green-300 flex items-center justify-center mt-0.5 rounded-[3px]">
                                                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-800">{item.name}</span>
                                                    <div className="text-gray-400 text-xs">{item.unit || item.weight} x {item.quantity}</div>
                                                </div>
                                            </div>
                                            <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-gray-100 my-4"></div>

                                {/* Payment Summary Section - Matching Admin View */}
                                <div className="mb-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Summary</h4>
                                </div>
                                <div className="space-y-2 bg-gray-50/70 rounded-xl p-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium text-gray-900">₹{billing.cartTotal}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Delivery Fee</span>
                                        <span className={`font-medium ${billing.deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                            {billing.deliveryFee === 0 ? '₹0' : `₹${billing.deliveryFee}`}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Tax</span>
                                        <span className="font-medium text-gray-900">₹{billing.tax}</span>
                                    </div>

                                    {billing.platformFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Handling charge</span>
                                            <span className="font-medium text-gray-900">₹{billing.platformFee}</span>
                                        </div>
                                    )}

                                    {billing.discount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600">Discount</span>
                                            <span className="font-bold text-green-600">-₹{billing.discount}</span>
                                        </div>
                                    )}

                                    {/* Total Row */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                        <span className="font-bold text-gray-900">Total</span>
                                        <span className="text-lg font-bold text-green-600">₹{billing.total || order.total}</span>
                                    </div>

                                    {/* Payment Method & Status - Like Admin View */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 mt-2">
                                        <Wallet className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">{paymentMethod.toUpperCase()}</span>
                                        <span className="text-gray-400">-</span>
                                        <span className={`text-sm font-semibold ${paymentStatus === 'paid' ? 'text-green-600' :
                                            paymentStatus === 'failed' ? 'text-red-600' :
                                                'text-amber-600'
                                            }`}>
                                            {paymentStatus === 'paid' ? 'Paid' :
                                                paymentStatus === 'failed' ? 'Failed' :
                                                    'Pending'}
                                        </span>
                                    </div>


                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Delivery Address Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3">Delivery to</h3>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{order.shippingAddress?.name || order.address?.contactName || order.address?.type || 'Home'}</p>
                                <p className="text-sm text-gray-600 leading-relaxed mt-1">
                                    {order.shippingAddress?.addressLine1 || order.address?.flatNo || order.address?.address || 'Address'}{order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}, {order.shippingAddress?.city || order.address?.city || 'City'} - {order.shippingAddress?.pincode || order.address?.pincode || '000000'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <RateDeliveryModal
                isOpen={showRateModal}
                onClose={() => setShowRateModal(false)}
                order={order}
                onSuccess={() => {
                    console.log('Review submitted successfully');
                }}
            />
        </div>
    );
};

export default OrderTrackingPage;

