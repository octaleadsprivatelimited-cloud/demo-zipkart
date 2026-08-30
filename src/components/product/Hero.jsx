import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <div className="max-w-[1280px] mx-auto px-4 py-1.5 md:py-2">
            {/* Main Banner commented out as per request
            <div className="relative w-full aspect-[2.66] md:h-[220px] rounded-xl overflow-hidden shadow-sm cursor-pointer">
                <img
                    src="/image-removebg-preview.png"
                    alt="Vegetables"
                    className="w-full h-full object-cover bg-green-50"
                />
            </div>
            */}

            {/* Quick Links Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-1.5 md:mt-2">
                <Link to="/category/cat_beauty_cosmetics" className="h-[138px] sm:h-[170px] md:h-auto rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative block">
                    <img src="/images/banners/beauty_banner.png" alt="Beauty Products" className="w-full h-full md:h-auto object-fill md:object-cover" />
                </Link>

                <Link to="/category/cat_pet_store" className="hidden md:block rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative">
                    <img src="/images/banners/pet_care_banner.png" alt="Pet Care" className="w-full h-auto" />
                </Link>

                <Link to="/category/cat_baby_care" className="hidden md:block rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative">
                    <img src="/images/banners/baby_care_banner.jpg" alt="Baby Care" className="w-full h-auto" />
                </Link>
            </div>
        </div>
    );
};

export default Hero;
