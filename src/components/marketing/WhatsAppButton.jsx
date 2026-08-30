import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const WhatsAppButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');

    // WhatsApp number - replace with actual number
    const whatsappNumber = '919876543210'; // Format: country code + number

    const handleSendMessage = () => {
        const encodedMessage = encodeURIComponent(message || 'Hi! I need help with my order on ZIPCART.');
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        setIsOpen(false);
        setMessage('');
    };

    const quickMessages = [
        "I need help with my order",
        "Where is my delivery?",
        "I have a product inquiry",
        "I want to give feedback"
    ];

    return (
        <>
            {/* Chat Box */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 md:right-6 z-[90] w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                    <img src="/images/logos/zipcart-logo.png" alt="ZIPCART" className="w-8 h-8 rounded-full" />
                                </div>
                                <div>
                                    <h3 className="font-bold">ZIPCART Support</h3>
                                    <p className="text-xs text-green-100">Typically replies within minutes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Content */}
                    <div className="p-4 bg-gray-50">
                        {/* Welcome Message */}
                        <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm mb-4">
                            <p className="text-sm text-gray-700">
                                👋 Hi! How can we help you today? Choose a topic or type your message.
                            </p>
                        </div>

                        {/* Quick Message Options */}
                        <div className="space-y-2 mb-4">
                            {quickMessages.map((msg, index) => (
                                <button
                                    key={index}
                                    onClick={() => setMessage(msg)}
                                    className="w-full text-left p-2.5 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg text-sm text-gray-700 transition-colors"
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-green-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-4 md:right-6 z-[90] w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${isOpen
                    ? 'bg-gray-700 hover:bg-gray-800'
                    : 'bg-green-500 hover:bg-green-600 hover:scale-110'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <>
                        <MessageCircle className="w-7 h-7 text-white" />
                        {/* Pulse animation */}
                        <span className="absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-30" />
                    </>
                )}
            </button>

            {/* WhatsApp Badge */}
            {!isOpen && (
                <div className="fixed bottom-6 right-20 md:right-22 z-[89] bg-white px-3 py-1.5 rounded-full shadow-md animate-bounce">
                    <p className="text-xs font-semibold text-gray-700">Need Help?</p>
                </div>
            )}
        </>
    );
};

export default WhatsAppButton;
