import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                    <p className="text-gray-600">Last updated: January 2026</p>
                </div>

                {/* Privacy Highlights */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                        <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Shield className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">Data Protected</h3>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                        <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Lock className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">Encrypted</h3>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                        <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">Transparent</h3>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                        <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <UserCheck className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">Your Control</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
                        <p className="text-gray-700 leading-relaxed">
                            At ZipCart (operated by Bristletech Pvt Limited), we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We collect information that you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><strong>Personal Information:</strong> Name, phone number, email address, and delivery addresses</li>
                            <li><strong>Payment Information:</strong> Payment card details and billing information (processed securely through payment gateways)</li>
                            <li><strong>Order Information:</strong> Products ordered, delivery preferences, and order history</li>
                            <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                            <li><strong>Location Data:</strong> GPS location for delivery purposes (with your permission)</li>
                            <li><strong>Usage Data:</strong> How you interact with our app and services</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We use the collected information for various purposes:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Process and deliver your orders</li>
                            <li>Communicate with you about your orders and account</li>
                            <li>Provide customer support and respond to inquiries</li>
                            <li>Send promotional offers and updates (with your consent)</li>
                            <li>Improve our services and user experience</li>
                            <li>Detect and prevent fraud and security issues</li>
                            <li>Comply with legal obligations</li>
                            <li>Analyze usage patterns and trends</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Information Sharing</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We may share your information with:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><strong>Delivery Partners:</strong> To fulfill your orders</li>
                            <li><strong>Payment Processors:</strong> To process transactions securely</li>
                            <li><strong>Service Providers:</strong> Who assist in operating our platform</li>
                            <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            We do not sell your personal information to third parties for marketing purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We implement industry-standard security measures to protect your information, including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights and Choices</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You have the right to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Access and review your personal information</li>
                            <li>Update or correct your information</li>
                            <li>Delete your account and associated data</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Withdraw consent for data processing</li>
                            <li>Request a copy of your data</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            To exercise these rights, contact us at privacy@zipcart.com or through your account settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies and Tracking</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We use cookies and similar tracking technologies to enhance your experience, analyze usage, and deliver personalized content. You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data Retention</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When no longer needed, we securely delete or anonymize your data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children's Privacy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Our services are not intended for children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to Privacy Policy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our app. Your continued use of our services after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <div className="mt-3 text-gray-700">
                            <p><strong>Email:</strong> privacy@zipcart.com</p>
                            <p><strong>Phone:</strong> +91 1800-123-4567</p>
                            <p><strong>Address:</strong> Bristletech Pvt Limited, 123 Business Park, Tech City, TC 560001</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
