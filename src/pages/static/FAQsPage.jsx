import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FAQsPage = () => {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const faqs = [
        {
            category: "Delivery",
            questions: [
                {
                    q: "What are the delivery timings?",
                    a: "ZipCart operates 24/7. You can place orders anytime and get them delivered within minutes to a few hours depending on your location and product availability."
                },
                {
                    q: "How fast is the delivery?",
                    a: "Most orders are delivered within 15-30 minutes. However, delivery time may vary based on your location, traffic conditions, and order volume."
                },
                {
                    q: "Is there a minimum order value?",
                    a: "There is no minimum order value. You can order as little or as much as you need."
                },
                {
                    q: "What are the delivery charges?",
                    a: "Delivery charges vary based on your location and order value. Members enjoy free delivery on all orders, while non-members may have nominal delivery fees."
                }
            ]
        },
        {
            category: "Payments & Refunds",
            questions: [
                {
                    q: "What payment methods are accepted?",
                    a: "We accept all major payment methods including credit/debit cards, UPI, net banking, digital wallets, and cash on delivery."
                },
                {
                    q: "Is my payment information secure?",
                    a: "Yes, absolutely. We use industry-standard encryption and secure payment gateways to protect your financial information."
                },
                {
                    q: "What is your refund policy?",
                    a: "If you receive damaged or incorrect items, you can request a refund or replacement within 24 hours of delivery. Refunds are processed within 5-7 business days."
                },
                {
                    q: "Can I cancel my order?",
                    a: "Yes, you can cancel your order before it's dispatched. Once dispatched, cancellation may not be possible, but you can refuse delivery and request a refund."
                }
            ]
        },
        {
            category: "Account & Membership",
            questions: [
                {
                    q: "How do I create an account?",
                    a: "Click on the 'Login' button in the header and enter your phone number. You'll receive an OTP to verify and create your account."
                },
                {
                    q: "What are the benefits of membership?",
                    a: "Members enjoy free delivery on all orders, exclusive discounts, early access to sales, and priority customer support."
                },
                {
                    q: "How much does membership cost?",
                    a: "Membership plans start at ₹99 per month or ₹999 per year. Check the membership section for current offers and pricing."
                },
                {
                    q: "Can I cancel my membership?",
                    a: "Yes, you can cancel your membership anytime from your account settings. Refunds for unused periods are processed as per our refund policy."
                }
            ]
        },
        {
            category: "Products & Quality",
            questions: [
                {
                    q: "How do you ensure product quality?",
                    a: "All products are quality-checked before dispatch. We work with trusted suppliers and maintain strict quality control standards."
                },
                {
                    q: "What if I receive expired or damaged products?",
                    a: "Contact our customer support immediately with photos of the product. We'll arrange for a replacement or full refund."
                },
                {
                    q: "Can I return products I don't like?",
                    a: "We accept returns for damaged, expired, or incorrect items. For other cases, please contact customer support within 24 hours of delivery."
                },
                {
                    q: "Do you have organic products?",
                    a: "Yes, we have a dedicated section for organic and health-focused products. Use the category filter to find them easily."
                }
            ]
        },
        {
            category: "Orders & Tracking",
            questions: [
                {
                    q: "How can I track my order?",
                    a: "After placing an order, you'll receive a tracking link. You can also track your order in real-time from the 'My Orders' section in your account."
                },
                {
                    q: "Can I modify my order after placing it?",
                    a: "You can modify your order before it's dispatched. Contact customer support immediately or use the order modification option in your account."
                },
                {
                    q: "What if my delivery is delayed?",
                    a: "In case of delays, you'll be notified via SMS/notification. You can also contact our support team for real-time updates."
                },
                {
                    q: "Can I schedule a delivery for later?",
                    a: "Yes, you can choose a preferred delivery time slot during checkout. We'll deliver your order at your convenience."
                }
            ]
        }
    ];

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    let globalIndex = 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[900px] mx-auto px-4 py-8">
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
                    <p className="text-gray-600">Find answers to common questions about ZipCart</p>
                </div>

                {/* FAQ Categories */}
                <div className="space-y-6">
                    {faqs.map((category, catIndex) => (
                        <div key={catIndex} className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">{category.category}</h2>
                            <div className="space-y-3">
                                {category.questions.map((faq, qIndex) => {
                                    const currentIndex = globalIndex++;
                                    return (
                                        <div key={qIndex} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                            <button
                                                onClick={() => toggleFAQ(currentIndex)}
                                                className="w-full flex items-start justify-between gap-4 text-left py-2 hover:text-green-600 transition-colors"
                                            >
                                                <span className="font-semibold text-gray-900">{faq.q}</span>
                                                {openIndex === currentIndex ? (
                                                    <ChevronUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                )}
                                            </button>
                                            {openIndex === currentIndex && (
                                                <div className="mt-2 text-gray-700 leading-relaxed pl-2">
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Contact Support */}
                <div className="bg-green-50 rounded-lg p-6 mt-6 text-center">
                    <h3 className="font-bold text-gray-900 mb-2">Still have questions?</h3>
                    <p className="text-gray-700 mb-4">Our customer support team is here to help you 24/7</p>
                    <button
                        onClick={() => navigate('/contact')}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FAQsPage;
