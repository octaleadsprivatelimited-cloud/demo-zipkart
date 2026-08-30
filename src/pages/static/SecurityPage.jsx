import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, CreditCard, Eye, Smartphone, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecurityPage = () => {
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
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-green-100 p-4 rounded-full">
                            <Shield className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Security</h1>
                            <p className="text-gray-600">Your safety is our top priority</p>
                        </div>
                    </div>
                </div>

                {/* Security Features */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Lock className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">End-to-End Encryption</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-green-100 p-3 rounded-full">
                                <CreditCard className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Secure Payments</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    We use PCI-DSS compliant payment gateways. Your card details are never stored on our servers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-purple-100 p-3 rounded-full">
                                <Eye className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Privacy Protection</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    Your personal information is protected with advanced security measures and strict access controls.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-orange-100 p-3 rounded-full">
                                <Smartphone className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">OTP Authentication</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    Secure login with one-time passwords sent to your registered mobile number.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Security Information */}
                <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Payment Security</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We take payment security seriously and have implemented multiple layers of protection:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>All payment transactions are processed through certified payment gateways</li>
                            <li>We comply with PCI-DSS (Payment Card Industry Data Security Standard) requirements</li>
                            <li>Card details are tokenized and encrypted during transmission</li>
                            <li>We never store complete card information on our servers</li>
                            <li>3D Secure authentication for added protection on card payments</li>
                            <li>Real-time fraud detection and prevention systems</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Account Security</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Protect your ZipCart account with these security features:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>OTP-based authentication for login and sensitive actions</li>
                            <li>Secure session management with automatic timeout</li>
                            <li>Activity monitoring to detect suspicious behavior</li>
                            <li>Ability to log out from all devices remotely</li>
                            <li>Email and SMS notifications for account activities</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Data Protection</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Your data is protected through:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Encryption of data at rest and in transit</li>
                            <li>Regular security audits and vulnerability assessments</li>
                            <li>Strict access controls and employee training</li>
                            <li>Secure backup and disaster recovery procedures</li>
                            <li>Compliance with data protection regulations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Best Practices for Users</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Help us keep your account secure by following these guidelines:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Never share your OTP or account credentials with anyone</li>
                            <li>Use the official ZipCart app or website only</li>
                            <li>Keep your registered phone number and email updated</li>
                            <li>Log out after using shared or public devices</li>
                            <li>Review your order history regularly for unauthorized activity</li>
                            <li>Report any suspicious activity immediately to our support team</li>
                            <li>Be cautious of phishing attempts via email, SMS, or calls</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Delivery Safety</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We ensure safe delivery practices:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>All delivery partners are verified and background-checked</li>
                            <li>Real-time order tracking for transparency</li>
                            <li>Contactless delivery options available</li>
                            <li>Tamper-proof packaging for your orders</li>
                            <li>In-app communication with delivery partners</li>
                        </ul>
                    </section>
                </div>

                {/* Security Alert */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mt-6">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">Report Security Concerns</h3>
                            <p className="text-gray-700 leading-relaxed mb-3">
                                If you notice any suspicious activity on your account or have security concerns, please contact us immediately:
                            </p>
                            <div className="text-gray-700">
                                <p><strong>Email:</strong> security@zipcart.com</p>
                                <p><strong>Phone:</strong> +91 1800-123-4567 (24/7 Security Hotline)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Certifications */}
                <div className="bg-white rounded-lg shadow-sm p-8 mt-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Security Certifications & Compliance</h2>
                    <p className="text-gray-700 leading-relaxed">
                        ZipCart is committed to maintaining the highest security standards. We comply with industry regulations and best practices, including PCI-DSS for payment security, data protection laws, and regular third-party security audits to ensure your information remains safe.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecurityPage;
