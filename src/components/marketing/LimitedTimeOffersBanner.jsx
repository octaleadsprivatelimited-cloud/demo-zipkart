import React, { useState, useEffect } from 'react';
import { Zap, Clock, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LimitedTimeOffersBanner = () => {
    const [timeLeft, setTimeLeft] = useState({
        hours: 5,
        minutes: 30,
        seconds: 0
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { hours, minutes, seconds } = prev;

                if (seconds > 0) {
                    seconds--;
                } else if (minutes > 0) {
                    minutes--;
                    seconds = 59;
                } else if (hours > 0) {
                    hours--;
                    minutes = 59;
                    seconds = 59;
                } else {
                    // Reset timer when it reaches 0
                    hours = 5;
                    minutes = 30;
                    seconds = 0;
                }

                return { hours, minutes, seconds };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatNumber = (num) => num.toString().padStart(2, '0');

    return (
        <section className="py-8">
            <div className="max-w-[1280px] mx-auto px-4">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-1">
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 animate-pulse opacity-50" />

                    <div className="relative bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-[22px] p-6 md:p-8">
                        {/* Sparkle decorations */}
                        <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-300 rounded-full animate-ping" />
                        <div className="absolute bottom-6 right-16 w-2 h-2 bg-white rounded-full animate-ping delay-300" />
                        <div className="absolute top-8 right-32 w-2 h-2 bg-yellow-200 rounded-full animate-ping delay-500" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            {/* Left Content */}
                            <div className="text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
                                    <span className="bg-yellow-400 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                                        Flash Sale
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
                                    MEGA SAVINGS! Up to 50% OFF
                                </h2>
                                <p className="text-pink-100 text-sm md:text-base flex items-center justify-center md:justify-start gap-2">
                                    <ShoppingBag className="w-4 h-4" />
                                    On 500+ products across categories
                                </p>
                            </div>

                            {/* Right Content - Timer & CTA */}
                            <div className="flex flex-col items-center gap-4">
                                {/* Countdown Timer */}
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-white" />
                                    <span className="text-white text-sm font-medium">Ends in:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-white rounded-lg px-3 py-2 min-w-[50px] text-center">
                                        <span className="text-2xl font-black text-red-600">
                                            {formatNumber(timeLeft.hours)}
                                        </span>
                                        <p className="text-[10px] text-gray-600 -mt-1">HRS</p>
                                    </div>
                                    <span className="text-white text-2xl font-bold">:</span>
                                    <div className="bg-white rounded-lg px-3 py-2 min-w-[50px] text-center">
                                        <span className="text-2xl font-black text-red-600">
                                            {formatNumber(timeLeft.minutes)}
                                        </span>
                                        <p className="text-[10px] text-gray-600 -mt-1">MIN</p>
                                    </div>
                                    <span className="text-white text-2xl font-bold">:</span>
                                    <div className="bg-white rounded-lg px-3 py-2 min-w-[50px] text-center">
                                        <span className="text-2xl font-black text-red-600">
                                            {formatNumber(timeLeft.seconds)}
                                        </span>
                                        <p className="text-[10px] text-gray-600 -mt-1">SEC</p>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <Link
                                    to="/category/cat_biscuits_snacks"
                                    className="bg-white hover:bg-yellow-50 text-red-600 font-bold px-8 py-3 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg"
                                >
                                    Shop Now
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LimitedTimeOffersBanner;
