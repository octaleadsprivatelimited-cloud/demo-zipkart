import React, { useState, useEffect } from 'react';
import { X, Mail, Gift, Sparkles } from 'lucide-react';

const NewsletterPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Check if user has already seen the popup
        const hasSeenPopup = localStorage.getItem('zipcart_newsletter_popup');

        if (!hasSeenPopup) {
            // Show popup after 5 seconds
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem('zipcart_newsletter_popup', 'true');
        }, 300);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email) {
            // Here you would typically send the email to your backend
            console.log('Newsletter signup:', email);
            setIsSubmitted(true);
            localStorage.setItem('zipcart_newsletter_popup', 'true');

            // Close popup after showing success
            setTimeout(() => {
                setIsClosing(true);
                setTimeout(() => setIsVisible(false), 300);
            }, 2500);
        }
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* Popup */}
            <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[95%] max-w-[480px] transition-all duration-300 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header with gradient */}
                    <div className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 p-8 text-center overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-20">
                            <div className="absolute top-4 left-8 w-16 h-16 bg-white rounded-full blur-xl" />
                            <div className="absolute bottom-4 right-12 w-24 h-24 bg-yellow-300 rounded-full blur-2xl" />
                        </div>

                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                                <Gift className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                Get 10% OFF! 🎉
                            </h2>
                            <p className="text-green-50 text-sm md:text-base">
                                Subscribe to our newsletter and unlock exclusive deals
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8">
                        {!isSubmitted ? (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                    <span className="text-sm text-gray-600">
                                        Plus early access to sales & new arrivals
                                    </span>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email address"
                                            required
                                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-gray-700"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                                    >
                                        Get My 10% Discount
                                    </button>
                                </form>

                                <p className="text-xs text-gray-400 text-center mt-4">
                                    By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">You're In! 🎉</h3>
                                <p className="text-gray-600">
                                    Check your email for your exclusive discount code: <span className="font-bold text-green-600">WELCOME10</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default NewsletterPopup;
