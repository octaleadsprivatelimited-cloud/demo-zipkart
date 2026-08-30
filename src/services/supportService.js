import { db } from '../config/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    runTransaction,
    arrayUnion,
    Timestamp
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
    SUPPORT_TICKETS: 'support_tickets',
    COUNTERS: 'counters'
};

/**
 * Generate a unique message ID based on timestamp
 * @returns {string} Message ID (e.g., "MSG1706612345678")
 */
const generateMessageId = () => {
    return `MSG${Date.now()}`;
};

/**
 * Create a new support ticket with sequential ID
 * Uses Firestore transaction to ensure unique ticket IDs
 * 
 * @param {string} userId - User ID creating the ticket
 * @param {Object} ticketData - Ticket details
 * @param {string} ticketData.subject - Ticket subject
 * @param {string} ticketData.category - Category (general, payments, items, delivery, account)
 * @param {string} ticketData.priority - Priority (low, medium, high, urgent)
 * @param {string} ticketData.initialMessage - First message in the ticket
 * @returns {Promise<Object>} Created ticket object with ID
 */
export const createTicket = async (userId, ticketData) => {
    try {
        const { subject, category, priority, initialMessage } = ticketData;

        // Validate required fields
        if (!userId || !subject || !category || !priority || !initialMessage) {
            throw new Error('Missing required fields for ticket creation');
        }

        let createdTicket = null;

        // Use transaction to ensure unique sequential ticket ID
        await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, COLLECTIONS.COUNTERS, COLLECTIONS.SUPPORT_TICKETS);
            const counterDoc = await transaction.get(counterRef);

            // Get current count and increment
            const currentCount = counterDoc.exists() ? (counterDoc.data().count || 0) : 0;
            const newCount = currentCount + 1;
            const ticketId = `TKT-${String(newCount).padStart(3, '0')}`;

            // Create initial message
            const firstMessage = {
                id: generateMessageId(),
                sender: 'user',
                message: initialMessage,
                timestamp: new Date().toISOString()
            };

            // Prepare ticket document
            const ticketDocData = {
                id: ticketId,
                ticketId: ticketId,
                userId: userId,
                subject: subject,
                category: category,
                priority: priority,
                status: 'open',
                messages: [firstMessage],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            // Update counter
            transaction.set(counterRef, { count: newCount });

            // Create ticket document
            const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
            transaction.set(ticketRef, ticketDocData);

            createdTicket = { ...ticketDocData, id: ticketId };
        });

        console.log('✅ Ticket created successfully:', createdTicket.id);
        return createdTicket;

    } catch (error) {
        console.error('❌ Error creating ticket:', error);
        throw error;
    }
};

/**
 * Subscribe to real-time updates for a user's tickets
 * 
 * @param {string} userId - User ID to fetch tickets for
 * @param {Function} callback - Callback function to receive ticket updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserTickets = (userId, callback) => {
    try {
        const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
        // Removed orderBy to avoid requiring composite index
        // Sorting is done client-side instead
        const q = query(
            ticketsRef,
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert Firestore Timestamps to JS Dates for easier handling
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
            }));

            // Sort client-side by createdAt descending
            tickets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            console.log(`📨 Received ${tickets.length} tickets for user ${userId}`);
            callback(tickets);
        }, (error) => {
            console.error('❌ Error in ticket subscription:', error);
            callback([]);
        });

        return unsubscribe;

    } catch (error) {
        console.error('❌ Error subscribing to tickets:', error);
        throw error;
    }
};

/**
 * Add a message to an existing ticket
 * 
 * @param {string} ticketId - Ticket ID to add message to
 * @param {Object} messageData - Message details
 * @param {string} messageData.sender - Sender type ('user' or 'admin')
 * @param {string} messageData.message - Message content
 * @returns {Promise<void>}
 */
export const addMessageToTicket = async (ticketId, messageData) => {
    try {
        const { sender, message } = messageData;

        if (!ticketId || !sender || !message) {
            throw new Error('Missing required fields for message');
        }

        const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);

        // Create new message object
        const newMessage = {
            id: generateMessageId(),
            sender: sender,
            message: message,
            timestamp: new Date().toISOString()
        };

        // Update ticket with new message and updatedAt timestamp
        await runTransaction(db, async (transaction) => {
            const ticketDoc = await transaction.get(ticketRef);

            if (!ticketDoc.exists()) {
                throw new Error('Ticket not found');
            }

            transaction.update(ticketRef, {
                messages: arrayUnion(newMessage),
                updatedAt: Timestamp.now()
            });
        });

        console.log('✅ Message added to ticket:', ticketId);

    } catch (error) {
        console.error('❌ Error adding message to ticket:', error);
        throw error;
    }
};

/**
 * Update ticket status
 * 
 * @param {string} ticketId - Ticket ID to update
 * @param {string} status - New status ('open', 'in_progress', 'resolved')
 * @returns {Promise<void>}
 */
export const updateTicketStatus = async (ticketId, status) => {
    try {
        const validStatuses = ['open', 'in_progress', 'resolved'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);

        await runTransaction(db, async (transaction) => {
            const ticketDoc = await transaction.get(ticketRef);

            if (!ticketDoc.exists()) {
                throw new Error('Ticket not found');
            }

            transaction.update(ticketRef, {
                status: status,
                updatedAt: Timestamp.now()
            });
        });

        console.log('✅ Ticket status updated:', ticketId, '→', status);

    } catch (error) {
        console.error('❌ Error updating ticket status:', error);
        throw error;
    }
};

/**
 * Get a single ticket by ID
 * 
 * @param {string} ticketId - Ticket ID to fetch
 * @returns {Promise<Object|null>} Ticket object or null if not found
 */
export const getTicketById = async (ticketId) => {
    try {
        const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
        const ticketDoc = await getDoc(ticketRef);

        if (ticketDoc.exists()) {
            return {
                id: ticketDoc.id,
                ...ticketDoc.data(),
                createdAt: ticketDoc.data().createdAt?.toDate(),
                updatedAt: ticketDoc.data().updatedAt?.toDate()
            };
        }

        return null;

    } catch (error) {
        console.error('❌ Error fetching ticket:', error);
        throw error;
    }
};

/**
 * Get all tickets for a user (non-realtime)
 * 
 * @param {string} userId - User ID to fetch tickets for
 * @returns {Promise<Array>} Array of ticket objects
 */
export const getUserTickets = async (userId) => {
    try {
        const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
        // Removed orderBy to avoid requiring composite index
        // Sorting is done client-side instead
        const q = query(
            ticketsRef,
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));

        // Sort client-side by createdAt descending
        tickets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return tickets;

    } catch (error) {
        console.error('❌ Error fetching user tickets:', error);
        throw error;
    }
};
