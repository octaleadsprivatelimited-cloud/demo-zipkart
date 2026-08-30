import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useSupportChat } from '../../context/SupportChatContext';
import ChatWithUsCard from '../../components/support/ChatWithUsCard';
import { getOrderById } from '../../services/orderService';
import {
    ArrowLeft,
    Download,
    Copy,
    MapPinHouse,
    Receipt,
    Pill,
    Gift,
    ShieldCheck,
    LogOut
} from 'lucide-react';

const OrderSummaryPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useCart();
    const { openChat } = useSupportChat();
    const [copied, setCopied] = useState(false);
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Fetch order from Firebase
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setIsLoading(false);
                return;
            }

            try {
                const orderData = await getOrderById(orderId);

                if (orderData) {
                    setOrder(orderData);
                }
            } catch {
                // Error fetching order - silently handled
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const handleCopyOrderId = () => {
        navigator.clipboard.writeText(`ORD${order?.orderId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Loading state with skeleton UI
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#f8f9fb]">
                <div className="max-w-[1240px] mx-auto flex pt-8 pb-12 px-4">
                    {/* Sidebar Skeleton */}
                    <div className="w-[300px] flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
                            <div className="p-8 text-center border-b border-gray-50">
                                <div className="h-5 bg-gray-200 rounded animate-pulse mx-auto w-32"></div>
                            </div>
                            <div className="py-2 space-y-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="px-8 py-5">
                                        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Skeleton */}
                    <div className="flex-1 ml-12">
                        <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse mb-10"></div>
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-12">
                            <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-4"></div>
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-64 mb-8"></div>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Order not found state
    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
                    <p className="text-gray-600 mb-6">We couldn't find the order you're looking for.</p>
                    <button
                        onClick={() => navigate('/orders')}
                        className="w-full bg-[#0c831f] text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        View All Orders
                    </button>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: 'addresses', label: 'My Addresses', icon: MapPinHouse },
        { id: 'orders', label: 'My Orders', icon: Receipt, active: true },
        { id: 'prescriptions', label: 'My Prescriptions', icon: Pill },
        { id: 'giftcards', label: 'E-Gift Cards', icon: Gift },
        { id: 'privacy', label: 'Account privacy', icon: ShieldCheck },
    ];

    // Mock calculations based on images
    const mrp = order.total + 1300; // Mocking a higher MRP
    const discount = 1300;

    return (
        <div className="min-h-screen bg-[#f8f9fb]">
            <div className="max-w-[1240px] mx-auto flex pt-8 pb-12 px-4">
                {/* Sidebar - Consistent with AccountPage */}
                <div className="w-[300px] flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
                        <div className="p-8 text-center border-b border-gray-50">
                            <p className="text-base font-bold text-gray-400 tracking-wide">
                                {user?.phoneNumber || '+916309451985'}
                            </p>
                        </div>
                        <div className="py-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        to="/orders"
                                        className={`w-full flex items-center gap-4 px-8 py-5 text-sm font-bold transition-all ${item.active
                                            ? 'bg-[#f0fcf2] text-[#0c831f] border-r-4 border-[#0c831f]'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${item.active ? 'text-[#0c831f]' : 'text-gray-400'}`} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <button onClick={logout} className="w-full flex items-center gap-4 px-8 py-5 text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all group">
                                <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 ml-12">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/orders')}
                        className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all mb-10 group"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-900 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-12">
                        {/* Header */}
                        <div className="mb-12">
                            <h1 className="text-[26px] font-bold text-[#111] mb-2">Order summary</h1>
                            <p className="text-[15px] font-bold text-gray-500">
                                Arrived at {new Date(new Date(order.timestamp).getTime() + 30 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                            </p>
                            <button className="flex items-center gap-2 text-[#0c831f] text-[15px] font-bold mt-3 hover:opacity-70 transition-opacity">
                                Download Invoice <Download className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="mb-12">
                            <h2 className="text-[18px] font-bold text-[#111] mb-8">
                                {order.items.length} {order.items.length === 1 ? 'item' : 'items'} in this order
                            </h2>
                            <div className="space-y-8">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex gap-6 items-center">
                                            <div className="w-20 h-20 bg-white border border-gray-100 rounded-[20px] p-3 overflow-hidden shadow-sm">
                                                <img src={item.image} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-bold text-[#111] leading-tight">{item.name}</p>
                                                <p className="text-[13px] font-bold text-gray-400 mt-1.5">{item.quantity} piece x 1</p>
                                            </div>
                                        </div>
                                        <p className="text-[15px] font-bold text-[#111]">₹{item.price * item.quantity}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-[8px] bg-[#f8f9fb] -mx-12 mb-12"></div>

                        {/* Bill Details */}
                        <div className="mb-12">
                            <h2 className="text-[18px] font-bold text-[#111] mb-8">Bill details</h2>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center text-[15px] font-bold">
                                    <span className="text-gray-500">MRP</span>
                                    <span className="text-gray-900 line-through opacity-50 text-[13px]">₹{mrp.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[15px] font-bold">
                                    <span className="text-gray-500">Product discount</span>
                                    <span className="text-blue-500 text-[13px]">-₹{discount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[15px] font-bold">
                                    <span className="text-gray-500">Item total</span>
                                    <span className="text-gray-900">₹{order.total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[15px] font-bold">
                                    <span className="text-gray-500">Delivery charges</span>
                                    <span className="text-green-600 font-bold text-[13px]">FREE</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                    <span className="text-[18px] font-bold text-[#111]">Bill total</span>
                                    <span className="text-[18px] font-bold text-[#111]">₹{order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-[8px] bg-[#f8f9fb] -mx-12 mb-12"></div>

                        {/* Order Details */}
                        <div className="mb-12">
                            <h2 className="text-[20px] font-bold text-[#111] mb-8">Order details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Order id</p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[17px] font-bold text-[#111]">ORD{order.orderId}</p>
                                            <button onClick={handleCopyOrderId} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-gray-400'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Payment</p>
                                        <p className="text-[17px] font-bold text-[#111]">Paid via {order.paymentMethod?.name || 'UPI'}</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Deliver to</p>
                                        <p className="text-[17px] font-bold text-[#111] leading-relaxed">
                                            {order.address.address}, {order.address.city}, {order.address.pincode}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Order placed</p>
                                        <p className="text-[17px] font-bold text-[#111]">
                                            {new Date(order.timestamp).toLocaleDateString('en-GB', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: '2-digit'
                                            }).replace(',', "'")}, {new Date(order.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="h-[8px] bg-[#f8f9fb] -mx-12 mb-12"></div>

                        {/* Help Section */}
                        <div>
                            <h2 className="text-[22px] font-bold text-[#111] mb-8">Need help with your order?</h2>
                            <ChatWithUsCard onClick={openChat} className="!border-gray-100 !bg-white hover:!bg-gray-50" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderSummaryPage;

