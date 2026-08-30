import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useSupportChat } from '../../context/SupportChatContext';
import { getChatbotOrders, formatOrderForChatbot } from '../../services/orderDetectionService';
import { canAutoResolve, handleAutomatedResolution } from '../../services/resolutionService';
import { createTicket, addMessageToTicket, getUserTickets } from '../../services/supportService';
import {
    MessageCircle,
    X,
    ChevronLeft,
    Clock,
    Package,
    AlertCircle,
    CreditCard,
    RotateCcw,
    XCircle,
    CheckCircle,
    Loader,
    Ticket
} from 'lucide-react';

const SupportChatWidget = () => {
    const { user, sessionOrders } = useCart();
    const { isChatOpen, closeChat, openChat } = useSupportChat();
    const [orders, setOrders] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [resolutionStep, setResolutionStep] = useState('issue_selection'); // issue_selection, resolution_flow, success, tickets
    const [loading, setLoading] = useState(false);
    // const [selectedItems, setSelectedItems] = useState([]);
    const [resolutionResult, setResolutionResult] = useState(null);
    // const messagesEndRef = useRef(null);

    // Issue types with icons and labels
    const issueTypes = [
        { id: 'delayed_delivery', label: 'Delayed Delivery', icon: Clock, color: 'orange' },
        { id: 'missing_items', label: 'Missing Items', icon: Package, color: 'red' },
        { id: 'wrong_items', label: 'Wrong Items', icon: AlertCircle, color: 'red' },
        { id: 'payment_failed', label: 'Payment Failed', icon: CreditCard, color: 'purple' },
        { id: 'refund_status', label: 'Refund Status', icon: RotateCcw, color: 'blue' },
        { id: 'cancel_order', label: 'Cancel Order', icon: XCircle, color: 'gray' }
    ];

    // Fetch orders when widget opens
    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const userOrders = await getChatbotOrders(user?.uid);

                // Merge with session orders (client-side only orders)
                // Prioritize session orders as they are most recent
                const combinedOrders = new Map();

                // Add fetched orders safely
                if (Array.isArray(userOrders)) {
                    userOrders.forEach(o => combinedOrders.set(o.id.toString(), o));
                }

                // Add session orders safely
                (sessionOrders || []).forEach(o => {
                    const id = o.orderId || o.id;
                    if (id && !combinedOrders.has(id.toString())) {
                        combinedOrders.set(id.toString(), {
                            ...o,
                            id: id.toString(),
                            createdAt: o.createdAt || new Date(),
                            isSessionOrder: true
                        });
                    }
                });

                const finalOrders = Array.from(combinedOrders.values())
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 5);

                setOrders(finalOrders);
            } catch (error) {
                console.error('Error fetching orders:', error);
                // Fallback to session orders safely
                setOrders((sessionOrders || []).slice(0, 5));
            } finally {
                setLoading(false);
            }
        };

        const fetchTickets = async () => {
            if (user?.uid) {
                try {
                    const userTickets = await getUserTickets(user.uid);
                    setTickets(userTickets);
                    console.log(`✅ Loaded ${userTickets.length} support tickets`);
                } catch (error) {
                    console.error('Error fetching tickets:', error);
                    setTickets([]);
                }
            }
        };

        if (isChatOpen) {
            fetchOrders();
            fetchTickets();
        }
    }, [isChatOpen, user, sessionOrders]);

    const handleOrderSelect = (order) => {
        setSelectedOrder(order);
        setResolutionStep('issue_selection');
    };

    const handleIssueSelect = async (issue) => {
        setSelectedIssue(issue);
        setLoading(true);

        try {
            // Check if issue can be auto-resolved
            const eligibility = canAutoResolve(issue.id, selectedOrder);

            if (eligibility.canResolve) {
                setResolutionStep('resolution_flow');
            } else if (eligibility.escalate) {
                // Create support ticket for human agent
                await escalateToHuman(issue);
            }
        } catch (error) {
            console.error('Error handling issue:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolution = async (options = {}) => {
        setLoading(true);

        try {
            const result = await handleAutomatedResolution(
                selectedIssue.id,
                selectedOrder,
                options
            );

            setResolutionResult(result);
            setResolutionStep('success');
        } catch (error) {
            console.error('Error in resolution:', error);
            setResolutionResult({
                success: false,
                error: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const escalateToHuman = async (issue) => {
        try {
            setLoading(true);

            // Build subject and message based on whether order is selected
            const orderInfo = selectedOrder ? ` - Order ${selectedOrder.id || selectedOrder.orderId}` : '';
            const orderMessage = selectedOrder
                ? `Issue with order ${selectedOrder.id || selectedOrder.orderId}: ${issue.label}`
                : `Support request: ${issue.label}`;

            const ticketData = {
                subject: `${issue.label}${orderInfo}`,
                category: selectedOrder ? 'order_issue' : 'general',
                priority: 'high',
                initialMessage: orderMessage
            };

            const ticket = await createTicket(user.uid, ticketData);
            console.log('✅ Ticket created:', ticket.id);

            // Add bot message
            await addMessageToTicket(ticket.id, {
                sender: 'assistant',
                message: `I've created a support ticket for your issue. Our team will review and respond within 2 hours. Ticket ID: ${ticket.id}`
            });

            // Refresh tickets list
            const updatedTickets = await getUserTickets(user.uid);
            setTickets(updatedTickets);

            setResolutionResult({
                success: true,
                escalated: true,
                ticketId: ticket.id
            });
            setResolutionStep('success');
        } catch (error) {
            console.error('Error escalating:', error);
            setResolutionResult({
                success: false,
                error: error.message || 'Failed to create ticket'
            });
            setResolutionStep('success');
        } finally {
            setLoading(false);
        }
    };

    const resetWidget = () => {
        setSelectedOrder(null);
        setSelectedIssue(null);
        setResolutionStep('issue_selection');
        setResolutionResult(null);
    };

    const closeWidget = () => {
        closeChat();
        setTimeout(resetWidget, 300);
    };

    // Don't render if user not logged in
    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            {!isChatOpen && (
                <button
                    onClick={openChat}
                    className="fixed bottom-6 right-6 z-50 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}

            {/* Chat Widget */}
            {isChatOpen && (
                <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-[330px] h-[480px] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-yellow-400 text-white p-4 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">ZIPCART Support</h3>
                                <p className="text-xs text-white/90 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-white rounded-full"></span>
                                    Fast Resolution
                                </p>
                            </div>
                            <button
                                onClick={closeWidget}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader className="w-8 h-8 animate-spin text-green-600" />
                            </div>
                        ) : !selectedOrder ? (
                            /* Order Selection Screen */
                            <div className="p-4">
                                <h4 className="text-sm font-bold text-gray-900 mb-3">Your Recent Orders</h4>
                                {orders.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No recent orders found</p>
                                        <button
                                            onClick={() => escalateToHuman({ id: 'general', label: 'General Help' })}
                                            className="mt-4 text-green-600 text-sm font-semibold"
                                        >
                                            Talk to Agent
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {orders.map((order) => {
                                            const formatted = formatOrderForChatbot(order);
                                            return (
                                                <button
                                                    key={order.id}
                                                    onClick={() => handleOrderSelect(order)}
                                                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-3 text-left transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm text-gray-900">
                                                                #{formatted.displayId}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatted.itemCount} items • ₹{formatted.total}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {formatted.statusLabel}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400">{formatted.timeAgo}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <button
                                    onClick={() => escalateToHuman({ id: 'other', label: 'Other Issue' })}
                                    className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                >
                                    Other Issues
                                </button>
                                <button
                                    onClick={() => setResolutionStep('tickets')}
                                    className="w-full mt-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ticket className="w-4 h-4" />
                                    View My Tickets ({tickets.length})
                                </button>
                            </div>
                        ) : resolutionStep === 'issue_selection' ? (
                            /* Issue Selection Screen */
                            <div className="p-4">
                                <button
                                    onClick={resetWidget}
                                    className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-3"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back to Orders
                                </button>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">
                                    Order #{formatOrderForChatbot(selectedOrder).displayId}
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">What's the issue?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {issueTypes.map((issue) => {
                                        const Icon = issue.icon;
                                        return (
                                            <button
                                                key={issue.id}
                                                onClick={() => handleIssueSelect(issue)}
                                                className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-green-500 rounded-lg p-3 text-center transition-all"
                                            >
                                                <Icon className={`w-6 h-6 mx-auto mb-1 text-${issue.color}-600`} />
                                                <p className="text-xs font-semibold text-gray-900">{issue.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => escalateToHuman({ id: 'other', label: 'Other Issue' })}
                                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                >
                                    Talk to Human Agent
                                </button>
                            </div>
                        ) : resolutionStep === 'resolution_flow' ? (
                            /* Resolution Flow Screen */
                            <ResolutionFlow
                                issue={selectedIssue}
                                order={selectedOrder}
                                onResolve={handleResolution}
                                onBack={() => setResolutionStep('issue_selection')}
                            />
                        ) : resolutionStep === 'tickets' ? (
                            /* Tickets View Screen */
                            <div className="p-4">
                                <button
                                    onClick={resetWidget}
                                    className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-3"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back to Orders
                                </button>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">My Support Tickets</h4>
                                <p className="text-xs text-gray-500 mb-4">View all your raised tickets</p>
                                {tickets.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No tickets raised yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {tickets.map((ticket) => (
                                            <div
                                                key={ticket.id}
                                                className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900">
                                                            {ticket.ticketId || ticket.id}
                                                        </p>
                                                        <p className="text-xs text-gray-600 mt-0.5">
                                                            {ticket.subject}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                        ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                {ticket.messages && ticket.messages.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                                        {ticket.messages[ticket.messages.length - 1].message}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Success Screen */
                            <div className="p-4 flex flex-col items-center justify-center h-full">
                                {resolutionResult?.success ? (
                                    <>
                                        <CheckCircle className="w-16 h-16 text-green-600 mb-3" />
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                                            {resolutionResult.escalated ? 'Ticket Created' : 'Resolved!'}
                                        </h4>
                                        <p className="text-sm text-gray-600 text-center mb-4">
                                            {resolutionResult.result?.message || resolutionResult.message || 'Your issue has been resolved.'}
                                        </p>
                                        {resolutionResult.result?.refundId && (
                                            <p className="text-xs text-gray-500 mb-4">
                                                Refund ID: {resolutionResult.result.refundId}
                                            </p>
                                        )}
                                        <button
                                            onClick={resetWidget}
                                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors"
                                        >
                                            Done
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-16 h-16 text-red-600 mb-3" />
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">Something Went Wrong</h4>
                                        <p className="text-sm text-gray-600 text-center mb-4">
                                            {resolutionResult?.error || 'Please try again or contact support.'}
                                        </p>
                                        <button
                                            onClick={resetWidget}
                                            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors"
                                        >
                                            Back
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// Resolution Flow Component
const ResolutionFlow = ({ issue, order, onResolve, onBack }) => {
    const [selectedItems, setSelectedItems] = useState([]);
    const [useWallet, setUseWallet] = useState(false);

    const toggleItem = (item) => {
        setSelectedItems(prev =>
            prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item]
        );
    };

    const calculateRefundAmount = () => {
        return selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
    };

    const handleSubmit = () => {
        const amount = calculateRefundAmount();
        onResolve({
            amount,
            items: selectedItems,
            useWallet,
            reason: issue.label
        });
    };

    if (issue.id === 'missing_items' || issue.id === 'wrong_items') {
        return (
            <div className="p-4">
                <button onClick={onBack} className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-3">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <h4 className="text-sm font-bold text-gray-900 mb-1">{issue.label}</h4>
                <p className="text-xs text-gray-500 mb-4">Select affected items:</p>
                <div className="space-y-2 mb-4">
                    {order.items?.map((item, idx) => (
                        <label key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(item)}
                                onChange={() => toggleItem(item)}
                                className="w-4 h-4 text-green-600"
                            />
                            <span className="flex-1 text-sm text-gray-900">{item.name}</span>
                            <span className="text-sm font-semibold text-gray-900">₹{item.price}</span>
                        </label>
                    ))}
                </div>
                {selectedItems.length > 0 && (
                    <>
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                            <p className="text-sm font-bold text-gray-900">Total: ₹{calculateRefundAmount()}</p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    setUseWallet(true);
                                    handleSubmit();
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                                Credit to Wallet (+₹10 extra)
                            </button>
                            <button
                                onClick={() => {
                                    setUseWallet(false);
                                    handleSubmit();
                                }}
                                className="w-full bg-white hover:bg-gray-50 border-2 border-green-600 text-green-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                                Refund to Original Method
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (issue.id === 'cancel_order') {
        return (
            <div className="p-4">
                <button onClick={onBack} className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-3">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Cancel Order</h4>
                <p className="text-xs text-gray-500 mb-4">Are you sure you want to cancel this order?</p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                    <p className="text-xs text-yellow-800">
                        Full refund of ₹{order.total} will be initiated immediately.
                    </p>
                </div>
                <div className="space-y-2">
                    <button
                        onClick={() => onResolve({ reason: 'Customer request', refundAmount: order.total })}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Yes, Cancel Order
                    </button>
                    <button
                        onClick={onBack}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        No, Keep Order
                    </button>
                </div>
            </div>
        );
    }

    // Default flow for other issues
    return (
        <div className="p-4">
            <button onClick={onBack} className="flex items-center gap-1 text-green-600 text-sm font-semibold mb-3">
                <ChevronLeft className="w-4 h-4" />
                Back
            </button>
            <h4 className="text-sm font-bold text-gray-900 mb-4">{issue.label}</h4>
            <button
                onClick={() => onResolve({})}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
            >
                Continue
            </button>
        </div>
    );
};

export default SupportChatWidget;
