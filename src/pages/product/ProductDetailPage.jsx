import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Star, Minus, Plus, Heart, Share2, Truck, Shield, Timer, ChevronRight } from 'lucide-react';
import { getProductById, getProductsByCategory } from '../../services/firestoreService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { capitalizeWords } from '../../utils/capitalize';
import { getFrontImage, getProductImages } from '../../utils/imageUtils';
import { ViewingIndicator } from '../../components/marketing';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';

const ProductDetailPage = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { addToCart, cartItems, updateQuantity } = useCart();
    const [product, setProduct] = useState(null);
    const [recommendedProducts, setRecommendedProducts] = useState([]);

    // --- REAL-TIME STOCK ---
    // Monitor main product
    const productList = product ? [product] : [];
    const rtProduct = useRealTimeStock(productList);

    // Monitor recommended products
    const rtRecommended = useRealTimeStock(recommendedProducts);

    // Derived State for Main Product
    const activeProduct = product ? (() => {
        const rt = rtProduct[product.id];
        let isOutOfStock = product.isOutOfStock;
        let stock = product.stock;
        let rtPrice = null;
        let rtMrp = null;

        if (rt) {
            stock = rt.stock;
            isOutOfStock = rt.isOutOfStock;
            if (rt.price > 0) rtPrice = rt.price;
            if (rt.mrp > 0) rtMrp = rt.mrp;
        }
        const finalPrice = rtPrice || product.price || 0;
        return { ...product, isOutOfStock, stock, price: finalPrice, rtPrice, rtMrp };
    })() : null;
    // -----------------------
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const loadProduct = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await getProductById(productId);
            setProduct(data);
            
            // Show product immediately while recommendations load in background
            setLoading(false);

            // Load recommended products from same category with a LIMIT for speed
            if (data.categoryId) {
                // Fetch 7 items so we can filter out current product and still have 6
                const recommended = await getProductsByCategory(data.categoryId, 7);
                setRecommendedProducts(recommended.filter(p => p.id !== productId).slice(0, 6));
            }
        } catch (error) {
            console.error('Error loading product:', error);
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        window.scrollTo(0, 0);
        loadProduct();
    }, [productId, loadProduct]);

    const cartItem = cartItems.find(item => item.id === productId);
    const quantity = cartItem?.quantity || 0;

    const handleAddToCart = (e, p = activeProduct) => {
        if (e) e.stopPropagation();
        if (p) {
            // Always pass the real-time price to the cart
            const cartProduct = {
                ...p,
                price: p.price || price || 0,
                mrp: p.rtMrp || p.originalPrice || originalPrice || 0,
                originalPrice: p.rtMrp || p.originalPrice || originalPrice || 0,
            };
            addToCart(cartProduct);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-[#111] mb-4 font-roboto">Product Not Found</h2>
                    <p className="text-gray-500 font-medium mb-8 font-roboto">The product you're looking for doesn't exist</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-[#0c831f] hover:bg-green-700 text-white font-bold py-4 px-10 rounded-2xl transition-all font-roboto"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    // Mapping fields — real-time price from sku_source_map overrides static
    const name = capitalizeWords(product.productName || product.name || 'Unnamed Product');

    // Priority: Real-time price > Normalized product price
    let price = activeProduct?.rtPrice || product.price || 0;
    const originalPrice = activeProduct?.rtMrp || product.originalPrice || (price > 0 ? Math.round(price * 1.11) : 0);

    // Final safety fallback
    if (price <= 0 && originalPrice > 0) {
        price = originalPrice;
    }
    const weight = product.unit || product.weight || product.productDescription?.substring(0, 20) || '1 unit';
    const description = product.description || product.productDescription || `${name} is fresh and high quality. Perfect for your daily needs.`;

    // Get priority-ordered images (front, back, detailed) - Blinkit style
    const productImages = getProductImages(product);

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1100px] mx-auto pt-4 pb-16 px-4">
                {/* Product Detail Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                    {/* Left Column - Product Images */}
                    <div className="space-y-4">
                        <div className="bg-white border border-gray-100 rounded-[24px] p-8 relative shadow-sm h-[420px] flex items-center justify-center">
                            <img
                                src={productImages[selectedImage]}
                                alt={name}
                                className="max-w-full max-h-full object-contain"
                            />

                            <div className="absolute top-6 right-6 flex flex-col gap-4">
                                <button
                                    onClick={() => setIsFavorite(!isFavorite)}
                                    className={`w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center transition-all bg-white shadow-sm ${isFavorite ? 'text-red-500 border-red-100' : 'text-gray-400'}`}
                                >
                                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                </button>
                                <button className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 bg-white shadow-sm">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            {productImages.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(index)}
                                    className={`w-24 h-24 bg-white rounded-2xl border-2 transition-all p-3 flex items-center justify-center ${selectedImage === index ? 'border-[#0c831f]' : 'border-gray-50'}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>

                        {/* Product Details Dropdown - Desktop */}
                        <div className="mt-8 hidden lg:block">
                            <button
                                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                className="w-full flex items-center justify-between py-4 border-b border-gray-100 group"
                            >
                                <h3 className="text-[18px] font-bold text-[#111] font-roboto">Product Details</h3>
                                <div className={`transition-transform duration-300 ${isDetailsOpen ? 'rotate-180' : ''}`}>
                                    <Plus className={`w-5 h-5 ${isDetailsOpen ? 'hidden' : 'block'} text-gray-400`} />
                                    <Minus className={`w-5 h-5 ${isDetailsOpen ? 'block' : 'hidden'} text-gray-400`} />
                                </div>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ${isDetailsOpen ? 'max-h-[2000px] py-6' : 'max-h-0'}`}>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Key Features</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.keyFeatures || 'Zero Maida. Rich in Dietary Fibre. No Artificial Colours. No Chemical Preservatives'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Description</h4>
                                        <p className="text-[13px] text-gray-600 leading-relaxed font-roboto">{description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4">
                                        <div>
                                            <h4 className="text-[14px] font-semibold text-[#111] mb-1 font-roboto">Unit</h4>
                                            <p className="text-[13px] text-gray-600 font-roboto">{weight}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-semibold text-[#111] mb-1 font-roboto">Shelf Life</h4>
                                            <p className="text-[13px] text-gray-600 font-roboto">{product.shelfLife || '6 days'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-semibold text-[#111] mb-1 font-roboto">FSSAI License</h4>
                                            <p className="text-[13px] text-gray-600 font-roboto">{product.fssaiLicense || '10017022006968'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[14px] font-semibold text-[#111] mb-1 font-roboto">Country of Origin</h4>
                                            <p className="text-[13px] text-gray-600 font-roboto">{product.countryOfOrigin || 'India'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Allergen Information</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.allergenInfo || 'Contains Wheat May Contain Soy, Milk, Nuts'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Taste Profile</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.tasteProfile || 'Savory'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Customer Care Details</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.customerCare || 'zipcart9@gmail.com'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Manufacturer's Name and Address</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.manufacturerDetails || 'Theobroma Foods Pvt Ltd, 32/33A, Deonar Village Road, Near Metal Box company, Deonar Village, Mumbai, Maharashtra, India, 400088'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Return Policy</h4>
                                        <p className="text-[13px] text-gray-600 font-roboto">{product.returnPolicy || 'Only Replacement of the item is permitted, within 72 hours of purchase, if it is found to be of poor quality, damaged or incorrect.'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-2 font-roboto">Disclaimer</h4>
                                        <p className="text-[12px] text-gray-400 leading-relaxed font-roboto">Every effort is made to maintain accuracy of all information. However, actual product packaging and materials may contain more and/or different information. It is recommended not to solely rely on the information presented.</p>
                                    </div>

                                    {/* Nutrition Info */}
                                    <div className="pt-4 border-t border-gray-50">
                                        <h4 className="text-[14px] font-semibold text-[#111] mb-4 font-roboto">Nutritional Values (Per 100g)</h4>
                                        <div className="space-y-2">
                                            {[
                                                { label: 'Energy', val: '245 kcal' },
                                                { label: 'Protein', val: '6.8 g' },
                                                { label: 'Carbohydrates', val: '37 g' },
                                                { label: 'Total Fat', val: '3.2 g' },
                                                { label: 'Dietary Fiber', val: '6.1 g' }
                                            ].map((n, i) => (
                                                <div key={i} className="flex justify-between text-[13px] py-1 border-b border-gray-50 last:border-0">
                                                    <span className="text-gray-500 font-roboto">{n.label}</span>
                                                    <span className="text-[#111] font-medium font-roboto">{n.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Product Info */}
                    <div className="flex flex-col">
                        <div className="mb-0">
                            <span className="text-[11px] text-gray-400 uppercase tracking-[0.15em] mb-3 block font-roboto">
                                Home / {product.categoryName || 'Grocery'} / {name}
                            </span>
                            <h1 className="text-[24px] font-bold text-[#111] leading-tight mb-2 font-roboto">{name}</h1>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-lg">
                                    <Timer className="w-4 h-4 text-[#111]" />
                                    <span className="text-[12px] font-medium text-[#111] font-roboto">15 MINS</span>
                                </div>
                                <span className="text-[14px] text-gray-500 font-roboto">{weight}</span>
                            </div>
                        </div>

                        <div className="h-[1px] bg-gray-100 w-full mb-8"></div>

                        <div className="mb-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[24px] font-bold text-[#111] font-roboto">₹{price}</span>
                                    {originalPrice > price && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 line-through font-bold text-[16px] font-roboto">₹{originalPrice}</span>
                                            <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-roboto">
                                                {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[12px] font-bold text-gray-400 ml-auto font-roboto">(Inclusive of all taxes)</span>
                            </div>

                            {activeProduct.isOutOfStock ? (
                                <button
                                    disabled
                                    className="w-full bg-gray-50 text-gray-400 font-bold py-4 rounded-[16px] flex items-center justify-center gap-2 text-[16px] cursor-not-allowed border border-gray-100"
                                >
                                    OUT OF STOCK
                                </button>
                            ) : quantity === 0 ? (
                                <button
                                    onClick={() => handleAddToCart(null, activeProduct)}
                                    className="w-full bg-[#0c831f] hover:bg-green-700 text-white font-bold py-4 rounded-[16px] transition-all flex items-center justify-center gap-2 text-[16px] shadow-lg shadow-green-100 font-roboto"
                                >
                                    ADD TO CART
                                </button>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-[#0c831f] rounded-[20px] flex items-center justify-between h-14 overflow-hidden shadow-xl shadow-green-100">
                                        <button
                                            onClick={() => updateQuantity(productId, -1)}
                                            className="px-6 h-full text-white hover:bg-green-700 transition-colors text-xl font-bold"
                                        >
                                            -
                                        </button>
                                        <span className="text-white text-lg font-bold">{quantity}</span>
                                        <button
                                            onClick={() => handleAddToCart(null, activeProduct)}
                                            className="px-6 h-full text-white hover:bg-green-700 transition-colors text-xl font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => navigate('/checkout')}
                                        className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-[20px] text-[16px] transition-all font-roboto"
                                    >
                                        CHECKOUT
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Social Proof - Viewing Indicator */}
                        <div className="mb-6">
                            <ViewingIndicator productId={productId} />
                        </div>

                        {/* Product Highlights */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                                { icon: Truck, title: 'Superfast Delivery', desc: 'In 15 mins' },
                                { icon: Shield, title: 'Safe & Hygienic', desc: 'Secure packing' },
                                { icon: Star, title: 'Top Rated', desc: 'Genuine products' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-[20px]">
                                    <item.icon className="w-5 h-5 text-[#111] mb-1.5" />
                                    <p className="text-[11px] font-bold text-[#111] mb-0.5 font-roboto">{item.title}</p>
                                    <p className="text-[9px] font-bold text-gray-400 font-roboto">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Product Details Dropdown - Mobile */}
                        <div className="mt-4 lg:hidden">
                            <button
                                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                className="w-full flex items-center justify-between py-4 border-b border-gray-100"
                            >
                                <h3 className="text-[16px] font-bold text-[#111] font-roboto">Product Details</h3>
                                <Plus className={`w-4 h-4 ${isDetailsOpen ? 'hidden' : 'block'} text-gray-400`} />
                                <Minus className={`w-4 h-4 ${isDetailsOpen ? 'block' : 'hidden'} text-gray-400`} />
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ${isDetailsOpen ? 'max-h-[2000px] py-4' : 'max-h-0'}`}>
                                <div className="space-y-4">
                                    {/* Same content as desktop but slightly more compact for mobile */}
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#111] mb-1 font-roboto">Key Features</h4>
                                        <p className="text-[12px] font-medium text-gray-600 font-roboto">{product.keyFeatures || 'Zero Maida. Rich in Dietary Fibre. No Artificial Colours.'}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#111] mb-1 font-roboto">Description</h4>
                                        <p className="text-[12px] font-medium text-gray-600 leading-relaxed font-roboto">{description}</p>
                                    </div>
                                    {/* Mobile detail grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-[12px] font-bold text-[#111] font-roboto">Unit</h4>
                                            <p className="text-[12px] font-medium text-gray-600 font-roboto">{weight}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[12px] font-bold text-[#111] font-roboto">Shelf Life</h4>
                                            <p className="text-[12px] font-medium text-gray-600 font-roboto">{product.shelfLife || '6 days'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommended Products */}
                {recommendedProducts.length > 0 && (
                    <div className="mt-16">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[22px] font-bold text-[#111] font-roboto">You may also like</h2>
                            <button className="text-[#0c831f] font-bold text-[15px] flex items-center gap-1 hover:opacity-70 transition-opacity font-roboto">
                                View all <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-5 pb-4 snap-x snap-mandatory overflow-y-hidden custom-scrollbar">
                            {recommendedProducts.map((rec) => {
                                // --- REAL-TIME RECOMMENDED STOCK & PRICING ---
                                let recIsOutOfStock = rec.isOutOfStock;
                                let recStock = rec.stock;
                                let recRtPrice = null;
                                let recRtMrp = null;

                                if (rtRecommended[rec.id]) {
                                    const rt = rtRecommended[rec.id];
                                    if (rt) {
                                        recStock = rt.stock;
                                        recIsOutOfStock = rt.isOutOfStock;
                                        if (rt.price > 0) recRtPrice = rt.price;
                                        if (rt.mrp > 0) recRtMrp = rt.mrp;
                                    }
                                }
                                const activeRec = { ...rec, isOutOfStock: recIsOutOfStock, stock: recStock };
                                // ---------------------------------------------

                                const recItem = cartItems.find(item => item.id === rec.id);
                                const recQty = recItem?.quantity || 0;
                                const recName = capitalizeWords(rec.productName || rec.name || 'Unnamed');
                                const recImage = getFrontImage(rec);

                                // Dynamic price — real-time source map overrides static
                                let recPrice = recRtPrice || rec.productPrice || rec.price || 0;
                                const recOriginalPrice = recRtMrp || rec.originalPrice || 0;

                                // Fallback: If selling price is 0 but MRP exists, use MRP
                                if (recPrice <= 0 && recOriginalPrice > 0) {
                                    recPrice = recOriginalPrice;
                                }
                                const recDiscount = recOriginalPrice > recPrice
                                    ? Math.round(((recOriginalPrice - recPrice) / recOriginalPrice) * 100)
                                    : 0;

                                return (
                                    <div
                                        key={rec.id}
                                        onClick={() => navigate(`/product/${rec.id}`)}
                                        className="min-w-[160px] w-[160px] flex-none bg-white border border-[#f0f0f0] rounded-xl p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer relative group snap-start"
                                    >
                                        {/* Discount Badge */}
                                        {recDiscount > 0 && (
                                            <div className="absolute top-0 left-0 bg-[#535766] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-xl rounded-br-lg z-10 uppercase tracking-wide">
                                                {recDiscount}% OFF
                                            </div>
                                        )}

                                        <div className="w-full h-[120px] flex items-center justify-center mb-1 overflow-hidden">
                                            <img src={recImage} alt={recName} className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${activeRec.isOutOfStock ? 'grayscale opacity-60' : ''}`} />
                                        </div>

                                        <div className="bg-gray-100 self-start px-1.5 py-0.5 rounded-[4px] mb-1">
                                            <span className="text-[9px] font-bold text-gray-600 uppercase">⏱ 15 MINS</span>
                                        </div>

                                        <h3 className="text-[13px] font-semibold text-[#1c1c1c] leading-[18px] line-clamp-2 text-left" title={recName}>
                                            {recName}
                                        </h3>

                                        <p className="text-[11px] text-gray-500 font-medium text-left mt-0.5">
                                            {rec.unit || rec.weight || '1 unit'}
                                        </p>

                                        <div className="mt-auto flex items-center justify-between pt-2">
                                            <div className="flex flex-col items-start">
                                                <span className="text-[13px] font-bold text-[#1c1c1c]">₹{recPrice}</span>
                                                {recOriginalPrice > recPrice && (
                                                    <span className="text-[11px] text-gray-500 line-through">₹{recOriginalPrice}</span>
                                                )}
                                            </div>

                                            {activeRec.isOutOfStock ? (
                                                <button
                                                    disabled
                                                    className="w-full h-8 bg-gray-50 border border-gray-100 text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-wide flex items-center justify-center cursor-not-allowed"
                                                >
                                                    OUT OF STOCK
                                                </button>
                                            ) : recQty > 0 ? (
                                                <div
                                                    className="flex items-center bg-[#0c831f] rounded-lg overflow-hidden h-8 shadow-sm border border-[#0c831f]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button onClick={() => updateQuantity(rec.id, -1)} className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center">-</button>
                                                    <span className="text-white text-[12px] font-bold px-0.5 w-6 text-center">{recQty}</span>
                                                    <button onClick={() => addToCart({ ...activeRec, price: recPrice })} className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center">+</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleAddToCart(e, { ...activeRec, price: recPrice })}
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
                )}
            </div>
        </div>
    );
};

export default ProductDetailPage;


