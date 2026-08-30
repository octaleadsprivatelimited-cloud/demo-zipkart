import React, { useState } from 'react';
import { getFrontImage } from '../../utils/imageUtils';

const getInternetProductImage = (title) => {
    const query = encodeURIComponent(title.trim());
    return `https://tse1.mm.bing.net/th?q=${query}&w=400&h=400&c=7&rs=1&p=0&dpr=1.5&pid=1.7&mkt=en-IN&adlt=moderate`;
};

const getProductSymbol = (product) => {
    const title = [product?.name, product?.productName, product?.categoryName].filter(Boolean).join(' ').toLowerCase();
    const symbols = [
        [['curd', 'yogurt', 'dahi'], '🥣'], [['milk'], '🥛'], [['paneer', 'cheese'], '🧀'],
        [['bread', 'bun', 'pav', 'cake'], '🍞'], [['egg'], '🥚'], [['popcorn'], '🍿'],
        [['juice', 'drink', 'soda', 'water', 'coffee', 'tea'], '🥤'], [['rice', 'atta', 'flour'], '🌾'],
        [['fruit', 'vegetable'], '🥬'], [['chocolate', 'sweet', 'candy'], '🍫'],
        [['soap', 'shampoo', 'cream', 'lotion'], '🧴'], [['oil', 'ghee'], '🫙'],
        [['chicken', 'meat', 'fish'], '🍗'], [['chips', 'snack', 'namkeen'], '🍘'],
    ];
    return symbols.find(([words]) => words.some(word => title.includes(word)))?.[1] || '🛍️';
};

const getTitleHue = (value = '') => [...value].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 360, 137);

const ProductImage = ({ product, className = '', alt }) => {
    const [failed, setFailed] = useState(false);
    const [internetFailed, setInternetFailed] = useState(false);
    const source = getFrontImage(product);
    const showOriginal = !failed && source && !source.includes('placehold.co');
    const title = product?.name || product?.productName || product?.title || 'Product';
    const brand = title.split(/\s+/).slice(0, 2).join(' ');
    const hue = getTitleHue(title);
    const displaySource = showOriginal
        ? source
        : (!internetFailed ? getInternetProductImage(title) : null);

    return (
        <div
            role="img"
            aria-label={alt || product?.name || 'Product'}
            className={`relative overflow-hidden ${className}`}
            style={{
                background: `linear-gradient(145deg, hsl(${hue} 80% 96%), hsl(${(hue + 35) % 360} 72% 88%))`,
            }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                <span className="text-4xl leading-none drop-shadow-sm" aria-hidden="true">{getProductSymbol(product)}</span>
                <span className="max-w-full truncate rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
                    {brand}
                </span>
                <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-slate-600">{title}</span>
            </div>
            {displaySource && (
                <img
                    src={displaySource}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (showOriginal) setFailed(true);
                        else setInternetFailed(true);
                    }}
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                />
            )}
        </div>
    );
};

export default ProductImage;
