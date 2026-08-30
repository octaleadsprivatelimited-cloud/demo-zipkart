import React, { useState } from 'react';
import { Smartphone, Check, QrCode, ArrowRight } from 'lucide-react';
import ComingSoonModal from '../modals/ComingSoonModal';

const AppDownloadPromo = () => {
    const [showComingSoon, setShowComingSoon] = useState(false);
    const features = [
        'Exclusive app-only discounts',
        'Faster checkout experience',
        'Real-time order tracking',
        'Save addresses & payment methods',
        'Push notifications for deals'
    ];

    return (
        <section className="py-16 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-12">
                    {/* Left Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <span className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                            <Smartphone className="w-4 h-4" />
                            Download Our App
                        </span>

                        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                            Get the ZIPCART App
                            <span className="block text-yellow-300">& Save More!</span>
                        </h2>

                        <p className="text-green-100 text-lg mb-8 max-w-lg">
                            Enjoy the fastest grocery shopping experience on your mobile. Download now and start saving with exclusive app-only deals!
                        </p>

                        {/* Features List */}
                        <ul className="space-y-3 mb-8">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-4 h-4 text-green-800" />
                                    </div>
                                    <span className="text-white font-medium">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* App Store Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button
                                type="button"
                                onClick={() => setShowComingSoon(true)}
                                className="transform hover:scale-105 transition-transform"
                            >
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                                    alt="Download on App Store"
                                    className="h-14"
                                />
                            </button>
                            <a
                                href="https://play.google.com/store/apps/details?id=com.zipcart.userapp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transform hover:scale-105 transition-transform"
                            >
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                                    alt="Get it on Google Play"
                                    className="h-14"
                                />
                            </a>
                        </div>


                    </div>

                    {/* Right Content - Phone Mockup */}
                    <div className="flex-1 relative">
                        <div className="relative max-w-[320px] mx-auto">
                            {/* Phone Frame */}
                            <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl transform hover:rotate-3 transition-transform duration-500">
                                <div className="bg-gray-800 rounded-[2.5rem] p-1">
                                    {/* Notch */}
                                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full" />

                                    {/* Screen */}
                                    <div className="bg-white rounded-[2.3rem] overflow-hidden h-[500px]">
                                        {/* App Screenshot Placeholder */}
                                        <div className="h-full bg-gradient-to-b from-yellow-400 to-yellow-300 p-4 pt-10">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                                                    <img src="/images/logos/zipcart-logo.png" alt="ZIPCART" className="w-10 h-10 rounded-full" />
                                                </div>
                                                <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full">
                                                    <span className="text-xs font-bold text-gray-700">📍 KPHB 7th Phase</span>
                                                </div>
                                            </div>

                                            {/* Search Bar */}
                                            <div className="bg-white rounded-xl px-4 py-3 mb-4 shadow-sm">
                                                <span className="text-gray-400 text-sm">Search "vegetables"</span>
                                            </div>

                                            {/* Category Grid */}
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                {['🥛', '🍞', '🥚', '🍎'].map((emoji, i) => (
                                                    <div key={i} className="bg-white rounded-xl p-3 text-center shadow-sm">
                                                        <span className="text-2xl">{emoji}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Products */}
                                            <div className="bg-white rounded-xl p-3 shadow-sm">
                                                <div className="flex gap-3">
                                                    <div className="w-16 h-16 bg-green-50 rounded-lg" />
                                                    <div className="flex-1">
                                                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                                                        <div className="h-2 bg-gray-100 rounded w-1/2 mb-2" />
                                                        <div className="h-4 bg-green-500 rounded w-16" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code Card
                            <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-2xl shadow-xl transform rotate-6 hover:rotate-0 transition-transform">
                                <QrCode className="w-20 h-20 text-gray-800" />
                                <p className="text-xs font-bold text-center text-gray-600 mt-2">Scan to Download</p>
                            </div> */}


                        </div>
                    </div>
                </div>
            </div>
            <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} />
        </section>
    );
};

export default AppDownloadPromo;
