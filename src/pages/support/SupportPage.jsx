import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import {
    createTicket,
    subscribeToUserTickets,
    addMessageToTicket
} from '../../services/supportService';
import {
    MessageCircle,
    Plus,
    X,
    Send,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader
} from 'lucide-react';

const SupportPage = () => {
    const { user, authLoading } = useCart();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // New ticket form state
    const [newTicketForm, setNewTicketForm] = useState({
        subject: '',
        category: 'general',
        priority: 'medium',
        initialMessage: ''
    });
    const [creating, setCreating] = useState(false);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    // Subscribe to user's tickets
    useEffect(() => {
        if (!user?.uid) return;

        setLoading(true);
        const unsubscribe = subscribeToUserTickets(user.uid, (updatedTickets) => {
            setTickets(updatedTickets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.messages]);

    // Handle create ticket
    const handleCreateTicket = async (e) => {
        e.preventDefault();

        if (!newTicketForm.subject || !newTicketForm.initialMessage) {
            alert('Please fill in all required fields');
            return;
        }

        setCreating(true);
        try {
            await createTicket(user.uid, newTicketForm);

            // Reset form
            setNewTicketForm({
                subject: '',
                category: 'general',
                priority: 'medium',
                initialMessage: ''
            });
            setShowNewTicket(false);
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Failed to create ticket. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    // Handle send message
    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!messageInput.trim() || !selectedTicket) return;

        setSending(true);
        try {
            await addMessageToTicket(selectedTicket.id, {
                sender: 'user',
                message: messageInput.trim()
            });

            setMessageInput('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    // Status badge component
    const StatusBadge = ({ status }) => {
        const styles = {
            open: 'bg-blue-100 text-blue-700 border-blue-200',
            in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            resolved: 'bg-green-100 text-green-700 border-green-200'
        };

        const icons = {
            open: <AlertCircle className="w-3 h-3" />,
            in_progress: <Clock className="w-3 h-3" />,
            resolved: <CheckCircle className="w-3 h-3" />
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
                {icons[status]}
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    // Priority badge component
    const PriorityBadge = ({ priority }) => {
        const styles = {
            low: 'bg-gray-100 text-gray-700',
            medium: 'bg-blue-100 text-blue-700',
            high: 'bg-orange-100 text-orange-700',
            urgent: 'bg-red-100 text-red-700'
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[priority]}`}>
                {priority.toUpperCase()}
            </span>
        );
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader className="w-8 h-8 text-green-600 animate-spin" />
                    <p className="text-gray-600">Loading support tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
                        <p className="text-gray-600 mt-1">Manage your support requests</p>
                    </div>
                    <button
                        onClick={() => setShowNewTicket(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        New Ticket
                    </button>
                </div>

                {/* Tickets Grid */}
                {tickets.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Support Tickets Yet</h3>
                        <p className="text-gray-600 mb-6">Create your first support ticket to get help from our team</p>
                        <button
                            onClick={() => setShowNewTicket(true)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create Ticket
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                                            {ticket.subject}
                                        </h3>
                                        <p className="text-sm text-gray-500">{ticket.id}</p>
                                    </div>
                                    <StatusBadge status={ticket.status} />
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <PriorityBadge priority={ticket.priority} />
                                    <span className="text-xs text-gray-500 capitalize">{ticket.category}</span>
                                </div>

                                <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                                    {ticket.messages[ticket.messages.length - 1]?.message}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{ticket.messages.length} messages</span>
                                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.subject}</h2>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{selectedTicket.id}</span>
                                        <StatusBadge status={selectedTicket.status} />
                                        <PriorityBadge priority={selectedTicket.priority} />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {selectedTicket.messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.sender === 'user'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                        <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                                            }`}>
                                            {new Date(msg.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={sending || selectedTicket.status === 'resolved'}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !messageInput.trim() || selectedTicket.status === 'resolved'}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    {sending ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {selectedTicket.status === 'resolved' && (
                                <p className="text-sm text-gray-500 mt-2">This ticket has been resolved and is now read-only.</p>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* New Ticket Modal */}
            {showNewTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Create New Ticket</h2>
                            <button
                                onClick={() => setShowNewTicket(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Subject *</label>
                                <input
                                    type="text"
                                    value={newTicketForm.subject}
                                    onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                                    placeholder="Brief description of your issue"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                                    <select
                                        value={newTicketForm.category}
                                        onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="general">General</option>
                                        <option value="payments">Payments</option>
                                        <option value="items">Items & Stock</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="account">Account</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Priority *</label>
                                    <select
                                        value={newTicketForm.priority}
                                        onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                                <textarea
                                    value={newTicketForm.initialMessage}
                                    onChange={(e) => setNewTicketForm({ ...newTicketForm, initialMessage: e.target.value })}
                                    placeholder="Describe your issue in detail..."
                                    rows="6"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNewTicket(false)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Ticket'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
