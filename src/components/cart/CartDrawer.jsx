import React from 'react';
import { useCart } from '../../context/CartContext';
import CartPanel from './CartPanel';
import { X } from 'lucide-react';

const CartDrawer = () => {
    const { isCartOpen, toggleCart } = useCart();

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={toggleCart}
            ></div>

            {/* Drawer */}
            <div className="relative z-10 w-full max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                <CartPanel
                    className="h-full border-none shadow-none rounded-none w-full !sticky-0 !top-0"
                    onClose={toggleCart}
                />
            </div>
        </div>
    );
};

export default CartDrawer;

