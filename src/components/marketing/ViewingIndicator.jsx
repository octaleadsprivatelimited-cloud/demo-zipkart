import React, { useState, useEffect } from 'react';
import { Eye, Users, TrendingUp } from 'lucide-react';

const ViewingIndicator = ({ productId }) => {
    const [viewerCount, setViewerCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Generate a realistic random viewer count based on product ID
        const baseCount = (productId?.charCodeAt(0) || 5) % 20 + 5;
        const randomVariation = Math.floor(Math.random() * 10);
        const initialCount = baseCount + randomVariation;

        // Delay showing for smooth animation
        setTimeout(() => {
            setViewerCount(initialCount);
            setIsVisible(true);
        }, 500);

        // Simulate viewer count changes
        const interval = setInterval(() => {
            setViewerCount(prev => {
                const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
                const newCount = Math.max(5, Math.min(35, prev + change));
                return newCount;
            });
        }, 8000); // Update every 8 seconds

        return () => clearInterval(interval);
    }, [productId]);

    if (!isVisible) return null;

    return (
        <div className="flex flex-col gap-3">
            {/* Main Viewing Indicator */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 px-4 py-2.5 rounded-xl">
                <div className="relative">
                    <Eye className="w-5 h-5 text-orange-600" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </div>
                <div>
                    <span className="font-bold text-orange-700">{viewerCount} people</span>
                    <span className="text-orange-600 text-sm ml-1">are viewing this right now</span>
                </div>
            </div>

            {/* Purchase Stats */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                        <span className="font-bold">{Math.floor(viewerCount * 2.5)}+</span> bought this week
                    </span>
                </div>

                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
                        Trending Now 🔥
                    </span>
                </div>
            </div>

            {/* Urgency Message */}
            {viewerCount > 15 && (
                <div className="bg-red-100 border border-red-200 px-4 py-2 rounded-lg animate-pulse">
                    <p className="text-sm text-red-700 font-medium">
                        ⚡ High demand! Order soon to avoid delays
                    </p>
                </div>
            )}
        </div>
    );
};

export default ViewingIndicator;
