import React from 'react';

const ProductSkeleton = () => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col animate-pulse">
            {/* Image skeleton */}
            <div className="w-full aspect-square bg-gray-200 rounded-lg mb-2"></div>

            {/* Time badge skeleton */}
            <div className="mb-2">
                <div className="bg-gray-200 rounded h-4 w-16"></div>
            </div>

            {/* Title skeleton */}
            <div className="space-y-2 mb-1">
                <div className="bg-gray-200 rounded h-4 w-full"></div>
                <div className="bg-gray-200 rounded h-4 w-3/4"></div>
            </div>

            {/* Weight skeleton */}
            <div className="bg-gray-200 rounded h-3 w-20 mb-3"></div>

            {/* Price and button skeleton */}
            <div className="flex items-center justify-between mt-auto">
                <div className="bg-gray-200 rounded h-5 w-16"></div>
                <div className="bg-gray-200 rounded h-7 w-16"></div>
            </div>
        </div>
    );
};

export default ProductSkeleton;

