import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useSupportChat } from '../../context/SupportChatContext';
import ChatWithUsCard from '../../components/support/ChatWithUsCard';
import {
    Package,
    MapPinHouse,
    Receipt,
    ShieldCheck,
    LogOut,
    ChevronRight,
    CheckCircle2,
    ChevronDown,
    Crown,
    Briefcase,
    Truck,
    Gift,
    Info
} from 'lucide-react';
import { getMembership } from '../../services/membershipService';
import { getUserOrders } from '../../services/orderService';
import { addUserAddress, getUserAddresses, updateUserAddress, deleteUserAddress, getUserProfile, updateUserPersonalData } from '../../services/userService';
import AddressModal from '../../components/modals/AddressModal';


const AccountPage = () => {
    const navigate = useNavigate();
    const { user, logout, toggleLogin, sessionOrders } = useCart();
    const { openChat } = useSupportChat();
    const [orders, setOrders] = useState([]);
    const [showPersonalDataModal, setShowPersonalDataModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showDataPrivacyModal, setShowDataPrivacyModal] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [personalData, setPersonalData] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        dateOfBirth: ''
    });
    const [membership, setMembership] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);


    const [searchParams, setSearchParams] = useSearchParams();
    // Default to 'orders' if no tab param is present
    const activeTab = searchParams.get('tab') || 'orders';

    const loadAddresses = React.useCallback(async () => {
        if (!user) return;
        try {
            const userAddresses = await getUserAddresses(user.uid);
            setAddresses(userAddresses);
        } catch (error) {
            console.error("Failed to load addresses", error);
        }
    }, [user]);

    // Effect to syncing state is no longer needed as we rely on URL


    useEffect(() => {
        if (user) {
            // Load orders from Firestore and merge with session orders
            const loadOrders = async () => {
                try {
                    const firestoreOrders = (await getUserOrders(user.uid)) || [];

                    // Combine Firestore orders with Session orders
                    // Use a Map to map by Order ID to prevent duplicates
                    const combinedOrders = new Map();

                    // Add Firestore orders first
                    if (Array.isArray(firestoreOrders)) {
                        firestoreOrders.forEach(o => combinedOrders.set(o.orderId.toString(), o));
                    }

                    // Add Session orders (if not present)
                    if (Array.isArray(sessionOrders)) {
                        sessionOrders.forEach(o => {
                            if (!combinedOrders.has(o.orderId.toString())) {
                                combinedOrders.set(o.orderId.toString(), o);
                            }
                        });
                    }

                    setOrders(Array.from(combinedOrders.values()).sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)));

                } catch (error) {
                    console.error('Error loading orders:', error);
                    // Fallback to session orders only
                    setOrders(sessionOrders || []);
                }
            };
            loadOrders();

            // Load personal data (moved to useState initialization, but keeping update here if user changes)
            // Or better: use user object directly in rendering if possible, or Sync only on change
            // To fix lint: we'll check if it changed
            // Load or create sessions
            let activeSessions = JSON.parse(localStorage.getItem('activeSessions') || '[]');
            if (activeSessions.length === 0) {
                activeSessions = [{
                    id: Date.now(),
                    device: 'Current Device',
                    browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser',
                    location: 'Hyderabad, India',
                    loginTime: new Date().toISOString(),
                    isCurrent: true
                }];
                localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSessions(activeSessions);

            // Load membership
            const loadMembership = async () => {
                const mem = await getMembership(user.uid);
                setMembership(mem);
            };
            loadMembership();

            // Load addresses
            loadAddresses();

            // Load personal data from Firestore
            const loadPersonalData = async () => {
                try {
                    const userProfile = await getUserProfile(user.uid);
                    if (userProfile) {
                        setPersonalData({
                            name: userProfile.name || '',
                            email: userProfile.email || '',
                            phone: userProfile.phoneNumber || user.phoneNumber || '',
                            gender: userProfile.gender || '',
                            dateOfBirth: userProfile.dateOfBirth || ''
                        });
                    }
                } catch (error) {
                    console.error('Error loading personal data:', error);
                }
            };
            loadPersonalData();
        }
    }, [user, sessionOrders, setOrders, setSessions, setMembership, loadAddresses]);



    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-zipcart-green" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
                    <p className="text-gray-600 mb-6">Please login to view your account</p>
                    <button
                        onClick={toggleLogin}
                        className="w-full bg-zipcart-green hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Login Now
                    </button>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: 'addresses', label: 'My Addresses', icon: MapPinHouse },
        { id: 'orders', label: 'My Orders', icon: Receipt },
        { id: 'membership', label: 'My Membership', icon: Crown },
        { id: 'faqs', label: "FAQ's", icon: Receipt },
        { id: 'privacy', label: 'Account privacy', icon: ShieldCheck },
    ];

    // Helper function to format order date
    const getOrderDate = (order) => {
        if (order.createdAt?.toDate) {
            return order.createdAt.toDate();
        } else if (order.createdAt?.seconds) {
            return new Date(order.createdAt.seconds * 1000);
        } else if (order.timestamp) {
            return new Date(order.timestamp);
        }
        return new Date();
    };

    // Helper function to get order total
    const getOrderTotal = (order) => {
        return order.pricing?.total || order.total || 0;
    };

    // Helper function to get order status display
    const getStatusDisplay = (order) => {
        const status = order.status || 'placed';
        const statusMap = {
            'placed': { text: 'Order Placed', color: 'text-blue-600' },
            'confirmed': { text: 'Confirmed', color: 'text-green-600' },
            'partially_delivered': { text: 'Partially Delivered', color: 'text-orange-600' },
            'completed': { text: 'Delivered', color: 'text-green-600' },
            'cancelled': { text: 'Cancelled', color: 'text-red-600' },
            'pending': { text: 'Pending', color: 'text-yellow-600' },
            'success': { text: 'Completed', color: 'text-green-600' },
            'failed': { text: 'Failed', color: 'text-red-600' }
        };
        return statusMap[status] || { text: status, color: 'text-gray-600' };
    };

    const OrderCard = ({ order }) => {
        const orderDate = getOrderDate(order);
        const orderTotal = getOrderTotal(order);
        const statusInfo = getStatusDisplay(order);

        return (
            <div
                onClick={() => navigate(`/order-summary/${order.orderId}`)}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer mb-6"
            >
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-[#f0fcf2] rounded-xl flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-[#0c831f]" />
                            </div>
                            <div>
                                <h3 className="text-[20px] font-bold text-[#111] mb-1">
                                    {order.orderId}
                                </h3>
                                <div className="flex items-center gap-2 text-[15px] font-bold text-gray-500">
                                    <span className={statusInfo.color}>{statusInfo.text}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>₹{orderTotal}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, {orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
                    </div>

                    {/* Items Preview Area */}
                    <div className="mt-6 p-1 rounded-2xl border border-gray-100 w-fit flex flex-wrap gap-2">
                        {order.items.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="w-[72px] h-[72px] bg-white rounded-xl p-2 flex items-center justify-center overflow-hidden">
                                <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                        ))}
                        {order.items.length > 4 && (
                            <div className="w-[72px] h-[72px] bg-gray-50 rounded-xl flex items-center justify-center text-sm font-bold text-gray-400">
                                +{order.items.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleSavePersonalData = async () => {
        try {
            await updateUserPersonalData(user.uid, personalData);
            setShowPersonalDataModal(false);
            alert('Personal data updated successfully!');
        } catch (error) {
            console.error('Error updating personal data:', error);
            alert('Failed to update personal data. Please try again.');
        }
    };

    const handleSaveAddress = async (addressData) => {
        try {
            if (editingAddress) {
                await updateUserAddress(user.uid, editingAddress.id, addressData);
                alert('Address updated successfully!');
            } else {
                await addUserAddress(user.uid, addressData);
                alert('Address added successfully!');
            }
            setShowAddressModal(false);
            setEditingAddress(null);
            loadAddresses();
        } catch (error) {
            console.error('Error saving address:', error);
            alert('Failed to save address');
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (window.confirm('Are you sure you want to delete this address?')) {
            try {
                await deleteUserAddress(user.uid, addressId);
                loadAddresses();
            } catch (error) {
                console.error('Error deleting address:', error);
                alert('Failed to delete address');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fb]">
            {/* Personal Data Modal */}
            {showPersonalDataModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl sm:rounded-[24px] w-full max-w-[95vw] sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 sm:p-6 flex items-center justify-between rounded-t-xl sm:rounded-t-[24px] z-10">
                            <div>
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111]">Personal Data</h2>
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Manage your profile info</p>
                            </div>
                            <button
                                onClick={() => setShowPersonalDataModal(false)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 text-gray-400 rotate-180" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-[#111] mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={personalData.name}
                                    onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0c831f] focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-[#111] mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={personalData.email}
                                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                                    placeholder="your.email@example.com"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0c831f] focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-[#111] mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={personalData.phone}
                                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                                    placeholder="+91 9876543210"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0c831f] focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                />
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-[#111] mb-2">Gender</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Male', 'Female', 'Other'].map((gender) => (
                                        <button
                                            key={gender}
                                            onClick={() => setPersonalData({ ...personalData, gender })}
                                            className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${personalData.gender === gender
                                                ? 'border-[#0c831f] bg-green-50 text-[#0c831f]'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {gender}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="block text-sm font-bold text-[#111] mb-2">Date of Birth</label>
                                <input
                                    type="date"
                                    value={personalData.dateOfBirth}
                                    onChange={(e) => setPersonalData({ ...personalData, dateOfBirth: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#0c831f] focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold text-[#111]">Privacy Note:</span> Your personal information is securely stored and will only be used to improve your shopping experience.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex gap-3 rounded-b-[24px]">
                            <button
                                onClick={() => setShowPersonalDataModal(false)}
                                className="flex-1 py-3 px-6 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePersonalData}
                                className="flex-1 py-3 px-6 bg-[#0c831f] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Address Modal */}
            <AddressModal
                isOpen={showAddressModal}
                onClose={() => {
                    setShowAddressModal(false);
                    setEditingAddress(null);
                }}
                onSave={handleSaveAddress}
                initialData={editingAddress}
                user={user}
            />

            {/* Login & Security Modal */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[24px] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-[24px] z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-[#111]">Login & Security</h2>
                                <p className="text-sm text-gray-500 mt-1">Manage your active sessions and devices</p>
                            </div>
                            <button
                                onClick={() => setShowSecurityModal(false)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 text-gray-400 rotate-180" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-[#111] mb-4">Active Sessions</h3>
                                <div className="space-y-3">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`p-5 rounded-[16px] border-2 ${session.isCurrent
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-gray-200 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-bold text-[#111]">{session.device}</p>
                                                        {session.isCurrent && (
                                                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <p className="flex items-center gap-2">
                                                            <span className="font-medium">Browser:</span>
                                                            <span>{session.browser}</span>
                                                        </p>
                                                        <p className="flex items-center gap-2">
                                                            <span className="font-medium">Location:</span>
                                                            <span>{session.location}</span>
                                                        </p>
                                                        <p className="flex items-center gap-2">
                                                            <span className="font-medium">Login Time:</span>
                                                            <span>{new Date(session.loginTime).toLocaleString()}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                {!session.isCurrent && (
                                                    <button
                                                        onClick={() => {
                                                            const updatedSessions = sessions.filter(s => s.id !== session.id);
                                                            setSessions(updatedSessions);
                                                            localStorage.setItem('activeSessions', JSON.stringify(updatedSessions));
                                                        }}
                                                        className="ml-4 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        Logout
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Security Actions */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-[#111] mb-4">Security Actions</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            const currentSession = sessions.find(s => s.isCurrent);
                                            setSessions(currentSession ? [currentSession] : []);
                                            localStorage.setItem('activeSessions', JSON.stringify(currentSession ? [currentSession] : []));
                                            alert('All other sessions have been logged out!');
                                        }}
                                        className="w-full p-4 border-2 border-orange-200 bg-orange-50 rounded-[16px] hover:border-orange-300 hover:bg-orange-100 transition-all text-left"
                                    >
                                        <p className="font-bold text-orange-900">Logout All Other Devices</p>
                                        <p className="text-sm text-orange-700 mt-1">End all sessions except this one</p>
                                    </button>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold text-[#111]">Security Tip:</span> If you see any unfamiliar sessions, logout immediately and change your password.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-[24px]">
                            <button
                                onClick={() => setShowSecurityModal(false)}
                                className="w-full py-3 px-6 bg-[#0c831f] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data & Privacy Modal */}
            {showDataPrivacyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-[24px] z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-[#111]">Data & Privacy</h2>
                                <p className="text-sm text-gray-500 mt-1">Manage how your information is used</p>
                            </div>
                            <button
                                onClick={() => setShowDataPrivacyModal(false)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 text-gray-400 rotate-180" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Download Your Data */}
                            <div>
                                <h3 className="text-lg font-bold text-[#111] mb-4">Your Data</h3>
                                <button
                                    onClick={() => {
                                        const userData = {
                                            user: JSON.parse(localStorage.getItem('user') || '{}'),
                                            orders: JSON.parse(localStorage.getItem('orders') || '[]'),
                                            giftCards: JSON.parse(localStorage.getItem('giftCards') || '[]'),
                                            cartItems: JSON.parse(localStorage.getItem('cartItems') || '[]'),
                                            sessions: JSON.parse(localStorage.getItem('activeSessions') || '[]')
                                        };

                                        const dataStr = JSON.stringify(userData, null, 2);
                                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                        const url = URL.createObjectURL(dataBlob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `zipcart-data-${Date.now()}.json`;
                                        link.click();
                                        URL.revokeObjectURL(url);

                                        alert('Your data has been downloaded!');
                                    }}
                                    className="w-full p-5 border-2 border-blue-200 bg-blue-50 rounded-[16px] hover:border-blue-300 hover:bg-blue-100 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-blue-900 text-lg">Download Your Data</p>
                                            <p className="text-sm text-blue-700 mt-1">Get a copy of all your information in JSON format</p>
                                        </div>
                                        <FileText className="w-8 h-8 text-blue-600" />
                                    </div>
                                </button>
                            </div>

                            {/* Privacy Settings */}
                            <div>
                                <h3 className="text-lg font-bold text-[#111] mb-4">Privacy Settings</h3>
                                <div className="space-y-3">
                                    {/* Marketing Preferences */}
                                    <div className="p-4 border-2 border-gray-200 rounded-[16px]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-bold text-[#111]">Marketing Communications</p>
                                                <p className="text-sm text-gray-600 mt-1">Receive promotional emails and offers</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0c831f]"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Location Tracking */}
                                    <div className="p-4 border-2 border-gray-200 rounded-[16px]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-bold text-[#111]">Location Services</p>
                                                <p className="text-sm text-gray-600 mt-1">Allow location access for better delivery</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0c831f]"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Analytics */}
                                    <div className="p-4 border-2 border-gray-200 rounded-[16px]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-bold text-[#111]">Usage Analytics</p>
                                                <p className="text-sm text-gray-600 mt-1">Help us improve by sharing usage data</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0c831f]"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Retention */}
                            <div>
                                <h3 className="text-lg font-bold text-[#111] mb-4">Data Retention</h3>
                                <div className="p-5 border-2 border-gray-200 rounded-[16px] bg-gray-50">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        We retain your personal data for as long as necessary to provide our services.
                                        You can request deletion of your data at any time from the Account Privacy section.
                                    </p>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold text-[#111]">Your Privacy Matters:</span> We are committed to protecting your data.
                                    Read our <span className="text-[#0c831f] font-bold cursor-pointer hover:underline">Privacy Policy</span> to learn more.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-[24px]">
                            <button
                                onClick={() => setShowDataPrivacyModal(false)}
                                className="w-full py-3 px-6 bg-[#0c831f] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row pt-6 sm:pt-8 lg:pt-12 pb-12 sm:pb-16 lg:pb-20 px-3 sm:px-4">
                {/* Sidebar - Hidden on mobile, visible on large screens */}
                <div className="hidden lg:block w-[260px] flex-shrink-0">
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden sticky top-28">
                        {/* User Header */}
                        <div className="p-6 text-center border-b border-gray-50 bg-gray-50/30">
                            <p className="text-[15px] font-bold text-gray-500 tracking-wider">
                                {user.phoneNumber || 'Phone Number'}
                            </p>
                        </div>

                        {/* Navigation Links */}
                        <div className="py-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Switching to tab:', item.id);
                                            setSearchParams({ tab: item.id });
                                        }}
                                        className={`w-full flex items-center gap-4 px-6 py-4 text-[15px] font-bold transition-all ${activeTab === item.id
                                            ? 'bg-[#f0fcf2] text-[#0c831f] border-r-[4px] border-[#0c831f]'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-[#0c831f]' : 'text-gray-400'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    logout();
                                }}
                                className="w-full flex items-center gap-4 px-6 py-4 text-[15px] font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all group mt-1"
                            >
                                <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Tab Navigation - Visible only on mobile/tablet */}
                <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 pb-2 min-w-max">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSearchParams({ tab: item.id })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === item.id
                                        ? 'bg-[#0c831f] text-white shadow-md'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 lg:ml-8">
                    {activeTab === 'orders' && (
                        <div className="space-y-3 sm:space-y-4">
                            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#111] mb-4 sm:mb-6">Your Orders</h2>
                            {(!orders || orders.length === 0) ? (
                                <div className="bg-white rounded-xl sm:rounded-[20px] border border-gray-100 p-6 sm:p-8 lg:p-12 text-center shadow-sm">
                                    <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-100 mx-auto mb-3 sm:mb-4" />
                                    <h3 className="text-lg sm:text-xl font-bold text-[#111] mb-2">No orders placed yet</h3>
                                    <p className="text-sm sm:text-base text-gray-500 font-medium mb-6 sm:mb-8 max-w-sm mx-auto">Looks like you haven't placed any orders. Start browsing our collection!</p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="bg-[#0c831f] hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-100"
                                    >
                                        Explore Products
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 sm:space-y-6">
                                    {orders.map((order) => (
                                        <OrderCard key={order.orderId} order={order} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex items-center sm:items-end justify-between gap-3">
                                <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#111]">Saved Addresses</h2>
                                <button
                                    onClick={() => {
                                        setEditingAddress(null);
                                        setShowAddressModal(true);
                                    }}
                                    className="bg-[#0c831f] text-white font-bold px-4 py-2 rounded-lg shadow-md shadow-green-50 hover:bg-green-700 transition-all text-sm"
                                >
                                    + Add New
                                </button>
                            </div>
                            {addresses.length === 0 ? (
                                <div className="text-center py-8 sm:py-12 bg-white rounded-xl sm:rounded-[20px] border border-gray-100 shadow-sm">
                                    <MapPinHouse className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-[#111] mb-2">No addresses saved</h3>
                                    <p className="text-gray-500 font-medium mb-6">Add an address for faster checkout</p>
                                    <button
                                        onClick={() => setShowAddressModal(true)}
                                        className="text-[#0c831f] font-bold hover:underline"
                                    >
                                        Add Address Now
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map((addr) => (
                                        <div key={addr.id} className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group">
                                            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-green-50 transition-colors">
                                                {addr.type === 'Home' && <MapPinHouse className="w-5 h-5 text-gray-600 group-hover:text-[#0c831f]" />}
                                                {addr.type === 'Work' && <Briefcase className="w-5 h-5 text-gray-600 group-hover:text-[#0c831f]" />}
                                                {addr.type !== 'Home' && addr.type !== 'Work' && <MapPinHouse className="w-5 h-5 text-gray-600 group-hover:text-[#0c831f]" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-bold text-[#111] text-[18px]">{addr.type}</h3>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-500 leading-relaxed mb-4">
                                                    {addr.flatNo}, {addr.floor ? `${addr.floor}, ` : ''}{addr.area}, {addr.city} - {addr.pincode}
                                                </p>
                                                <div className="flex gap-4 border-t border-gray-50 pt-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAddress(addr);
                                                            setShowAddressModal(true);
                                                        }}
                                                        className="text-[11px] font-bold text-[#0c831f] uppercase tracking-widest hover:opacity-70 transition-opacity"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAddress(addr.id)}
                                                        className="text-[11px] font-bold text-red-500 uppercase tracking-widest hover:opacity-70 transition-opacity"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}





                    {activeTab === 'faqs' && (
                        <div className="bg-white rounded-[24px] border border-gray-100 p-10 shadow-sm">
                            <h2 className="text-[32px] font-bold text-[#111] mb-2">Frequently Asked Questions</h2>
                            <p className="text-gray-500 mb-10">Find answers to common questions</p>

                            <div className="space-y-4">
                                {[
                                    {
                                        q: "How do I place an order?",
                                        a: "Simply browse our products, add items to your cart, and proceed to checkout. You can pay online or choose cash on delivery."
                                    },
                                    {
                                        q: "What is the delivery time?",
                                        a: "We offer 10-minute delivery in select areas. Standard delivery usually takes 30-45 minutes depending on your location."
                                    },
                                    {
                                        q: "Can I return an item?",
                                        a: "Yes, you can return items at the time of delivery if you're not satisfied. For later returns, please contact our support within 24 hours."
                                    },
                                    {
                                        q: "How do I use my gift card?",
                                        a: "You can redeem your gift card code in the 'Payments' section or apply it directly at checkout."
                                    },
                                    {
                                        q: "Is my personal data safe?",
                                        a: "Absolutely. We use industry-standard encryption to protect your data. You can manage your privacy settings in the Account Privacy section."
                                    }
                                ].map((faq, i) => (
                                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-all">
                                        <details className="group">
                                            <summary className="flex items-center justify-between p-6 cursor-pointer bg-white hover:bg-gray-50 transition-colors list-none">
                                                <h3 className="text-lg font-bold text-[#111]">{faq.q}</h3>
                                                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="p-6 pt-0 bg-white">
                                                <p className="text-gray-600 leading-relaxed font-medium">{faq.a}</p>
                                            </div>
                                        </details>
                                    </div>
                                ))}
                            </div>

                            {/* Chat With Us */}
                            <div className="mt-12">
                                <h3 className="font-bold text-[#111] text-lg mb-4">Still need help?</h3>
                                <ChatWithUsCard onClick={openChat} className="!border-gray-200" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'membership' && (
                        <div className="space-y-4 sm:space-y-6">
                            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#111]">My Membership</h2>
                            {!membership?.isActive ? (
                                <div className="bg-white rounded-xl sm:rounded-[24px] border border-gray-100 p-6 sm:p-8 lg:p-10 text-center shadow-sm">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                        <Crown className="w-7 h-7 sm:w-10 sm:h-10 text-amber-500" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-[#111] mb-2">No active membership</h3>
                                    <p className="text-sm sm:text-base text-gray-500 font-medium mb-6 sm:mb-8 max-w-sm mx-auto">
                                        Join Zipcart Membership for ₹25 and get 15 free deliveries over 26 days!
                                    </p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="bg-[#0c831f] hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-100"
                                    >
                                        Upgrade Now
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Active Membership Card */}
                                    <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-8 rounded-[24px] text-white relative overflow-hidden shadow-xl shadow-amber-100">
                                        <Crown className="absolute top-[-20px] right-[-20px] w-48 h-48 opacity-10 rotate-12" />
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="px-3 py-1 bg-white/20 rounded-full text-[12px] font-bold tracking-widest uppercase">
                                                    Active Plan
                                                </div>
                                                <div className="text-[12px] font-bold opacity-80">
                                                    Expires on {new Date(membership.expiryDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-bold mb-8">Zipcart Premium</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                                    <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-1">Free Deliveries</p>
                                                    <p className="text-2xl font-bold">{membership.freeDeliveriesRemaining} Left</p>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                                    <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-1">Days Remaining</p>
                                                    <p className="text-2xl font-bold">{membership.daysRemaining} Days</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Benefits Summary */}
                                    <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm">
                                        <h4 className="font-bold text-[#111] text-lg mb-6">Active Benefits</h4>
                                        <div className="space-y-4">
                                            {[
                                                { title: 'Free Deliveries', desc: 'Zero delivery fee on your next 15 orders', icon: Truck },
                                                { title: 'Priority Support', desc: 'Get faster response from our customer care', icon: ShieldCheck },
                                                { title: 'Exclusive Deals', desc: 'Access to members-only discounts and offers', icon: Gift }
                                            ].map((benefit, i) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <benefit.icon className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#111]">{benefit.title}</p>
                                                        <p className="text-sm text-gray-500">{benefit.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FAQ Link */}
                            <div className="mt-8 p-6 bg-amber-50 border border-amber-100 rounded-[16px] flex items-center justify-between group cursor-pointer" onClick={() => setSearchParams({ tab: 'faqs' })}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        <Info className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#111]">Membership Questions?</p>
                                        <p className="text-sm text-gray-600">Check our FAQ for membership terms and conditions</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-amber-300 group-hover:text-amber-500 transition-all" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="bg-white rounded-xl sm:rounded-[20px] border border-gray-100 p-4 sm:p-6 lg:p-8 shadow-sm">
                            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-[#111] mb-4 sm:mb-6">Account Privacy</h2>
                            <div className="grid grid-cols-1 gap-6">
                                {/* Personal Data */}
                                <button
                                    onClick={() => setShowPersonalDataModal(true)}
                                    className="w-full flex items-center justify-between p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-[24px] border border-gray-100 hover:bg-gray-50 transition-all group text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base sm:text-lg lg:text-xl text-[#111]">Personal Data</p>
                                        <p className="text-xs sm:text-sm lg:text-[15px] font-medium text-gray-500 mt-1 sm:mt-2">Manage your profile and contact info.</p>
                                    </div>
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0 ml-3">
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-300 group-hover:text-gray-900 transition-all" />
                                    </div>
                                </button>

                                {/* Login & Security */}
                                <button
                                    onClick={() => setShowSecurityModal(true)}
                                    className="w-full flex items-center justify-between p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-[24px] border border-gray-100 hover:bg-gray-50 transition-all group text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base sm:text-lg lg:text-xl text-[#111]">Login & Security</p>
                                        <p className="text-xs sm:text-sm lg:text-[15px] font-medium text-gray-500 mt-1 sm:mt-2">Manage sessions and devices.</p>
                                    </div>
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0 ml-3">
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-300 group-hover:text-gray-900 transition-all" />
                                    </div>
                                </button>

                                {/* Data & Privacy */}
                                <button
                                    onClick={() => setShowDataPrivacyModal(true)}
                                    className="w-full flex items-center justify-between p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-[24px] border border-gray-100 hover:bg-gray-50 transition-all group text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base sm:text-lg lg:text-xl text-[#111]">Data & Privacy</p>
                                        <p className="text-xs sm:text-sm lg:text-[15px] font-medium text-gray-500 mt-1 sm:mt-2">Manage how your data is used.</p>
                                    </div>
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0 ml-3">
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-300 group-hover:text-gray-900 transition-all" />
                                    </div>
                                </button>

                                {/* Delete Account */}
                                <button
                                    onClick={() => {
                                        const confirmation = prompt('⚠️ WARNING: This action cannot be undone!\n\nType "DELETE MY ACCOUNT" to confirm account deletion:');

                                        if (confirmation === 'DELETE MY ACCOUNT') {
                                            const finalConfirm = confirm('Are you absolutely sure? All your data will be permanently deleted.');

                                            if (finalConfirm) {
                                                // Clear all user data
                                                localStorage.removeItem('user');
                                                localStorage.removeItem('orders');
                                                localStorage.removeItem('giftCards');
                                                localStorage.removeItem('cartItems');
                                                localStorage.removeItem('activeSessions');

                                                alert('Your account has been deleted. You will be logged out now.');
                                                window.location.href = '/';
                                            }
                                        } else if (confirmation !== null) {
                                            alert('Account deletion cancelled. The text did not match.');
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-8 rounded-[24px] border border-red-200 hover:bg-red-50 transition-all group text-left"
                                >
                                    <div>
                                        <p className="font-bold text-xl text-red-600">Delete Account</p>
                                        <p className="text-[15px] font-bold text-gray-500 mt-2 max-w-lg">Permanently close your account and delete all associated data.</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                                        <ChevronRight className="w-6 h-6 text-red-300 group-hover:text-red-600 transition-all" />
                                    </div>
                                </button>
                            </div>

                            {/* Privacy Information */}
                            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-[16px]">
                                <h3 className="font-bold text-[#111] mb-2">Your Privacy Matters</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    We take your privacy seriously. Your data is encrypted and stored securely.
                                    You have full control over your information and can request deletion at any time.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountPage;

