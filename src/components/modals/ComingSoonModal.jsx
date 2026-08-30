import React from 'react';
import { X, Rocket, Sparkles } from 'lucide-react';

const ComingSoonModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full relative overflow-hidden transform transition-all scale-100 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white rounded-full p-1 z-20 transition-all backdrop-blur-md"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="relative pt-20 pb-8 px-6 sm:px-8 text-center">
                    {/* Floating Icon */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-xl z-10 border-4 border-white">
                        <Rocket className="w-10 h-10 sm:w-12 sm:h-12 text-transparent fill-purple-600 animate-bounce" style={{ filter: 'drop-shadow(0 4px 6px rgba(124, 58, 237, 0.3))' }} />
                    </div>

                    <div className="mt-12 sm:mt-14 space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Coming Soon!
                        </h2>

                        <div className="space-y-3 text-gray-600">
                            <p className="font-semibold text-lg text-gray-800">
                                The ZIPCART app is launching soon!
                            </p>
                            <p className="text-sm leading-relaxed text-gray-500">
                                We’re preparing a brand new mobile experience for faster grocery shopping, app-only offers, and real-time delivery tracking. Download the app soon to shop smarter and save more.
                            </p>

                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mt-6 border border-purple-100">
                                <p className="text-sm text-purple-700 font-bold flex items-center justify-center gap-2">
                                    <Sparkles className="w-4 h-4 fill-purple-700" />
                                    App launch coming very soon 🚀
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComingSoonModal;
