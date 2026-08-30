import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, Send, Check } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import ComingSoonModal from '../modals/ComingSoonModal';

const Footer = () => {
    const { categories, loading: categoriesLoading } = useCategories();
    const [isExpanded, setIsExpanded] = useState(false);
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState(false);

    // Show top 15 categories by default (fits nicely in 3 columns)
    const displayedCategories = isExpanded ? categories : categories.slice(0, 15);

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        if (email) {
            console.log('Newsletter signup:', email);
            setIsSubscribed(true);
            setEmail('');
            // Reset after 3 seconds
            setTimeout(() => setIsSubscribed(false), 3000);
        }
    };

    return (
        <footer className="bg-white mt-12 border-t border-gray-100 pb-12">
            {/* Newsletter Section */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 py-10">
                <div className="max-w-[1280px] mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-bold text-white mb-2">
                                Stay Updated with ZIPCART
                            </h3>
                            <p className="text-green-100">
                                Subscribe for exclusive deals, new arrivals & special offers
                            </p>
                        </div>

                        <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:min-w-[300px]">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700"
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {isSubscribed ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Subscribed!
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Subscribe
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="max-w-[1280px] mx-auto px-4">
                {/* Top Section */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-y-12 gap-x-8 py-12">
                    <div className="flex flex-col gap-4 md:col-span-2">
                        <h3 className="font-bold text-gray-800 text-lg">Useful Links</h3>
                        <div className="grid grid-cols-2 gap-y-2.5 text-gray-600 text-[14px]">
                            <Link to="/about" className="hover:text-gray-900">About</Link>
                            <Link to="/privacy" className="hover:text-gray-900">Privacy</Link>
                            <Link to="/faqs" className="hover:text-gray-900">FAQs</Link>
                            <Link to="/terms" className="hover:text-gray-900">Terms</Link>
                            <Link to="/security" className="hover:text-gray-900">Security</Link>
                            <Link to="/contact" className="hover:text-gray-900">Contact</Link>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 md:col-span-3">
                        <h3 className="font-bold text-gray-800 text-lg max-w-fit flex items-center">
                            Categories
                            <span
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[#0c831f] font-normal text-sm cursor-pointer ml-3 hover:underline select-none"
                            >
                                {isExpanded ? 'see less' : 'see all'}
                            </span>
                        </h3>
                        {categoriesLoading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-2.5 text-gray-600 text-[14px]">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className="h-5 bg-gray-200 rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-2.5 text-gray-600 text-[14px]">
                                {displayedCategories.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        to={`/category/${cat.slug || cat.id}`}
                                        className="hover:text-gray-900"
                                    >
                                        {cat.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-100 gap-6">
                    {/* Social Links - Left */}
                    <div className="flex items-center gap-3">
                        <a href="https://www.facebook.com/share/1Gn7xXfu2g/" target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                            <Facebook className="w-5 h-5" />
                        </a>
                        <a href="https://x.com/zipcart_grocery" target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white p-2 rounded-full cursor-pointer hover:bg-sky-500 transition-colors">
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a href="https://www.instagram.com/zipcart_groceries/" target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white p-2 rounded-full cursor-pointer hover:bg-pink-600 transition-colors">
                            <Instagram className="w-5 h-5" />
                        </a>
                    </div>

                    {/* Copyright & Logo - Middle */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                            <img src="/images/logos/zipcart-logo.png" alt="Zipcart" className="w-8 h-8 rounded-full object-cover" />
                            <span className="font-semibold text-gray-600">Fast and Fresh Delivery</span>
                        </div>
                        <p className="text-gray-500 text-sm text-center">
                            Copyright reserved to Zipcart Groceries Pvt Ltd
                        </p>
                    </div>

                    {/* Download App - Right */}
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700">Download App</span>
                        <button
                            type="button"
                            onClick={() => setShowComingSoon(true)}
                            className="transform hover:scale-105 transition-transform"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
                        </button>
                        <a href="https://play.google.com/store/apps/details?id=com.zipcart.userapp" target="_blank" rel="noopener noreferrer">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
                        </a>
                    </div>
                </div>
            </div>
            <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} />
        </footer>
    );
};

export default Footer;
