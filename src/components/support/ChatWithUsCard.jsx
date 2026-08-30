import React from 'react';
import { Headphones, ChevronRight } from 'lucide-react';

/**
 * Reusable "Chat with us" card component
 * Opens the support chat widget when clicked
 */
const ChatWithUsCard = ({ onClick, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-md group ${className}`}
        >
            {/* Icon */}
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6 text-blue-600" />
            </div>

            {/* Text Content */}
            <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-900 text-base mb-1">Chat with us</h3>
                <p className="text-sm text-gray-500">Our support team is available 24/7 for any issues.</p>
            </div>

            {/* Arrow Icon */}
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        </button>
    );
};

export default ChatWithUsCard;
