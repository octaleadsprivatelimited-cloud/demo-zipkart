import React, { createContext, useContext, useState } from 'react';

const SupportChatContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSupportChat = () => {
    const context = useContext(SupportChatContext);
    if (!context) {
        throw new Error('useSupportChat must be used within SupportChatProvider');
    }
    return context;
};

export const SupportChatProvider = ({ children }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const openChat = () => setIsChatOpen(true);
    const closeChat = () => setIsChatOpen(false);
    const toggleChat = () => setIsChatOpen(prev => !prev);

    return (
        <SupportChatContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
            {children}
        </SupportChatContext.Provider>
    );
};
