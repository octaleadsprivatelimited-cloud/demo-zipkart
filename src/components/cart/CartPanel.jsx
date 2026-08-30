import React from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { X, Clock3, ChevronRight, ShoppingBag, Minus, Plus, Receipt, Truck, HandCoins, Crown } from 'lucide-react';
import { purchaseMembership } from '../../services/membershipService';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';
import { capitalizeWords } from '../../utils/capitalize';

const CartPanel = ({ className, onClose }) => {
    const { cartItems, cartTotal, addToCart, removeFromCart, decreaseQuantity, user, toggleLogin, membership: existingMembership } = useCart();
    const navigate = useNavigate();

    // 1. Fetch Real-time Prices
    const realtimeStock = useRealTimeStock(cartItems);

    // 2. Merge Real-time data with Cart Items
    const updatedCartItems = cartItems.map(item => {
        const rt = realtimeStock[item.id];
        let price = item.price;
        let mrp = item.mrp || item.originalPrice || 0;
        let isOutOfStock = false;

        if (rt) {
            // Logic from useRealTimeStock / ProductSection fallback
            if (rt.price > 0) price = rt.price;
            else if (rt.mrp > 0) price = rt.mrp; // Fallback if RT price is 0

            if (rt.mrp > 0) mrp = rt.mrp;
        }

        // If even after RT check price is 0, try to use MRP from item if available
        if (price <= 0 && mrp > 0) {
            price = mrp;
        }

        return { ...item, price, mrp, originalPrice: mrp };
    });

    // Derive membership state directly from cart
    const membershipItem = updatedCartItems.find(item => item.id === 'membership');
    const hasMembershipInCart = !!membershipItem;

    // Calculate billing values manually since we have new prices
    const membershipCost = hasMembershipInCart ? 25 : 0;

    // Recalculate items total with real-time prices (excluding membership)
    const itemsTotal = updatedCartItems.reduce((sum, item) => {
        if (item.id === 'membership') return sum;
        return sum + (item.price * item.quantity);
    }, 0);

    const grandTotalCalculation = () => {
        // Items total already calculated above
        // Membership cost separated

        // Support says FREE delivery above 699, else 30
        const isDeliveryFree = itemsTotal >= 699 || existingMembership?.isActive || hasMembershipInCart;
        const deliveryCharge = isDeliveryFree ? 0 : 30;
        const handlingCharge = 11;

        return {
            itemsTotal,
            membershipCost,
            deliveryCharge,
            handlingCharge,
            grandTotal: itemsTotal + membershipCost + deliveryCharge + handlingCharge,
            isDeliveryFree
        };
    };

    const { deliveryCharge, handlingCharge, grandTotal, isDeliveryFree } = grandTotalCalculation();

    const handleCheckout = async () => {
        if (!user) {
            toggleLogin();
            return;
        }

        if (hasMembershipInCart) {
            await purchaseMembership(user.uid);
        }

        navigate('/checkout');
        if (onClose) onClose();
    };

    const toggleMembership = () => {
        if (hasMembershipInCart) {
            removeFromCart('membership');
        } else {
            addToCart({
                id: 'membership',
                name: 'Zipcart Membership',
                price: 25,
                quantity: 1,
                image: 'https://cdn-icons-png.flaticon.com/512/5408/5408518.png', // Fallback icon
                weight: '1 Month'
            });
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className={`w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center relative ${className}`}>
                {onClose && (
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-900" />
                    </button>
                )}
                <div className="w-48 h-48 mb-6 flex items-center justify-center">
                    <ShoppingBag className="w-32 h-32 text-gray-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-[22px] font-bold text-gray-900 mb-2">You don't have anything in your cart</h3>
                <p className="text-[17px] font-medium text-gray-400 mb-10 max-w-[280px]">Add items now to get them delivered in minutes</p>
                <button
                    onClick={onClose}
                    className="bg-[#0c831f] text-white font-bold py-4 px-10 rounded-2xl text-[18px] shadow-lg shadow-green-100 transition-transform active:scale-95"
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex flex-col bg-[#f5f7f9] relative ${className}`}>
            {/* Header */}
            <div className="bg-white p-6 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
                <h2 className="text-[18px] font-bold text-[#111]">My Cart</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-6 h-6 text-[#111]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-4">
                    {/* Delivery Time Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock3 className="w-6 h-6 text-[#111]" />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-[#111]">Delivery in 10 minutes</h3>
                            <p className="text-[13px] font-bold text-gray-500 mt-0.5">Shipment of {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-8">
                        {updatedCartItems.map((item) => (
                            <div key={item.id} className="flex gap-5">
                                <div className="w-20 h-20 bg-white border border-gray-100 rounded-2xl p-2 flex items-center justify-center flex-shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[15px] font-bold text-[#111] leading-tight mb-1">{item.name}</h4>
                                    <span className="text-[13px] font-bold text-gray-400 mb-3 block">{item.unit || item.weight || '1 unit'}</span>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-bold text-[#111]">₹{item.price}</span>
                                            {item.mrp > item.price && <span className="text-[12px] font-bold text-gray-400 line-through">₹{item.mrp}</span>}
                                        </div>
                                        {/* Quantity Selector */}
                                        <div className="flex items-center bg-[#0c831f] rounded-lg h-9">
                                            <button
                                                onClick={() => decreaseQuantity(item.id)}
                                                className="w-8 h-full flex items-center justify-center text-white hover:bg-green-700 rounded-l-lg transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-6 text-center text-white text-[14px] font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-8 h-full flex items-center justify-center text-white hover:bg-green-700 rounded-r-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Membership Offer */}
                    {!existingMembership?.isActive && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 shadow-sm border-2 border-amber-200">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-bold text-gray-900 mb-1">Zipcart Membership</h4>
                                    <p className="text-[12px] font-medium text-gray-600 mb-3">Pay ₹25 extra & get 15 free deliveries</p>
                                    <button
                                        onClick={toggleMembership}
                                        className={`w-full py-2 px-4 rounded-lg text-[13px] font-bold transition-all ${hasMembershipInCart
                                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                            : 'bg-white text-amber-700 border-2 border-amber-300 hover:bg-amber-50'
                                            }`}
                                    >
                                        {hasMembershipInCart ? 'Remove' : '+ Add Membership'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {existingMembership?.isActive && (
                        <div className="bg-green-50 rounded-2xl p-4 shadow-sm border border-green-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Crown className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[14px] font-bold text-green-900">Active Membership</h4>
                                <p className="text-[12px] font-medium text-green-700">{existingMembership.freeDeliveriesRemaining} free deliveries left • Expiry in {existingMembership.daysRemaining} days</p>
                            </div>
                        </div>
                    )}

                    {/* Billing Details - NEW SECTION */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-3">
                        <h4 className="text-[15px] font-bold text-[#111] mb-2">Bill Details</h4>

                        <div className="flex justify-between items-center text-[14px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-4 h-4" />
                                <span>Items total</span>
                            </div>
                            <span className="font-medium text-[#111]">₹{itemsTotal}</span>
                        </div>

                        <div className="flex justify-between items-center text-[14px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                <span>Delivery charge</span>
                            </div>
                            <span className={`font-bold ${isDeliveryFree ? 'text-[#0c831f]' : 'text-[#111]'}`}>
                                {isDeliveryFree ? 'FREE' : `₹${deliveryCharge}`}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-[14px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <HandCoins className="w-4 h-4" />
                                <span>Handling charge</span>
                            </div>
                            <span className="font-medium text-[#111]">₹{handlingCharge}</span>
                        </div>

                        {hasMembershipInCart && (
                            <div className="flex justify-between items-center text-[14px] text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    <span>Membership fee</span>
                                </div>
                                <span className="font-medium text-[#111]">₹25</span>
                            </div>
                        )}

                        <div className="h-px bg-gray-100 my-2"></div>

                        <div className="flex justify-between items-center text-[16px] font-bold text-[#111]">
                            <span>Grand Total</span>
                            <span>₹{grandTotal}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Proceed Button */}
            <div className="p-4 bg-white border-t border-gray-100">
                <button
                    onClick={handleCheckout}
                    className="w-full bg-[#0c831f] text-white flex items-center justify-between p-4 px-6 rounded-[14px] shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-[0.98]"
                >
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[18px] font-bold">₹{grandTotal}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80 mt-1">TOTAL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[18px] font-bold">Proceed</span>
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default CartPanel;

