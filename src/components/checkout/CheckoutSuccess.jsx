import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CheckoutSuccess = ({ orderId, amount, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">

                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                <p className="text-gray-500 mb-6">
                    Your order <span className="font-mono font-medium text-gray-700">#{orderId}</span> of <span className="font-bold text-gray-900">₹{amount}</span> has been placed successfully.
                </p>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6 w-full">
                    Arriving in <span className="font-bold">10 minutes</span>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                    Continue Shopping
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default CheckoutSuccess;

