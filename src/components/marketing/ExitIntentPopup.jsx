import React, { useState, useEffect } from 'react';
import { X, Gift, ArrowRight } from 'lucide-react';

const ExitIntentPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Check if already shown this session
        const hasShownExitPopup = sessionStorage.getItem('zipcart_exit_popup');

        if (hasShownExitPopup) return;

        const handleMouseLeave = (e) => {
            // Only trigger when mouse leaves from top of viewport
            if (e.clientY <= 0) {
                setIsVisible(true);
                sessionStorage.setItem('zipcart_exit_popup', 'true');
                // Remove listener after showing
                document.removeEventListener('mouseleave', handleMouseLeave);
            }
        };

        // Add delay before enabling exit intent
        const timer = setTimeout(() => {
            document.addEventListener('mouseleave', handleMouseLeave);
        }, 3000);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
        }, 300);
    };

    const handleClaim = () => {
        // Copy coupon code
        navigator.clipboard.writeText('DONTGO15');
        alert('Coupon code DONTGO15 copied to clipboard!');
        handleClose();
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* Popup */}
            <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[95%] max-w-[500px] transition-all duration-300 ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
                <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-3xl overflow-hidden shadow-2xl p-1">
                    <div className="bg-white rounded-[22px] overflow-hidden">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>

                        {/* Content */}
                        <div className="p-8 text-center">
                            {/* Animated emoji */}
                            <div className="text-6xl mb-4 animate-bounce">😢</div>

                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                                Wait! Don't Leave Yet!
                            </h2>

                            <p className="text-gray-600 mb-6">
                                We hate to see you go! Here's an exclusive discount just for you.
                            </p>

                            {/* Coupon Box */}
                            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-dashed border-orange-400 rounded-xl p-5 mb-6">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Gift className="w-6 h-6 text-orange-600" />
                                    <span className="text-lg font-bold text-orange-600">SPECIAL OFFER</span>
                                </div>
                                <div className="text-4xl font-black text-gray-800 mb-1">
                                    15% OFF
                                </div>
                                <div className="text-sm text-gray-600">
                                    Use code: <span className="font-bold text-orange-600 bg-orange-200 px-2 py-0.5 rounded">DONTGO15</span>
                                </div>
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleClaim}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                Claim My Discount
                                <ArrowRight className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleClose}
                                className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                No thanks, I'll pay full price
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExitIntentPopup;
