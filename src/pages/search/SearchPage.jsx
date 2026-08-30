import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { Search, SlidersHorizontal, Clock, Sparkles } from 'lucide-react';
import ProductSkeleton from '../../components/common/ProductSkeleton';
import { capitalizeWords } from '../../utils/capitalize';
import { getFrontImage } from '../../utils/imageUtils';
import { searchEngine } from '../../services/search';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();
    const { products, loading } = useProducts();
    const { addToCart, cartItems, decreaseQuantity } = useCart();
    // Real-time stock listener
    const realtimeStock = useRealTimeStock(products);


    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { filteredProducts, searchMetadata } = useMemo(() => {
        if (products.length > 0 && query) {
            // Use advanced search engine
            const searchResults = searchEngine.search(query, products, {
                // User profile for personalization
                purchasedProducts: [],
                categoryPreferences: {},
                brandPreferences: {},
                recentlyViewed: []
            });

            // Results are already ranked by the search engine
            return { filteredProducts: searchResults.results, searchMetadata: searchResults.processed };
        } else if (products.length > 0 && !query) {
            // Show all products if no query
            return { filteredProducts: products, searchMetadata: null };
        }
        return { filteredProducts: [], searchMetadata: null };
    }, [query, products]);

    const handleSearch = (e) => {
        e.preventDefault();
        const term = e.target.elements.search.value;
        if (term.trim()) {
            navigate(`/search?q=${encodeURIComponent(term)}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Search Header */}
            <div className="bg-white border-b border-gray-200 sticky top-20 z-40 md:top-0">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-4 md:hidden">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            name="search"
                            type="text"
                            defaultValue={query}
                            placeholder="Search for products..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-zipcart-green"
                        />
                    </form>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {query ? `Showing results for "${query}"` : 'All Products'}
                                </h1>
                                <span className="text-sm text-gray-500 font-medium">({filteredProducts.length} items)</span>
                            </div>

                            {/* Search Metadata */}
                            {searchMetadata && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {searchMetadata.corrected !== searchMetadata.normalized && (
                                        <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Corrected to: "{searchMetadata.corrected}"</span>
                                        </div>
                                    )}
                                    {searchMetadata.intent && searchMetadata.intent.type !== 'GENERIC' && (
                                        <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                                            {searchMetadata.intent.type === 'BRAND' && `Brand: ${searchMetadata.intent.brand}`}
                                            {searchMetadata.intent.type === 'CATEGORY' && `Category: ${searchMetadata.intent.category}`}
                                            {searchMetadata.intent.type === 'BRAND_CATEGORY' && `${searchMetadata.intent.brand} ${searchMetadata.intent.category}`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 bg-white"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[...Array(12)].map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredProducts.map(product => {
                            // --- REAL-TIME STOCK & PRICING LOGIC ---
                            let isOutOfStock = product.isOutOfStock;
                            let stock = product.stock;
                            let rtPrice = null;
                            let rtMrp = null;

                            if (realtimeStock[product.id]) {
                                const rt = realtimeStock[product.id];
                                stock = rt.stock;
                                isOutOfStock = rt.isOutOfStock;
                                if (rt.price > 0) rtPrice = rt.price;
                                if (rt.mrp > 0) rtMrp = rt.mrp;
                            }
                            // -----------------------------------------

                            const activeProduct = { ...product, isOutOfStock, stock };
                            const cartItem = cartItems.find(item => item.id === product.id);
                            const quantity = cartItem?.quantity || 0;

                            // Dynamic price — real-time source map overrides static
                            let displayPrice = rtPrice || product.price || product.productPrice || 0;
                            const originalPrice = rtMrp || product.originalPrice || 0;

                            // Fallback: If selling price is 0 but MRP exists, use MRP
                            if (displayPrice <= 0 && originalPrice > 0) {
                                displayPrice = originalPrice;
                            }
                            const discount = originalPrice > displayPrice
                                ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
                                : 0;

                            return (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-xl border border-[#f0f0f0] p-3 flex flex-col gap-2 hover:shadow-sm transition-all group cursor-pointer relative overflow-hidden h-full"
                                    onClick={() => navigate(`/product/${product.id}`)}
                                >
                                    {/* Discount Badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-0 left-0 bg-[#535766] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-xl rounded-br-lg z-10 uppercase tracking-wide">
                                            {discount}% OFF
                                        </div>
                                    )}

                                    {/* Image */}
                                    <div className="w-full h-[120px] flex items-center justify-center mb-1 overflow-hidden">
                                        <img
                                            src={getFrontImage(product) || 'https://placehold.co/400x400/f3f4f6/6b7280?text=No+Image'}
                                            alt={product.name}
                                            className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://placehold.co/400x400/f3f4f6/6b7280?text=No+Image';
                                            }}
                                        />
                                    </div>

                                    {/* Time/Delivery Tag */}
                                    <div className="bg-gray-100 self-start px-1.5 py-0.5 rounded-[4px] mb-1">
                                        <span className="text-[9px] font-bold text-gray-600 uppercase">⏱ 15 MINS</span>
                                    </div>

                                    {/* Product Name */}
                                    <h3 className="text-[13px] font-semibold text-[#1c1c1c] line-clamp-2 leading-[18px] text-left" title={product.name}>
                                        {capitalizeWords(product.name)}
                                    </h3>

                                    {/* Unit/Weight */}
                                    <p className="text-[11px] text-gray-500 font-medium text-left mt-0.5">
                                        {product.unit || product.weight || '1 unit'}
                                    </p>

                                    {/* Footer: Price + Button */}
                                    <div className="mt-auto flex items-center justify-between pt-2">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[13px] font-bold text-[#1c1c1c]">₹{displayPrice}</span>
                                            {originalPrice > displayPrice && (
                                                <span className="text-[11px] text-gray-500 line-through">₹{originalPrice}</span>
                                            )}
                                        </div>

                                        {activeProduct.isOutOfStock ? (
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
                                                    onClick={(e) => { e.stopPropagation(); decreaseQuantity(product.id); }}
                                                    className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center"
                                                >
                                                    -
                                                </button>
                                                <span className="text-white text-[12px] font-bold px-0.5 w-6 text-center">{quantity}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addToCart({ ...activeProduct, price: displayPrice, mrp: originalPrice, originalPrice: originalPrice }); }}
                                                    className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addToCart({ ...activeProduct, price: displayPrice, mrp: originalPrice, originalPrice: originalPrice }); }}
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
                ) : (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-12 h-12 text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No results found</h2>
                        <p className="text-gray-500 mb-8">Try searching for something else or browse categories</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-zipcart-green text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Explore Categories
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;

