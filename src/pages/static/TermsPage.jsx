import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
                    <p className="text-gray-600">Last updated: January 2026</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By accessing and using ZipCart's services, you accept and agree to be bound by the terms and provisions of this agreement. These terms are governed by the Information Technology Act, 2000 and the Consumer Protection Act, 2019. If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Service Provider Information</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            ZipCart is operated by Bristletech Pvt Limited, a company registered under the Companies Act, 2013:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Registered Office: [Complete Address to be filled]</li>
                            <li>CIN: [Company Identification Number to be filled]</li>
                            <li>GSTIN: [GST Number to be filled]</li>
                            <li>FSSAI License: [Food License Number to be filled]</li>
                            <li>Email: zipcart9@gmail.com</li>
                            <li>Customer Support: +91 1800-123-4567</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Use of Service</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            ZipCart provides an online platform for ordering and delivery of groceries and other products. By using our service, you agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Provide accurate and complete information during registration and checkout</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Accept responsibility for all activities under your account</li>
                            <li>Use the service only for lawful purposes in compliance with Indian laws</li>
                            <li>Not engage in any fraudulent or abusive behavior</li>
                            <li>Be at least 18 years of age or have parental/guardian consent</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Orders and Payments</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            All orders placed through ZipCart are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including but not limited to product unavailability, pricing errors, or suspected fraudulent activity. Payment terms include:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>All prices are in Indian Rupees (INR) and include applicable GST and other taxes as per Indian tax laws</li>
                            <li>Payment must be completed before order dispatch</li>
                            <li>We accept various payment methods as displayed during checkout, processed through RBI-approved payment gateways</li>
                            <li>Promotional codes and discounts are subject to specific terms and cannot be combined unless stated</li>
                            <li>Maximum Retail Price (MRP) compliance as per Legal Metrology Act, 2009</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Delivery</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We strive to deliver orders within the estimated time frame of 10 minutes. However, delivery times are approximate and may vary due to factors beyond our control including weather, traffic, or force majeure events. You agree to be available at the delivery address or authorize someone to receive the order on your behalf. Delivery charges, if applicable, will be clearly displayed before order confirmation.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Returns, Refunds and Consumer Rights</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            In compliance with the Consumer Protection Act, 2019 and Consumer Protection (E-Commerce) Rules, 2020, our return and refund policy allows you to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Report damaged, expired, defective, or incorrect items within 24 hours of delivery</li>
                            <li>Request replacement or refund for eligible items with photographic evidence</li>
                            <li>Receive refunds within 5-7 business days to the original payment method</li>
                            <li>Contact customer support for any quality concerns or grievances</li>
                            <li>Right to cancel orders before dispatch without penalty</li>
                            <li>No questions asked return for perishable items if quality is unsatisfactory</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            For non-perishable items, returns are accepted within 7 days of delivery if the product is unused and in original packaging.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Membership</h2>
                        <p className="text-gray-700 leading-relaxed">
                            ZipCart offers optional membership plans with exclusive benefits. Membership fees are clearly disclosed before purchase. Members can cancel their subscription at any time, with benefits continuing until the end of the paid period. Refunds for membership fees will be provided as per the Consumer Protection Act, 2019 if services are not rendered as promised.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property</h2>
                        <p className="text-gray-700 leading-relaxed">
                            All content on ZipCart, including text, graphics, logos, images, and software, is the property of Bristletech Pvt Limited and is protected by the Copyright Act, 1957 and Trade Marks Act, 1999. You may not reproduce, distribute, or create derivative works without our express written permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Subject to applicable consumer protection laws, ZipCart and Bristletech Pvt Limited shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. However, this limitation does not affect your statutory rights under the Consumer Protection Act, 2019. Our liability for defective products or services shall be as per applicable Indian laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">10. Privacy and Data Protection</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Your use of ZipCart is governed by our Privacy Policy, which complies with the Information Technology Act, 2000 and Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. We are committed to protecting your personal data and will not share it with third parties without your consent, except as required by law. Please review our Privacy Policy to understand our practices regarding the collection, use, and protection of your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">11. Grievance Redressal Mechanism</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and Information Technology Act, 2000, we have appointed a Grievance Officer to address your concerns:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700 font-semibold">Grievance Officer</p>
                            <p className="text-gray-700">Name: [Grievance Officer Name to be filled]</p>
                            <p className="text-gray-700">Email: grievance@zipcart.in</p>
                            <p className="text-gray-700">Phone: +91 1800-123-4567</p>
                            <p className="text-gray-700">Address: [Office Address to be filled]</p>
                            <p className="text-gray-700 mt-2 text-sm">Response Time: We aim to acknowledge complaints within 48 hours and resolve them within 30 days.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">12. Dispute Resolution</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Any disputes arising from these terms or your use of ZipCart shall first be attempted to be resolved through good faith negotiations. If unresolved, disputes may be escalated to consumer forums as per the Consumer Protection Act, 2019, or through arbitration as per the Arbitration and Conciliation Act, 1996. Consumers have the right to approach consumer courts at the district, state, or national level based on the transaction value.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">13. Prohibited Items</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            In compliance with Indian laws, the following items are prohibited from sale on our platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Tobacco and tobacco products (as per COTPA, 2003)</li>
                            <li>Alcoholic beverages without proper licenses</li>
                            <li>Prescription drugs without valid prescription</li>
                            <li>Counterfeit or pirated products</li>
                            <li>Any items banned under Indian laws</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">14. Force Majeure</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We shall not be liable for any failure to perform our obligations due to circumstances beyond our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, fuel, energy, labor, or materials.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">15. Changes to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to modify these terms at any time. Material changes will be notified to users via email or prominent notice on the platform at least 15 days before taking effect. Your continued use of ZipCart after changes constitutes acceptance of the modified terms. You have the right to terminate your account if you do not agree with the changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">16. Governing Law and Jurisdiction</h2>
                        <p className="text-gray-700 leading-relaxed">
                            These terms shall be governed by and construed in accordance with the laws of India, including but not limited to the Information Technology Act, 2000, Consumer Protection Act, 2019, Indian Contract Act, 1872, and Sale of Goods Act, 1930. Any disputes arising from these terms or your use of ZipCart shall be subject to the exclusive jurisdiction of the courts in [City to be filled], India, without prejudice to your right to approach consumer forums.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">17. Severability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If any provision of these terms is found to be invalid or unenforceable by a court of competent jurisdiction, such provision shall be severed, and the remaining provisions shall continue in full force and effect.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">18. Contact Information</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            For any questions, concerns, or complaints regarding these Terms and Conditions, please contact us:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700"><strong>Email:</strong> zipcart9@gmail.com</p>
                            <p className="text-gray-700"><strong>Phone:</strong> +91 1800-123-4567</p>
                            <p className="text-gray-700"><strong>Customer Support Hours:</strong> 24/7</p>
                            <p className="text-gray-700"><strong>Grievance Email:</strong> grievance@zipcart.in</p>
                        </div>
                    </section>

                    <section className="border-t pt-6 mt-8">
                        <p className="text-sm text-gray-600 italic">
                            Note: This document is compliant with the Information Technology Act, 2000, Consumer Protection Act, 2019, Consumer Protection (E-Commerce) Rules, 2020, Legal Metrology Act, 2009, and other applicable Indian laws. Users are advised to read these terms carefully before using our services.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
