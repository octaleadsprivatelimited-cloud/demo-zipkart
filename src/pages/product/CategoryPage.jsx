import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useSubcategories } from '../../hooks/useSubcategories';
import { useRealTimeStock } from '../../hooks/useRealTimeStock';
import ProductSkeleton from '../../components/common/ProductSkeleton';
import ErrorMessage from '../../components/common/ErrorMessage';
import { capitalizeWords } from '../../utils/capitalize';
import ProductImage from '../../components/product/ProductImage';
import { CategoryImage } from '../../components/product/CategoryGrid';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, decreaseQuantity } = useCart();

  const [selectedSubcategory, setSelectedSubcategory] = React.useState(null);

  // Fetch categories and products from Firestore
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories();
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts(categoryId);

  // Real-time stock listener for category products
  const realtimeStock = useRealTimeStock(products);



  // Find current category
  const currentCategory = categories.find(c =>
    c.id.toString() === categoryId || c.slug === categoryId
  );



  // Fetch subcategories from backend for the current category
  const {
    subcategories: backendSubcategories,
    loading: subcategoriesLoading
  } = useSubcategories(currentCategory?.id);

  // Filter products for this category (already filtered by hook if categoryId provided)
  const categoryProducts = React.useMemo(() => {
    return currentCategory && products
      ? products.filter(p => p.categoryId != null && currentCategory.id != null && p.categoryId.toString() === currentCategory.id.toString())
      : [];
  }, [currentCategory, products]);

  // Reset state when category changes
  const [prevCategoryId, setPrevCategoryId] = React.useState(categoryId);
  if (categoryId !== prevCategoryId) {
    setPrevCategoryId(categoryId);
    setSelectedSubcategory(null);
  }

  // Filter by subcategory if selected
  // Find the selected subcategory object to get its ID for matching
  const selectedSubcategoryObj = backendSubcategories?.find(
    sub => (sub.subcategoryName || sub.name || sub.id) === selectedSubcategory
  );

  const filteredProducts = React.useMemo(() => {
    if (!selectedSubcategory) return categoryProducts;

    return categoryProducts.filter(p => {
      // Match by subcategoryName (the display name)
      if (p.subcategoryName === selectedSubcategory) return true;
      // Fallback: Match by subcategory field if it exists
      if (p.subcategory === selectedSubcategory) return true;
      // Fallback: Match by subcategoryId if we have the subcategory object
      if (selectedSubcategoryObj && p.subcategoryId === selectedSubcategoryObj.id) return true;
      return false;
    });
  }, [categoryProducts, selectedSubcategory, selectedSubcategoryObj]);



  // Scroll to top when category changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryId]);

  // Handle subcategory click
  const handleSubcategoryClick = (subcat) => {
    setSelectedSubcategory(selectedSubcategory === subcat ? null : subcat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show error if categories or products failed to load
  if (categoriesError || productsError) {
    return (
      <ErrorMessage
        message={categoriesError || productsError}
        onRetry={() => {
          if (categoriesError) refetchCategories();
          if (productsError) refetchProducts();
        }}
      />
    );
  }

  // Show loading state
  if (categoriesLoading || productsLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return <div className="p-8 text-center text-gray-500">Category not found</div>;
  }


  return (
    <div className="max-w-[1280px] mx-auto px-4 py-4 flex gap-4 min-h-screen">
      {/* Sidebar - Icon Based Subcategory Navigation */}
      <div className="w-[120px] md:w-[140px] flex-shrink-0 border-r border-gray-200 hidden md:block bg-gray-50 sticky top-24 h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar px-3 py-4">
        {backendSubcategories && backendSubcategories.length > 0 ? (
          <div className="flex flex-col gap-3">
            {/* All Option */}
            <div
              onClick={() => setSelectedSubcategory(null)}
              className={`flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 rounded-xl border shadow-sm group ${!selectedSubcategory
                ? 'bg-white border-green-500 ring-1 ring-green-100 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
            >
              <div className="w-16 h-16 mb-2 rounded-lg p-1 flex items-center justify-center">
                <CategoryImage category={currentCategory} />
              </div>
              <span className={`text-xs text-center leading-tight font-medium ${!selectedSubcategory ? 'text-green-700 font-bold' : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                All
              </span>
            </div>
            {backendSubcategories.map((subcat) => {
              const subcatName = subcat.subcategoryName || subcat.name || subcat.id;
              const isSelected = selectedSubcategory === subcatName;
              // Check for valid image URL (not empty string, null, or undefined)
              return (
                <div
                  key={subcat.id}
                  onClick={() => handleSubcategoryClick(subcatName)}
                  className={`flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 rounded-xl border shadow-sm group ${isSelected
                    ? 'bg-white border-green-500 ring-1 ring-green-100 shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                  <div className="w-16 h-16 mb-2 rounded-lg p-1 flex items-center justify-center">
                    <CategoryImage
                      category={{
                        ...subcat,
                        name: subcatName,
                        image: subcat.image,
                      }}
                    />
                  </div>
                  <span className={`text-xs text-center leading-tight font-medium line-clamp-2 ${isSelected ? 'text-green-700 font-bold' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                    {subcatName}
                  </span>
                </div>
              );
            })}
          </div>
        ) : subcategoriesLoading ? (
          <div className="py-4 flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="py-4 px-2 text-center">
            <span className="text-xs text-gray-400">No subcategories</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Buy {currentCategory.name} Online
            </h2>
            {selectedSubcategory && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-600">Showing:</span>
                <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-md">{selectedSubcategory}</span>
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filter
                </button>
              </div>
            )}
          </div>

        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => {
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
              const quantity = cartItem ? cartItem.quantity : 0;

              // Dynamic price — real-time source map overrides static
              let displayPrice = rtPrice || product.price || product.productPrice || 0;
              const originalPrice = rtMrp || product.originalPrice || (displayPrice > 0 ? Math.round(displayPrice * 1.15) : 0);

              // Fallback: If selling price is 0 but MRP exists, use MRP
              if (displayPrice <= 0 && originalPrice > 0) {
                displayPrice = originalPrice;
              }
              const discountPercent = originalPrice > displayPrice
                ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  className={`min-w-[160px] w-full bg-white border border-[#f0f0f0] rounded-xl p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer relative group h-full ${activeProduct.isOutOfStock ? 'opacity-75' : ''}`}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* Discount Badge */}
                  {discountPercent > 0 && (
                    <div className="absolute top-0 left-0 bg-[#535766] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-xl rounded-br-lg z-10 uppercase tracking-wide">
                      {discountPercent}% OFF
                    </div>
                  )}

                  {/* Image */}
                  <div className="w-full h-[120px] flex items-center justify-center mb-1 overflow-hidden relative">
                    <ProductImage
                      product={product}
                      alt={product.name}
                      className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                    />
                  </div>

                  {/* Time/Delivery Tag */}
                  <div className="bg-gray-100 self-start px-1.5 py-0.5 rounded-[4px] mb-1">
                    <span className="text-[9px] font-bold text-gray-600 uppercase">⏱ 15 MINS</span>
                  </div>

                  {/* Product Name */}
                  <h3 className="text-[13px] font-semibold text-[#1c1c1c] leading-[18px] line-clamp-2 text-left" title={product.name}>
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
                          onClick={(e) => { e.stopPropagation(); decreaseQuantity(product.id); }}
                          className="w-8 h-full text-white hover:bg-[#0b721b] transition-colors text-sm font-extrabold flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-white text-[12px] font-bold px-0.5 w-6 text-center">{quantity}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quantity < stock) {
                              addToCart({ ...activeProduct, price: displayPrice, mrp: originalPrice, originalPrice: originalPrice });
                            } else {
                              alert(`Maximum stock limit reached (${stock} items)`);
                            }
                          }}
                          className={`w-8 h-full text-white transition-colors text-sm font-extrabold flex items-center justify-center ${quantity >= stock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0b721b]'}`}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({ ...activeProduct, price: displayPrice, mrp: originalPrice, originalPrice: originalPrice });
                        }}
                        className="px-4 py-1.5 bg-[#f7fff9] border border-[#0c831f] text-[#0c831f] text-[12px] font-extrabold rounded-lg hover:bg-[#0c831f] hover:text-white transition-colors uppercase tracking-wide h-8 flex items-center justify-center min-w-[64px]"
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-64 h-64 mb-6 relative">
              <img
                src="https://cdn-icons-png.flaticon.com/512/1170/1170678.png"
                alt="Coming Soon"
                className="w-full h-full object-contain opacity-90 drop-shadow-md"
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon!</h3>
            <p className="text-gray-500 font-medium max-w-md mx-auto">
              We are working hard to bring you the best products in this category. Stay tuned for exciting additions!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
