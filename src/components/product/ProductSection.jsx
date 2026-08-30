import React from 'react';
import { useCart } from '../../context/CartContext';
import { capitalizeWords } from '../../utils/capitalize';
import ProductImage from './ProductImage';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';
import { useCategories } from '../../hooks/useCategories';
import ProductSkeleton from '../common/ProductSkeleton';

const ProductSection = ({ title, categoryId }) => {
    const navigate = useNavigate();
    const { addToCart, cartItems, decreaseQuantity } = useCart();
    // Only fetch 10 products for the section to optimize performance
    const LIMIT_COUNT = 10;
    const { products, loading: productsLoading } = useProducts(categoryId, LIMIT_COUNT);
    const { categories } = useCategories();
    // Real-time stock listener
    const realtimeStock = useRealTimeStock(products);

    const targetCategory = categoryId
        ? categories.find(c => c.id === categoryId)
        : categories.find(c => c.name === title);

    const linkTo = targetCategory ? `/category/${targetCategory.slug || targetCategory.id}` : '#';

    // Filter products by category
    // If we fetched using ID, we don't need extensive client-side filtering
    // But we keep this logic robust just in case
    const filteredProducts = products.filter(product => {
        if (!categoryId && !title) return true;

        // If we fetched BY categoryId, the backend already filtered for us
        if (categoryId) return true;

        if (title) {
            // Fallback: Match by category name if no ID was provided
            return product.categoryName === title ||
                (targetCategory && (
                    product.categoryId === targetCategory.id ||
                    product.categoryId === targetCategory.id.toString()
                ));
        }
        return true;
    });

    // Show loading state
    // We only block if we are loading products. Categories are optional/secondary here.
    if (productsLoading && products.length === 0) {
        return (
            <div className="max-w-[1280px] mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="min-w-[160px] w-[160px] flex-shrink-0">
                            <ProductSkeleton />
                        </div>
                    ))}
                </div>
            </div>
        );
    }


    return (
        <div className="max-w-[1280px] mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <Link
                    to={linkTo}
                    className="inline-flex items-center gap-1.5 bg-[#ffd814] hover:bg-[#f7ca00] text-[#0f1111] font-semibold text-sm px-4 py-2 rounded-full transition-all duration-300 hover:shadow-md hover:scale-105 border border-[#fcd200] group"
                >
                    See All
                    <svg
                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {filteredProducts.slice(0, 10).map((product) => {
                    // Start of render logic

                    // --- REAL-TIME STOCK & PRICING LOGIC ---
                    let isOutOfStock = product.isOutOfStock;
                    let rtPrice = null;
                    let rtMrp = null;

                    if (realtimeStock[product.id]) {
                        const rt = realtimeStock[product.id];
                        isOutOfStock = rt.isOutOfStock;
                        if (rt.price > 0) rtPrice = rt.price;
                        if (rt.mrp > 0) rtMrp = rt.mrp;
                    }
                    // -----------------------------------------

                    const cartItem = cartItems.find(item => item.id === product.id);
                    const quantity = cartItem ? cartItem.quantity : 0;

                    // Map Firestore field names — real-time price overrides static
                    const name = capitalizeWords(product.productName || product.name || 'Unnamed Product');

                    // Priority: Real-time price > Normalized product price (which has built-in fallbacks)
                    let price = rtPrice || product.price || 0;
                    const originalPrice = rtMrp || product.originalPrice || (price > 0 ? Math.round(price * 1.11) : 0);

                    // Final safety fallback
                    if (price <= 0 && originalPrice > 0) {
                        price = originalPrice;
                    }
                    const weight = product.unit || product.weight || product.productDescription?.substring(0, 20) || '';
                    const deliveryTime = product.time || '15 MINS';


                    // Calculate discount percentage
                    const discountPercent = originalPrice > price
                        ? Math.round(((originalPrice - price) / originalPrice) * 100)
                        : 0;

                    return (
                        <div
                            key={product.id}
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="min-w-[160px] w-[160px] flex-shrink-0 bg-white border border-[#f0f0f0] rounded-xl p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer relative group"
                        >
                            {/* Discount Badge */}
                            {discountPercent > 0 && (
                                <div className="absolute top-0 left-0 bg-[#535766] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-xl rounded-br-lg z-10 uppercase tracking-wide">
                                    {discountPercent}% OFF
                                </div>
                            )}

                            {/* Image */}
                            <div className="w-full h-[120px] flex items-center justify-center mb-1 overflow-hidden">
                                <ProductImage
                                    product={product}
                                    alt={name}
                                    className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                                />
                            </div>

                            {/* Time/Delivery Tag */}
                            <div className="bg-gray-100 self-start px-1.5 py-0.5 rounded-[4px] mb-1">
                                <span className="text-[9px] font-bold text-gray-600 uppercase">⏱ {deliveryTime}</span>
                            </div>

                            {/* Product Name */}
                            <h3 className="text-[13px] font-semibold text-[#1c1c1c] leading-[18px] line-clamp-2 text-left" title={name}>
                                {name}
                            </h3>

                            {/* Unit/Weight */}
                            <p className="text-[11px] text-gray-500 font-medium text-left mt-0.5">
                                {weight}
                            </p>


                            {/* Footer: Price + Button */}
                            <div className="mt-auto flex items-center justify-between pt-2">
                                <div className="flex flex-col items-start">
                                    <span className="text-[13px] font-bold text-[#1c1c1c]">₹{price}</span>
                                    {originalPrice > price && (
                                        <span className="text-[11px] text-gray-500 line-through">₹{originalPrice}</span>
                                    )}
                                </div>

                                {/* Quantity Control or ADD Button */}
                                {isOutOfStock ? (
                                    <button
                                        disabled
                                        className="w-full h-8 bg-gray-50 border border-gray-100 text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-wide flex items-center justify-center cursor-not-allowed"
                                    >
                                        OUT OF STOCK
                                    </button>
                                ) : quantity > 0 ? (
                                    <div
                                        className="flex items-center bg-[#0c831f] rounded-lg overflow-hidden h-8 shadow-sm border border-[#0c831f]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => decreaseQuantity(product.id)}
                                            className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <span className="text-white text-[12px] font-bold px-0.5 w-6 text-center">{quantity}</span>
                                        <button
                                            onClick={() => addToCart({ ...product, price: price, mrp: originalPrice, originalPrice: originalPrice })}
                                            className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart({ ...product, price: price, mrp: originalPrice, originalPrice: originalPrice });
                                        }}
                                        className="px-4 py-1.5 bg-[#f7fff9] border border-[#0c831f] text-[#0c831f] text-[12px] font-extrabold rounded-lg hover:bg-[#0c831f] hover:text-white transition-colors uppercase tracking-wide h-8 flex items-center justify-center"
                                    >
                                        ADD
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(ProductSection);
