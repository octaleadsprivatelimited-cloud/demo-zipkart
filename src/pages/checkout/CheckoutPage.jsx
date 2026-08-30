import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { MapPinned, Clock3, Wallet, CreditCard, Smartphone, Banknote, ChevronRight, TicketPercent, X, Truck, HandCoins, ShoppingCart, Crown, Loader2 } from 'lucide-react';
import { processPayment } from '../../services/paymentService';
import { WebOrderService } from '../../services/WebOrderService';
import { addUserAddress, getUserAddresses } from '../../services/userService';
import gpayIcon from '../../assets/payment-icons/gpay.png';
import phonepeIcon from '../../assets/payment-icons/phonepe.png';
import paytmIcon from '../../assets/payment-icons/paytm.png';
import upiIcon from '../../assets/payment-icons/upi.png';
import amazonPayIcon from '../../assets/payment-icons/amazon_pay.png';
import mobikwikIcon from '../../assets/payment-icons/mobikwik.png';
import AddressModal from '../../components/modals/AddressModal';

import { Home as HomeIcon, Briefcase, Building2, MapPinned as MapIcon } from 'lucide-react';

import { useRealTimeStock } from '../../hooks/useRealTimeStock';

const CheckoutPage = () => {
    const { cartItems, cartTotal: contextCartTotal, user, toggleLogin, clearCart, membership } = useCart();
    const navigate = useNavigate();

    // 1. Fetch Real-time Prices for Checkout
    const realtimeStock = useRealTimeStock(cartItems);

    // 2. Merge Real-time data with Cart Items
    const updatedCartItems = useMemo(() => {
        return cartItems.map(item => {
            const rt = realtimeStock[item.id];
            let price = item.price;
            let mrp = item.mrp || item.originalPrice || 0;

            if (rt) {
                // Logic from useRealTimeStock / ProductSection fallback
                if (rt.price > 0) price = rt.price;
                else if (rt.mrp > 0) price = rt.mrp; // Fallback if RT price is 0

                if (rt.mrp > 0) mrp = rt.mrp;
            }

            // Fallback: If price is 0, try using MRP
            if (price <= 0 && mrp > 0) {
                price = mrp;
            }

            return { ...item, price, mrp, originalPrice: mrp };
        });
    }, [cartItems, realtimeStock]);

    // Recalculate totals based on real-time prices
    const hasMembershipInCart = updatedCartItems.some(item => item.id === 'membership');
    const membershipCost = hasMembershipInCart ? 25 : 0;

    // Calculate items total from scratch using REAL-TIME prices
    const itemsTotal = updatedCartItems.reduce((sum, item) => {
        if (item.id === 'membership') return sum;
        return sum + (item.price * item.quantity);
    }, 0);

    // Initial Cart Total (Items + Membership)
    const cartTotal = itemsTotal + membershipCost;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const [selectedAddress, setSelectedAddress] = useState(0);
    const [selectedPayment, setSelectedPayment] = useState('upi');
    const [selectedPaymentOption, setSelectedPaymentOption] = useState('gpay');
    const [expandedPayment, setExpandedPayment] = useState('upi');
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const [, setAddressesLoading] = useState(true);


    // Default mock address for guests (memoized to prevent re-renders)
    const defaultAddress = useMemo(() => ({
        id: 'default',
        type: 'Home',
        flatNo: '123, Road No 12',
        area: 'Banjara Hills, Hyderabad',
        city: 'Hyderabad',
        pincode: '500034',
        contactName: 'Zipcart User',
        contactPhone: '9876543210',
        isDefault: true
    }), []);

    const [addresses, setAddresses] = useState([defaultAddress]);

    // Load addresses from Firestore when user logs in
    const loadAddressesFromFirestore = useCallback(async () => {
        if (!user) {
            setAddresses([defaultAddress]);
            setAddressesLoading(false);
            return;
        }

        try {
            console.log('📍 [CHECKOUT] Loading addresses from Firestore for user:', user.uid);
            setAddressesLoading(true);
            const firestoreAddresses = await getUserAddresses(user.uid);

            if (firestoreAddresses && firestoreAddresses.length > 0) {
                console.log('✅ [CHECKOUT] Loaded', firestoreAddresses.length, 'addresses from Firestore');
                setAddresses(firestoreAddresses);

                // Find and select default address
                const defaultIndex = firestoreAddresses.findIndex(addr => addr.isDefault);
                if (defaultIndex >= 0) {
                    setSelectedAddress(defaultIndex);
                }
            } else {
                console.log('📍 [CHECKOUT] No addresses found, showing default');
                setAddresses([defaultAddress]);
            }
        } catch (error) {
            console.error('❌ [CHECKOUT] Error loading addresses from Firestore:', error);
            setAddresses([defaultAddress]);
        } finally {
            setAddressesLoading(false);
        }
    }, [user, defaultAddress]);

    // Load addresses when user changes
    useEffect(() => {
        loadAddressesFromFirestore();
    }, [loadAddressesFromFirestore]);

    // Function to add new address to Firestore
    const handleAddAddress = async (newAddress) => {
        if (!user) {
            // For guests, just add to local state
            const guestAddress = {
                ...newAddress,
                id: `guest_${Date.now()}`
            };
            setAddresses(prev => [...prev, guestAddress]);
            setSelectedAddress(addresses.length);
            console.log('📍 [CHECKOUT] Added address locally (guest mode)');
            return;
        }

        try {
            console.log('💾 [CHECKOUT] Saving address to Firestore...');
            const result = await addUserAddress(user.uid, newAddress);

            if (result.success) {
                console.log('✅ [CHECKOUT] Address saved to Firestore:', result.id);
                // Reload addresses from Firestore
                await loadAddressesFromFirestore();
                setSelectedAddress(addresses.length); // Select the new address
            }
        } catch (error) {
            console.error('❌ [CHECKOUT] Error saving address:', error);
        }
    };

    // Unused functions removed to fix lint errors
    // handleDeleteAddress and handleSetDefaultAddress are not currently used in the UI


    const paymentMethods = [
        {
            id: 'upi',
            name: 'UPI',
            icon: Smartphone,
            description: 'Google Pay, PhonePe, Paytm',
            options: [
                { id: 'gpay', name: 'Google Pay', logo: gpayIcon },
                { id: 'phonepe', name: 'PhonePe', logo: phonepeIcon },
                { id: 'paytm', name: 'Paytm', logo: paytmIcon },
                { id: 'upi_other', name: 'Other UPI Apps', logo: upiIcon }
            ]
        },
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: CreditCard,
            description: 'Visa, Mastercard, Rupay',
            options: [
                { id: 'credit', name: 'Credit Card', logo: '💳' },
                { id: 'debit', name: 'Debit Card', logo: '💳' }
            ]
        },
        {
            id: 'wallet',
            name: 'Wallet',
            icon: Wallet,
            description: 'Paytm, PhonePe, Amazon Pay',
            options: [
                { id: 'paytm_wallet', name: 'Paytm Wallet', logo: paytmIcon },
                { id: 'phonepe_wallet', name: 'PhonePe Wallet', logo: phonepeIcon },
                { id: 'amazon_pay', name: 'Amazon Pay', logo: amazonPayIcon },
                { id: 'mobikwik', name: 'Mobikwik', logo: mobikwikIcon }
            ]
        },
        {
            id: 'cod',
            name: 'Cash on Delivery',
            icon: Banknote,
            description: 'Pay when you receive',
            options: []
        },

    ];

    const handleSaveAddress = async (addressData) => {
        await handleAddAddress(addressData);
        setShowAddAddress(false);
    };

    // Check if user has active membership with remaining free deliveries
    const hasActiveMembershipWithDeliveries = membership?.isActive &&
        membership?.freeDeliveriesRemaining > 0;

    // Free delivery conditions:
    // 1. Cart total >= 699
    // 2. Active membership with remaining free deliveries (limited to 15)
    // 3. Membership in cart (first order gets free delivery)
    const deliveryFee = (itemsTotal >= 699 || hasActiveMembershipWithDeliveries || hasMembershipInCart) ? 0 : 30;
    const platformFee = 11;
    const finalTotal = cartTotal + deliveryFee + platformFee - discount;

    const handleApplyCoupon = () => {
        // Mock coupon validation
        if (couponCode === 'FIRST50') {
            setAppliedCoupon('FIRST50');
            setDiscount(50);
        } else if (couponCode === 'SAVE100') {
            setAppliedCoupon('SAVE100');
            setDiscount(100);
        } else {
            alert('Invalid coupon code. Try FIRST50 or SAVE100');
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setDiscount(0);
        setCouponCode('');
    };

    const handlePlaceOrder = async () => {


        if (!user) {
            toggleLogin();
            return;
        }

        console.log('🚀 [CHECKOUT] Starting multi-vendor checkout flow...');
        setIsProcessing(true);
        setPaymentError(null);

        try {
            // 1. Generate Order ID (Format: ZC-YYMMDD-ALPHANUM)
            const date = new Date();
            const dateStr = date.getFullYear().toString().slice(-2) +
                (date.getMonth() + 1).toString().padStart(2, '0') +
                date.getDate().toString().padStart(2, '0');
            const randomStr = Array(5).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
            const orderId = `ZC-${dateStr}-${randomStr}`;

            // 2. Get selected address
            const selectedAddr = addresses[selectedAddress];

            // 3. Plan Fulfillment (to get source locations for items)
            console.log('📦 [CHECKOUT] Planning fulfillment locations...');
            const fulfillmentPlan = await WebOrderService.planFulfillment(
                updatedCartItems,
                selectedAddr?.lat || 17.4575,
                selectedAddr?.lng || 78.3707
            );

            // 4. Prepare payload for WebOrderService
            const orderPayload = {
                orderId,
                customerName: selectedAddr?.contactName || user.displayName || 'User',
                customerPhone: selectedAddr?.contactPhone || user.phoneNumber || '',

                items: (fulfillmentPlan.items && fulfillmentPlan.items.length > 0)
                    ? fulfillmentPlan.items.map(item => ({
                        productId: item.productId,
                        skuId: item.skuId,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit || '1 pc',
                        price: item.price,
                        originalPrice: item.originalPrice,
                        subtotal: item.subtotal,
                        image: item.image,
                        categoryId: item.categoryId,
                        categoryName: item.categoryName,
                        brand: item.brand,
                        sourceId: item.sourceId,
                        sourceName: item.sourceName,
                        sourceType: item.sourceType,
                        pickupLocation: item.pickupLocation,
                        vendorId: item.sourceId,
                        vendorName: item.sourceName,
                        isAdminFallback: item.isAdminFallback,
                        isPaid: item.isPaid,
                        deliveryTaskId: item.deliveryTaskId
                    }))
                    : updatedCartItems.map(item => ({
                        productId: item.id,
                        skuId: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit || '1 pc',
                        price: item.price,
                        originalPrice: item.originalPrice || item.mrp,
                        subtotal: item.price * item.quantity,
                        image: item.image
                    })),

                amount: finalTotal, // legacy
                totalAmount: finalTotal,

                billDetails: {
                    itemTotal: cartTotal - membershipCost,
                    subtotal: cartTotal - membershipCost,
                    deliveryFee: deliveryFee,
                    platformFee: platformFee,
                    discount: discount,
                    membershipCost: membershipCost,
                    tax: 0,
                    tipAmount: 0,
                    total: finalTotal
                },

                paymentMethod: selectedPayment,
                paymentStatus: 'pending',
                status: 'pending',

                // Address structure for Cloud Function (Optimization)
                shippingAddress: {
                    name: selectedAddr?.contactName || user.displayName || 'User',
                    phone: selectedAddr?.contactPhone || user.phoneNumber || '',
                    address: `${selectedAddr?.flatNo || ''}, ${selectedAddr?.area || ''}`,
                    city: selectedAddr?.city || '',
                    pincode: selectedAddr?.pincode || '',
                    lat: selectedAddr?.lat || 17.4575,
                    lng: selectedAddr?.lng || 78.3707
                },

                // Strict deliveryAddress structure for sub_orders
                deliveryAddress: {
                    id: selectedAddr?.id || 'unsaved',
                    name: selectedAddr?.contactName || user.displayName || 'User',
                    phoneNumber: selectedAddr?.contactPhone || user.phoneNumber || '',
                    address: `${selectedAddr?.flatNo || ''}, ${selectedAddr?.area || ''}`,
                    fullAddress: `${selectedAddr?.flatNo || ''}, ${selectedAddr?.area || ''}, ${selectedAddr?.city || ''}, ${selectedAddr?.pincode || ''}`,
                    lat: selectedAddr?.lat || 17.4575,
                    lng: selectedAddr?.lng || 78.3707,
                    type: selectedAddr?.type || 'Home',
                    label: selectedAddr?.type || 'Home',
                    isUnsaved: !selectedAddr?.id,
                    distance: "0 km"
                },

                timeline: [
                    {
                        status: 'pending',
                        description: 'Order received from customer',
                        timestamp: new Date().toISOString()
                    }
                ],

                hasMembership: updatedCartItems.some(item =>
                    item.name?.toLowerCase().includes('membership') ||
                    item.id === 'membership'
                )
            };

            // 5. Execute Multi-Vendor Fulfillment Planning & Order Creation
            const result = await WebOrderService.processCheckout(user.uid, orderPayload);

            if (!result.success) {
                console.error('❌ [CHECKOUT] Checkout failed:', result.error);
                setPaymentError(result.error || 'Failed to place order. Please try again.');
                setIsProcessing(false);
                return;
            }

            console.log('✅ [CHECKOUT] Main & Sub-Orders created successfully');

            // 5. Handle membership free delivery decrement
            if (hasActiveMembershipWithDeliveries && deliveryFee === 0 && !hasMembershipInCart && itemsTotal < 699) {
                const { useFreeDelivery: consumeFreeDelivery } = await import('../../services/membershipService');
                await consumeFreeDelivery(user.uid);
            }

            // 6. Handle Payment Flow
            if (selectedPayment === 'cod') {
                console.log('💵 [CHECKOUT] COD selected');
                clearCart();
                navigate(`/order-tracking/${orderId}?status=SUCCESS`);
                return;
            }

            // 7. Process Online Payment
            console.log('💳 [CHECKOUT] Processing online payment via Cashfree...');

            // We need a structure compatible with paymentService
            const paymentOrderData = {
                orderId: orderId,
                total: finalTotal
            };

            const paymentResult = await processPayment(paymentOrderData, user);

            if (!paymentResult.success) {
                setPaymentError(paymentResult.error || 'Payment failed. Please try again.');
                setIsProcessing(false);
                return;
            }

            // Fallback redirect for online payments
            setTimeout(() => {
                navigate(`/order-tracking/${orderId}?status=PENDING`);
            }, 3000);

        } catch (error) {
            console.error('❌ [CHECKOUT] Unexpected error:', error);
            setPaymentError('Something went wrong. Please try again.');
            setIsProcessing(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
                    <p className="text-gray-600 mb-6">Please login to continue with checkout</p>
                    <button
                        onClick={toggleLogin}
                        className="w-full bg-zipcart-green hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Login Now
                    </button>
                </div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
                    <p className="text-gray-600 mb-6">Add items to your cart to checkout</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-zipcart-green hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-4 md:py-6 relative">
            {/* Add Address Modal */}
            <AddressModal
                isOpen={showAddAddress}
                onClose={() => setShowAddAddress(false)}
                onSave={handleSaveAddress}
                user={user}
            />



            <div className="max-w-7xl mx-auto px-3 md:px-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Checkout</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Left Column - Checkout Details */}
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        {/* Delivery Address */}
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MapPinned className="w-4 h-4 md:w-5 md:h-5 text-zipcart-green" />
                                    Delivery Address
                                </h2>
                                <button
                                    onClick={() => setShowAddAddress(true)}
                                    className="text-zipcart-green hover:text-green-700 font-semibold text-xs md:text-sm"
                                >
                                    + Add New
                                </button>
                            </div>

                            <div className="space-y-3">
                                {addresses.map((addr, index) => (
                                    <div
                                        key={addr.id}
                                        onClick={() => setSelectedAddress(index)}
                                        className={`p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedAddress === index
                                            ? 'border-zipcart-green bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {addr.type === 'Home' && <HomeIcon className="w-4 h-4 text-gray-400" />}
                                                    {addr.type === 'Work' && <Briefcase className="w-4 h-4 text-gray-400" />}
                                                    {addr.type === 'Hotel' && <Building2 className="w-4 h-4 text-gray-400" />}
                                                    {addr.type === 'Other' && <MapIcon className="w-4 h-4 text-gray-400" />}
                                                    <span className="font-bold text-gray-900 text-sm md:text-base">{addr.type}</span>
                                                    {addr.isDefault && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs md:text-sm text-gray-600 font-medium">{addr.flatNo}{addr.floor ? `, ${addr.floor}` : ''}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1">{addr.area}</p>
                                                {addr.landmark && <p className="text-xs text-gray-400 italic">Near {addr.landmark}</p>}
                                            </div>
                                            {selectedAddress === index && (
                                                <div className="w-5 h-5 bg-zipcart-green rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>



                        {/* Payment Method */}
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-zipcart-green" />
                                Payment Method
                            </h2>

                            <div className="space-y-3">
                                {paymentMethods.map((method) => {
                                    const Icon = method.icon;
                                    const isExpanded = expandedPayment === method.id;
                                    const isSelected = selectedPayment === method.id;

                                    return (
                                        <div key={method.id} className="border-2 rounded-lg overflow-hidden transition-all"
                                            style={{
                                                borderColor: isSelected ? '#0c831f' : '#e5e7eb'
                                            }}
                                        >
                                            <div
                                                onClick={() => {
                                                    setSelectedPayment(method.id);
                                                    setExpandedPayment(isExpanded ? null : method.id);
                                                    if (method.options.length === 0) {
                                                        setSelectedPaymentOption(method.id);
                                                    }
                                                }}
                                                className={`p-4 cursor-pointer transition-all ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Icon className={`w-6 h-6 ${isSelected ? 'text-zipcart-green' : 'text-gray-400'}`} />
                                                        <div>
                                                            <p className="font-bold text-gray-900">{method.name}</p>
                                                            <p className="text-xs text-gray-500">{method.description}</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-5 h-5 bg-zipcart-green rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expandable Payment Options */}
                                            {isExpanded && method.options.length > 0 && (
                                                <div className="border-t border-gray-200 bg-gray-50 p-3 md:p-4">
                                                    <p className="text-xs font-semibold text-gray-600 mb-3 uppercase">Select Payment Option</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {method.options.map((option) => (
                                                            <div
                                                                key={option.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedPaymentOption(option.id);
                                                                }}
                                                                className={`p-2 md:p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-2 ${selectedPaymentOption === option.id
                                                                    ? 'border-zipcart-green bg-white shadow-sm'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                <div className="w-8 h-5 md:w-10 md:h-6 flex items-center justify-center">
                                                                    {typeof option.logo === 'string' && (option.logo.startsWith('/') || option.logo.startsWith('http') || option.logo.includes('base64')) || typeof option.logo !== 'string' ? (
                                                                        <img src={option.logo} alt="" className="w-full h-full object-contain" />
                                                                    ) : (
                                                                        <span className="text-lg md:text-xl">{option.logo}</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs md:text-sm font-medium ${selectedPaymentOption === option.id ? 'text-zipcart-green' : 'text-gray-700'
                                                                    }`}>
                                                                    {option.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* UPI ID Input for UPI payments */}
                                                    {method.id === 'upi' && selectedPaymentOption && (
                                                        <div className="mt-4">
                                                            <label className="text-xs font-semibold text-gray-600 mb-2 block">Enter UPI ID</label>
                                                            <input
                                                                type="text"
                                                                placeholder="example@upi"
                                                                className="w-full p-2 md:p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zipcart-green"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Card Details for Card payments */}
                                                    {method.id === 'card' && selectedPaymentOption && (
                                                        <div className="mt-4 space-y-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600 mb-2 block">Card Number</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="1234 5678 9012 3456"
                                                                    maxLength="19"
                                                                    className="w-full p-2 md:p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zipcart-green"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="text-xs font-semibold text-gray-600 mb-2 block">Expiry</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="MM/YY"
                                                                        maxLength="5"
                                                                        className="w-full p-2 md:p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zipcart-green"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-semibold text-gray-600 mb-2 block">CVV</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="123"
                                                                        maxLength="3"
                                                                        className="w-full p-2 md:p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zipcart-green"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 lg:sticky lg:top-24">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                            {/* Cart Items */}
                            <div className="max-h-48 overflow-y-auto mb-4 custom-scrollbar">
                                {updatedCartItems.map((item) => (
                                    <div key={item.id} className="flex gap-3 mb-3 pb-3 border-b border-gray-100 last:border-0">
                                        <img src={item.image} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-gray-50" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} x ₹{item.price}</p>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">₹{item.price * item.quantity}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Coupon Section */}
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                {!appliedCoupon ? (
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Enter coupon code"
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zipcart-green"
                                            />
                                        </div>
                                        <button
                                            onClick={handleApplyCoupon}
                                            className="px-4 py-2 bg-zipcart-green text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-sm"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center gap-2">
                                            <TicketPercent className="w-4 h-4 text-zipcart-green" />
                                            <span className="text-sm font-semibold text-zipcart-green">{appliedCoupon}</span>
                                        </div>
                                        <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price Breakdown */}
                            <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[14px] font-medium text-gray-600">Items total</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-gray-900">₹{cartTotal}</span>
                                </div>

                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[14px] font-medium text-gray-600">Delivery charge</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {deliveryFee === 0 ? (
                                            <span className="text-[12px] font-bold text-green-600 uppercase tracking-wide">FREE</span>
                                        ) : (
                                            <span className="text-[14px] font-bold text-gray-900">₹{deliveryFee}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2">
                                        <HandCoins className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[14px] font-medium text-gray-600">Handling charge</span>
                                    </div>
                                    <span className="text-[14px] font-bold text-gray-900">₹{platformFee}</span>
                                </div>

                                {discount > 0 && (
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <TicketPercent className="w-3.5 h-3.5 text-green-500" />
                                            <span className="text-[14px] font-medium text-gray-600">Discount</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-green-600">-₹{discount}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                                <span className="text-2xl font-bold text-zipcart-green">₹{finalTotal}</span>
                            </div>

                            {/* Payment Error Message */}
                            {paymentError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600 font-medium">{paymentError}</p>
                                </div>
                            )}

                            {/* Place Order Button */}
                            <button
                                onClick={handlePlaceOrder}
                                disabled={isProcessing}
                                className={`w-full font-bold py-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-zipcart-green hover:bg-green-700 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
                                    } text-white`}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing Payment...
                                    </>
                                ) : (
                                    <>
                                        Place Order
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {/* Membership Delivery Counter */}
                            {hasActiveMembershipWithDeliveries && deliveryFee === 0 && itemsTotal < 699 && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-green-600" />
                                    <p className="text-xs text-green-700 font-medium">
                                        {membership.freeDeliveriesRemaining} free {membership.freeDeliveriesRemaining === 1 ? 'delivery' : 'deliveries'} left • Expiry in {membership.daysRemaining} days
                                    </p>
                                </div>
                            )}

                            {itemsTotal < 699 && !hasActiveMembershipWithDeliveries && !hasMembershipInCart && (
                                <p className="text-xs text-center text-gray-500 mt-3">
                                    Add ₹{699 - itemsTotal} more for FREE delivery
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

