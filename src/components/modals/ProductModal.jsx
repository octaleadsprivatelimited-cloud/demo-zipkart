import React from 'react';
import { useCart } from '../../context/CartContext';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';
import { X, Clock } from 'lucide-react';
import { getFrontImage } from '../../utils/imageUtils';

const ProductModal = () => {
    const { selectedProduct, closeProduct, addToCart, cartItems, decreaseQuantity } = useCart();

    // Real-time stock for the selected product
    const productList = selectedProduct ? [selectedProduct] : [];
    const rtStock = useRealTimeStock(productList);

    if (!selectedProduct) return null;

    // Get real-time stock data
    const rt = rtStock[selectedProduct.id];
    const isOutOfStock = rt ? rt.isOutOfStock : selectedProduct.isOutOfStock;
    const stock = rt ? rt.stock : selectedProduct.stock;

    const cartItem = cartItems.find(item => item.id === selectedProduct.id);
    const quantity = cartItem ? cartItem.quantity : 0;

    // Use normalized fields and smart image selection
    const name = selectedProduct.name || selectedProduct.productName || 'Unnamed Product';
    const price = (rt?.price > 0 ? rt.price : null) || selectedProduct.price || selectedProduct.productPrice || 0;
    const originalPrice = (rt?.mrp > 0 ? rt.mrp : null) || selectedProduct.originalPrice || (price > 0 ? Math.round(price * 1.11) : 0);
    const image = getFrontImage(selectedProduct);
    const weight = selectedProduct.unit || selectedProduct.weight || '1 unit';

    // Calculate discount dynamically
    const discountPercent = originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    // Build active product with real-time data for cart operations
    const activeProduct = { ...selectedProduct, isOutOfStock, stock, price, mrp: originalPrice, originalPrice };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeProduct}
            ></div>
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={closeProduct}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/50 backdrop-blur-md rounded-full hover:bg-white shadow-sm transition-all"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className={`w-full aspect-square bg-gray-50 flex items-center justify-center p-8 border-b border-gray-100 relative ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
                    {selectedProduct.time && (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3 h-3 text-gray-900" />
                            <span className="text-xs font-bold text-gray-900 uppercase">{selectedProduct.time}</span>
                        </div>
                    )}
                    <img
                        src={image || 'https://placehold.co/400x400/f3f4f6/6b7280?text=No+Image'}
                        alt={name}
                        className="w-full h-full object-contain mix-blend-multiply"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x400/f3f4f6/6b7280?text=No+Image';
                        }}
                    />
                </div>

                <div className="p-6">
                    <div className="mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">
                            {weight}
                        </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 mb-2 leading-tight">
                        {name}
                    </h2>
                    <p className="text-xs text-gray-500 mb-6 line-clamp-2">
                        Naturally sourced, premium quality product delivered fresh to your doorstep in minutes.
                    </p>

                    <div className="flex items-end justify-between gap-4">
                        <div className="flex flex-col">
                            {originalPrice > price && (
                                <span className="text-xs text-gray-400 line-through font-medium">
                                    MRP ₹{originalPrice}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-bold text-gray-900">₹{price}</span>
                                {discountPercent > 0 && (
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                                        {discountPercent}% OFF
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5">(Inclusive of all taxes)</span>
                        </div>

                        {/* Action Button */}
                        <div className="w-36">
                            {isOutOfStock ? (
                                <button
                                    disabled
                                    className="w-full bg-gray-50 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center cursor-not-allowed border border-gray-100 uppercase text-sm tracking-wide"
                                >
                                    Out of Stock
                                </button>
                            ) : quantity > 0 ? (
                                <div className="flex items-center justify-between bg-green-700 rounded-xl p-1 shadow-lg shadow-green-100/50">
                                    <button
                                        onClick={() => decreaseQuantity(selectedProduct.id)}
                                        className="w-10 h-10 flex items-center justify-center text-white hover:bg-green-800 rounded-lg transition-colors font-bold text-xl active:scale-95"
                                    >
                                        -
                                    </button>
                                    <span className="text-white font-bold text-lg">{quantity}</span>
                                    <button
                                        onClick={() => {
                                            if (quantity < stock) {
                                                addToCart(activeProduct);
                                            }
                                        }}
                                        className={`w-10 h-10 flex items-center justify-center text-white rounded-lg transition-colors font-bold text-xl active:scale-95 ${quantity >= stock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-800'}`}
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => addToCart(activeProduct)}
                                    className="w-full bg-white text-green-700 border border-green-600 hover:bg-green-50 font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95 uppercase text-sm tracking-wide"
                                >
                                    Add
                                </button>
                            )}
                        </div>
                    </div>

                    {/* View Full Details Button */}
                    <button
                        onClick={() => {
                            window.location.href = `/product/${selectedProduct.id}`;
                        }}
                        className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm"
                    >
                        View Full Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
