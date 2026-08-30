import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import LoadingSpinner from '../common/LoadingSpinner';

const CATEGORY_SPRITE_INDEX = {
    'atta, flours & sooji': 0,
    'baby care': 1,
    'bakery products': 2,
    'bath & body': 3,
    'beauty & cosmetics': 4,
    'beverages': 5,
    'biscuits, snacks & namkeens': 6,
    'chicken, meat & fish': 7,
    'cleaning & household': 8,
    'dairy, bread & eggs': 9,
    'dals & pulses': 10,
    'dry fruits': 11,
    'e-gifts store': 12,
    'earphones & headsets': 13,
    'edible oils & ghee': 14,
    'fashion store': 15,
};

const CATEGORY_SPRITE_2_INDEX = {
    'feminine hygiene': 0,
    'vegetables & fruits': 1,
    'hair': 2,
    'hair styling': 3,
    'health & pharma': 4,
    'home appliances': 5,
    'ice creams': 6,
    'indoor plants': 7,
    'juicers & mixers': 8,
    'kitchen appliances': 9,
    'oats & vermicelli': 10,
    'paan corner': 11,
    'pet store': 12,
    'pharma store': 13,
    'pickles & podis': 14,
    'pooja store': 15,
};

const CATEGORY_SPRITE_3_INDEX = {
    'powerbanks & chargers': 0,
    'ready to cook & eat': 1,
    'rice & rice products': 2,
    'sexual wellness': 3,
    'skin & face': 4,
    'sports store': 5,
    'spreads, sauce & ketchup': 6,
    'stationery store': 7,
    'sugar & spices': 8,
    'sweets & chocolates': 9,
    'toy store': 10,
    'trimmers': 11,
};

const getCategoryHue = (value = '') => [...value].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 360, 91);

const getCategorySymbol = (name = '') => {
    const value = name.toLowerCase();
    const matches = [
        [['milk', 'dairy', 'curd'], '🥛'], [['bread', 'bakery'], '🍞'], [['fruit', 'vegetable'], '🥬'],
        [['snack', 'biscuit', 'namkeen'], '🍪'], [['drink', 'beverage', 'juice'], '🥤'],
        [['beauty', 'skin', 'cosmetic'], '💄'], [['hair'], '💇'], [['baby'], '🍼'],
        [['clean', 'household'], '🧹'], [['rice', 'atta', 'flour', 'grain'], '🌾'],
        [['chocolate', 'sweet'], '🍫'], [['pet'], '🐾'], [['health', 'pharma'], '💊'],
        [['electronic', 'charger', 'headphone', 'appliance'], '🔌'], [['toy'], '🧸'],
    ];
    return matches.find(([words]) => words.some(word => value.includes(word)))?.[1] || '🛍️';
};

export const CategoryImage = ({ category }) => {
    const [failed, setFailed] = useState(false);
    const categoryName = category.name?.trim().toLowerCase() || '';
    const spriteMatch = CATEGORY_SPRITE_INDEX[categoryName] !== undefined
        ? { index: CATEGORY_SPRITE_INDEX[categoryName], file: 'category-sprite.png' }
        : CATEGORY_SPRITE_2_INDEX[categoryName] !== undefined
            ? { index: CATEGORY_SPRITE_2_INDEX[categoryName], file: 'category-sprite-2.png' }
            : CATEGORY_SPRITE_3_INDEX[categoryName] !== undefined
                ? { index: CATEGORY_SPRITE_3_INDEX[categoryName], file: 'category-sprite-3.png' }
                : null;
    const isPlaceholder = !category.image || category.image.includes('placehold.co');
    const useSprite = spriteMatch && (isPlaceholder || failed);

    if (useSprite) {
        const spriteIndex = spriteMatch.index;
        const column = spriteIndex % 4;
        const row = Math.floor(spriteIndex / 4);

        return (
            <div
                role="img"
                aria-label={category.name}
                className="relative w-full h-full overflow-hidden transition-transform duration-300 hover:scale-110"
            >
                <img
                    src={`/images/categories/${spriteMatch.file}`}
                    alt=""
                    loading="eager"
                    className="absolute max-w-none max-h-none"
                    style={{
                        width: '400%',
                        height: '400%',
                        left: `${column * -100}%`,
                        top: `${row * -100}%`,
                    }}
                />
            </div>
        );
    }

    if (category.image && !isPlaceholder && !failed) {
        return (
            <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                onError={() => setFailed(true)}
                className="w-full h-full object-contain mix-blend-multiply hover:scale-110 transition-transform duration-300 contrast-[1.03] brightness-[1.02]"
            />
        );
    }

    const hue = getCategoryHue(categoryName);
    return (
        <div
            role="img"
            aria-label={category.name}
            className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl p-1 text-center"
            style={{ background: `linear-gradient(145deg, hsl(${hue} 82% 96%), hsl(${(hue + 40) % 360} 72% 87%))` }}
        >
            <span className="text-3xl leading-none" aria-hidden="true">{getCategorySymbol(category.name)}</span>
            <span className="line-clamp-2 text-[8px] font-bold leading-tight text-slate-700">{category.name}</span>
        </div>
    );
};

const CategoryGrid = () => {
    const { categories, loading, error } = useCategories();
    const [isExpanded, setIsExpanded] = useState(false);

    // Number of items per row at largest breakpoint (lg: 8 columns)
    // Show 2 rows initially = 16 items
    const ITEMS_PER_ROW = 8;
    const INITIAL_ROWS = 2;
    const initialItemCount = ITEMS_PER_ROW * INITIAL_ROWS;
    // Check if we need to show the toggle button
    const hasMoreItems = categories.length > initialItemCount;

    if (loading) {
        return (
            <div className="bg-white">
                <div className="max-w-[1280px] mx-auto px-4 py-4">
                    <LoadingSpinner size="lg" className="py-12" />
                </div>
            </div>
        );
    }

    if (error) {
        return null; // Silently fail for category grid
    }

    return (
        <div className="bg-white">
            <div className="max-w-[1280px] mx-auto px-3 md:px-4 py-2">
                <div className="grid grid-cols-7 gap-2 pb-2 md:grid-cols-6 lg:grid-cols-8 md:gap-3">
                    {categories.map((category, index) => (
                        <Link
                            to={`/category/${encodeURIComponent(category.slug || category.id)}`}
                            key={category.id}
                            className={`flex flex-col items-center w-full cursor-pointer ${!isExpanded && index >= initialItemCount ? 'md:hidden' : ''}`}
                        >
                            <div className="w-full max-w-[68px] aspect-square md:max-w-[120px] bg-white rounded-xl md:rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                                <div className="w-full h-full flex items-center justify-center p-1.5 md:p-2.5">
                                    <CategoryImage category={category} />
                                </div>
                            </div>
                            <span className="mt-1.5 md:mt-2 text-[10px] md:text-[13px] font-semibold text-gray-900 text-center leading-tight line-clamp-2 px-0.5 md:px-1">
                                {category.name}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* See More / See Less Button */}
                {hasMoreItems && (
                    <div className="hidden md:flex justify-center mt-8 mb-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="group relative inline-flex items-center gap-3 px-8 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out overflow-hidden"
                        >
                            {/* Subtle gradient background on hover */}
                            <span className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>

                            {/* Text */}
                            <span className="relative text-[15px] font-medium text-gray-700 group-hover:text-gray-900 tracking-wide transition-colors duration-200">
                                {isExpanded ? 'Show Less Categories' : 'View All Categories'}
                            </span>

                            {/* Animated Icon */}
                            <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200">
                                <svg
                                    className={`w-3.5 h-3.5 text-gray-600 group-hover:text-gray-800 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>

                            {/* Category count badge */}
                            {!isExpanded && (
                                <span className="relative inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                                    +{categories.length - initialItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryGrid;
