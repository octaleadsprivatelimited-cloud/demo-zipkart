import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ShoppingCart, ChevronDown, Navigation } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { capitalizeWords } from '../../utils/capitalize';
import { getFrontImage } from '../../utils/imageUtils';

const searchSuggestions = [
    "Search \"milk\"",
    "Search \"chips\"",
    "Search \"butter\"",
    "Search \"paneer\"",
    "Search \"vegetables\"",
    "Search \"chocolate\""
];

const Header = () => {
    const { cartCount, cartTotal, toggleLogin, location, toggleLocation, toggleCart, addToCart, user, logout } = useCart();
    const navigate = useNavigate();
    const { products, loading: productsLoading } = useProducts();
    const [placeholderIndex, setPlaceholderIndex] = React.useState(0);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filteredProducts, setFilteredProducts] = React.useState([]);
    const [isAccountOpen, setIsAccountOpen] = React.useState(false);

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.trim()) {
            const searchLower = term.toLowerCase();
            const results = products.filter(p => {
                // Map Firestore field names to search across multiple fields
                const name = (p.productName || p.name || '').toLowerCase();
                const category = (p.categoryName || p.category || '').toLowerCase();
                const description = (p.productDescription || p.description || '').toLowerCase();
                const subcategory = (p.subcategoryName || '').toLowerCase();

                return name.includes(searchLower) ||
                    category.includes(searchLower) ||
                    description.includes(searchLower) ||
                    subcategory.includes(searchLower);
            });
            setFilteredProducts(results);
        } else {
            setFilteredProducts([]);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
            setSearchTerm('');
        }
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % searchSuggestions.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-[#131921] text-white shadow-md border-b border-[#232f3e] transition-all">
            <div className="max-w-[1280px] mx-auto px-2 md:px-4 h-16 md:h-20 flex items-center gap-2 md:gap-4">
                {/* Logo (Left) */}
                <Link
                    to="/"
                    onClick={() => window.scrollTo(0, 0)}
                    className="flex items-center min-w-fit cursor-pointer hover:opacity-90 transition-opacity"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/images/logos/zipcart-logo.png" alt="Zipcart Logo" className="w-full h-full object-cover" />
                    </div>
                </Link>

                {/* Delivery Location - Hidden on mobile */}
                <div className="hidden lg:flex items-center min-w-fit">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                        onClick={toggleLocation}
                    >
                        <Navigation className="w-5 h-5 text-[#ff9900]" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-white">Delivery in 10 minutes</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-200 truncate max-w-[160px]">
                                    {location.includes('Banjara Hills') ? `Home - ${location}` : location}
                                </span>
                                <ChevronDown className="w-3 h-3 text-gray-200" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar (Center - Takes Max Width) */}
                <div className="flex-1 max-w-[700px] px-1 md:px-2 relative">
                    <div className="relative flex items-center bg-white rounded-lg overflow-hidden h-10 md:h-12 shadow-sm border-2 border-transparent focus-within:border-[#ff9900] transition-colors z-20">
                        <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 absolute left-2 md:left-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearch}
                            onKeyDown={handleKeyDown}
                            placeholder={searchSuggestions[placeholderIndex]}
                            className="w-full py-2 md:py-3 pl-8 md:pl-12 pr-2 md:pr-4 bg-transparent outline-none text-gray-700 placeholder-gray-500 text-xs md:text-sm font-medium transition-all"
                        />
                    </div>
                    {/* Search Results Dropdown */}
                    {searchTerm && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setSearchTerm('')}></div>
                            <div className="absolute top-14 left-8 right-8 bg-white rounded-xl shadow-xl border border-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar z-20 flex flex-col p-2">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.slice(0, 10).map(product => {
                                        // Map Firestore field names for display
                                        const name = capitalizeWords(product.productName || product.name || 'Unnamed Product');
                                        const price = product.productPrice || product.price || 0;
                                        const image = getFrontImage(product);
                                        const weight = product.unit || product.weight || product.productDescription?.substring(0, 30) || '';

                                        return (
                                            <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
                                                <div className="w-12 h-12 bg-gray-50 rounded-md flex items-center justify-center border border-gray-100">
                                                    <img src={image} alt={name} className="w-10 h-10 object-contain" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{name}</h4>
                                                    <span className="text-xs text-gray-500">{weight}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-600 hover:text-white text-xs font-bold px-3 py-1 rounded transition-colors"
                                                    >
                                                        ADD
                                                    </button>
                                                    <span className="text-xs font-bold text-gray-700">₹{price}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : productsLoading ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        <div className="animate-pulse flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-gray-300 border-t-zipcart-green rounded-full animate-spin"></div>
                                            <span>Searching products...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No results found for "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-4 lg:gap-8 min-w-fit font-medium text-gray-800 text-base">

                    {user ? (
                        <div className="relative">
                            <div
                                className="flex items-center gap-1 md:gap-2 cursor-pointer hover:bg-black/5 p-1 md:p-2 rounded-lg transition-colors"
                                onClick={() => setIsAccountOpen(!isAccountOpen)}
                            >
                                <span className="hidden md:block text-sm md:text-[16px] font-bold text-white">Account</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isAccountOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsAccountOpen(false)}></div>
                                    <div className="absolute top-[68px] right-0 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-gray-100 w-[220px] py-6 z-40 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-6 mb-4">
                                            <h3 className="text-[20px] font-bold text-[#111] mb-0.5">My Account</h3>
                                            <p className="text-[13px] font-bold text-gray-500 tracking-wide">{user.phoneNumber || 'Phone Number'}</p>
                                        </div>

                                        <div className="flex flex-col">
                                            <button
                                                onClick={() => {
                                                    navigate('/orders?tab=orders');
                                                    setIsAccountOpen(false);
                                                }}
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-gray-50 transition-colors"
                                            >
                                                My Orders
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate('/orders?tab=addresses');
                                                    setIsAccountOpen(false);
                                                }}
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-gray-50 transition-colors"
                                            >
                                                Saved Addresses
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate('/orders?tab=membership');
                                                    setIsAccountOpen(false);
                                                }}
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-gray-50 transition-colors"
                                            >
                                                My Membership
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate('/orders?tab=faqs');
                                                    setIsAccountOpen(false);
                                                }}
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-gray-50 transition-colors"
                                            >
                                                FAQ's
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigate('/orders?tab=privacy');
                                                    setIsAccountOpen(false);
                                                }}
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-gray-50 transition-colors"
                                            >
                                                Account Privacy
                                            </button>
                                            <button
                                                className="px-6 py-2.5 text-left text-[15px] font-bold text-[#3d4152] hover:bg-red-50 hover:text-red-500 transition-colors mt-1"
                                                onClick={() => {
                                                    logout();
                                                    setIsAccountOpen(false);
                                                }}
                                            >
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={toggleLogin}
                            className="text-sm md:text-[18px] font-medium text-white hover:text-[#ff9900] transition-colors"
                        >
                            Login
                        </button>
                    )}

                    {cartCount === 0 ? (
                        <button
                            onClick={toggleCart}
                            className="bg-[#ff9900] text-[#0f1111] px-3 md:px-5 py-2 md:py-2.5 rounded-lg flex items-center gap-2 md:gap-3 shadow-md hover:bg-[#e47911] transition-all active:scale-95"
                        >
                            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                            <div className="hidden md:flex flex-col items-start leading-tight">
                                <span className="text-sm font-bold">My Cart</span>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={toggleCart}
                            className="bg-[#ff9900] text-[#0f1111] px-3 md:px-5 py-2 md:py-2.5 rounded-lg flex items-center gap-2 md:gap-3 shadow-md hover:bg-[#e47911] transition-all active:scale-95"
                        >
                            <ShoppingCart className="w-5 h-5 md:w-7 md:h-7" />
                            <div className="flex flex-col items-start leading-none gap-0.5">
                                <span className="text-xs md:text-sm font-bold">{cartCount} items</span>
                                <span className="text-xs md:text-sm font-bold">₹{cartTotal}</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
