import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
    {
        id: 1,
        name: 'Priya Sharma',
        location: 'Banjara Hills, Hyderabad',
        rating: 5,
        text: 'ZIPCART is a lifesaver! Fresh groceries delivered in just 10 minutes. The quality is always top-notch. Highly recommended!',
        avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
        date: '2 days ago'
    },
    {
        id: 2,
        name: 'Rajesh Kumar',
        location: 'Jubilee Hills, Hyderabad',
        rating: 5,
        text: 'I was skeptical about 10-minute delivery, but ZIPCART proved me wrong! Fast, reliable, and the products are always fresh.',
        avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
        date: '3 days ago'
    },
    {
        id: 3,
        name: 'Ananya Reddy',
        location: 'Madhapur, Hyderabad',
        rating: 5,
        text: 'Best grocery app ever! The prices are competitive and customer service is excellent. Never going back to traditional shopping.',
        avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
        date: '5 days ago'
    },
    {
        id: 4,
        name: 'Mohammed Irfan',
        location: 'Gachibowli, Hyderabad',
        rating: 5,
        text: 'ZIPCART has made my life so much easier. Fresh vegetables, dairy, everything at my doorstep in minutes. Amazing service!',
        avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
        date: '1 week ago'
    },
    {
        id: 5,
        name: 'Sneha Patel',
        location: 'Kondapur, Hyderabad',
        rating: 5,
        text: 'Quick delivery, great prices, and the app is so easy to use. ZIPCART is my go-to for all grocery needs!',
        avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
        date: '1 week ago'
    }
];

const TestimonialsSection = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-slide
    useEffect(() => {
        if (!isAutoPlaying) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 4000);

        return () => clearInterval(timer);
    }, [isAutoPlaying]);

    const handlePrev = () => {
        setIsAutoPlaying(false);
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const handleNext = () => {
        setIsAutoPlaying(false);
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
        ));
    };

    return (
        <section className="bg-gradient-to-b from-gray-50 to-white py-16">
            <div className="max-w-[1280px] mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                        ⭐ Customer Reviews
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        What Our Customers Say
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Join thousands of happy customers who trust ZIPCART for their daily grocery needs
                    </p>
                </div>

                {/* Testimonials Carousel */}
                <div className="relative max-w-4xl mx-auto">
                    {/* Navigation Buttons */}
                    <button
                        onClick={handlePrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Testimonial Card */}
                    <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden">
                        {/* Quote icon */}
                        <Quote className="absolute top-6 right-6 w-16 h-16 text-green-100 opacity-50" />

                        <div className="relative z-10">
                            {/* Stars */}
                            <div className="flex items-center gap-1 mb-4">
                                {renderStars(testimonials[currentIndex].rating)}
                            </div>

                            {/* Testimonial Text */}
                            <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed italic">
                                "{testimonials[currentIndex].text}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4">
                                <img
                                    src={testimonials[currentIndex].avatar}
                                    alt={testimonials[currentIndex].name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-green-200"
                                />
                                <div>
                                    <h4 className="font-bold text-gray-800">
                                        {testimonials[currentIndex].name}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {testimonials[currentIndex].location}
                                    </p>
                                </div>
                                <span className="ml-auto text-sm text-gray-400">
                                    {testimonials[currentIndex].date}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    setIsAutoPlaying(false);
                                }}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentIndex
                                        ? 'w-8 bg-green-600'
                                        : 'bg-gray-300 hover:bg-gray-400'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-12 border-t border-gray-100">
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">50K+</div>
                        <div className="text-sm text-gray-600">Happy Customers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">4.8★</div>
                        <div className="text-sm text-gray-600">App Rating</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">1L+</div>
                        <div className="text-sm text-gray-600">Orders Delivered</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">10 Min</div>
                        <div className="text-sm text-gray-600">Avg Delivery Time</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
