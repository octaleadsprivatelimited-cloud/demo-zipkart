import React, { useEffect } from 'react';
import { ArrowLeft, Package, Truck, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AboutPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1280px] mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back</span>
                </button>

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/images/logos/zipcart-logo.png" alt="Zipcart" className="w-16 h-16 rounded-full object-cover" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">About ZipCart</h1>
                            <p className="text-gray-600">Fast and Fresh Delivery</p>
                        </div>
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed">
                        ZipCart is your trusted partner for quick and reliable grocery delivery. We bring fresh products right to your doorstep, making your shopping experience convenient and hassle-free.
                    </p>
                </div>

                {/* Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h2>
                        <p className="text-gray-700 leading-relaxed">
                            To revolutionize grocery shopping by providing fast, reliable, and convenient delivery services that save time and enhance the quality of life for our customers.
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h2>
                        <p className="text-gray-700 leading-relaxed">
                            To become the leading grocery delivery platform, known for exceptional service, quality products, and customer satisfaction across all communities we serve.
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Choose ZipCart?</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-green-100 p-4 rounded-full mb-3">
                                <Truck className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
                            <p className="text-gray-600 text-sm">
                                Get your groceries delivered in minutes, not hours
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-blue-100 p-4 rounded-full mb-3">
                                <Package className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Fresh Products</h3>
                            <p className="text-gray-600 text-sm">
                                Quality-checked fresh fruits, vegetables, and groceries
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-purple-100 p-4 rounded-full mb-3">
                                <Clock className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">24/7 Service</h3>
                            <p className="text-gray-600 text-sm">
                                Shop anytime, anywhere with our round-the-clock service
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-orange-100 p-4 rounded-full mb-3">
                                <Shield className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
                            <p className="text-gray-600 text-sm">
                                Safe and secure payment options for your peace of mind
                            </p>
                        </div>
                    </div>
                </div>

                {/* Company Info */}
                <div className="bg-white rounded-lg shadow-sm p-8 mt-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About Our Company</h2>
                    <div className="space-y-4 text-gray-700">
                        <p className="leading-relaxed">
                            Zipcart Groceries Pvt Ltd is a fast-growing, technology-driven e-commerce platform committed to making everyday shopping smarter, faster, and more convenient. Founded with a vision to transform how people purchase groceries and daily essentials, we bring a wide range of high-quality products directly to your doorstep with ease.
                        </p>
                        <p className="leading-relaxed">
                            At Zipcart, we combine a user-friendly digital experience with advanced technology and efficient logistics to deliver a seamless shopping journey. From intuitive browsing to reliable delivery, every step is designed to save your time, reduce effort, and maximize value.
                        </p>
                        <p className="leading-relaxed">
                            As a regional startup, we take pride in connecting customers with trusted local suppliers and fresh products, ensuring both quality and community growth. Our platform is built to adapt to evolving customer needs through data-driven insights, smart inventory management, and personalized experiences.
                        </p>
                        <p className="leading-relaxed">
                            With a strong focus on customer satisfaction, fast delivery, and consistent quality, Zipcart is redefining grocery shopping—making it more efficient, accessible, and enjoyable every day.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
