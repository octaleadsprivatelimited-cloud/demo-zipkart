import React from 'react';
import { Shield, Truck, Award, Headphones, CreditCard } from 'lucide-react';

const badges = [
    {
        icon: Truck,
        title: '15-Min Delivery',
        description: 'Lightning-fast delivery to your doorstep',
        color: 'from-green-500 to-emerald-600'
    },
    {
        icon: Shield,
        title: 'Secure Payments',
        description: '100% secure payment gateway',
        color: 'from-blue-500 to-indigo-600'
    },
    {
        icon: Award,
        title: 'Quality Guarantee',
        description: 'Fresh & quality products always',
        color: 'from-yellow-500 to-orange-600'
    },
    {
        icon: Headphones,
        title: '24/7 Support',
        description: 'Round the clock customer service',
        color: 'from-purple-500 to-pink-600'
    },
    {
        icon: CreditCard,
        title: 'Best Prices',
        description: 'Competitive prices guaranteed',
        color: 'from-rose-500 to-red-600'
    }
];

const TrustBadges = () => {
    return (
        <section className="py-12 bg-gray-50">
            <div className="max-w-[1280px] mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                        Why Choose ZIPCART?
                    </h2>
                    <p className="text-gray-600">
                        Trusted by thousands of customers for quality and reliability
                    </p>
                </div>

                {/* Badges Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    {badges.map((badge, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-5 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
                        >
                            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg`}>
                                <badge.icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">
                                {badge.title}
                            </h3>
                            <p className="text-xs text-gray-500 leading-tight">
                                {badge.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustBadges;
