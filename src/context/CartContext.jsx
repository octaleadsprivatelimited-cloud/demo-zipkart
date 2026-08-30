/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { emailToPhone } from '../services/userService';
import { getMembership } from '../services/membershipService';
import { getFrontImage } from '../utils/imageUtils';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [membership, setMembership] = useState(null);

    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Determine phone number from either phone auth or email-based auth
                let phoneNumber = firebaseUser.phoneNumber;
                if (!phoneNumber && firebaseUser.email) {
                    // Extract phone from email format (e.g., 9876543210@zipcart.app)
                    phoneNumber = emailToPhone(firebaseUser.email);
                }

                setUser({
                    ...firebaseUser,
                    uid: firebaseUser.uid,
                    phoneNumber: phoneNumber,
                    email: firebaseUser.email,
                    authMethod: firebaseUser.phoneNumber ? 'otp' : 'password'
                });
            } else {
                setUser(null);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch membership when user changes
    useEffect(() => {
        const fetchMembership = async () => {
            if (user?.uid) {
                const mem = await getMembership(user.uid);
                setMembership(mem);
            } else {
                setMembership(null);
            }
        };
        fetchMembership();
    }, [user]);

    const addToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => {
                    if (item.id !== product.id) return item;
                    // Update quantity AND refresh price/mrp if the incoming product has valid values
                    const updatedItem = { ...item, quantity: item.quantity + 1 };
                    if (product.price > 0) updatedItem.price = product.price;
                    if (product.mrp > 0) updatedItem.mrp = product.mrp;
                    if (product.originalPrice > 0) updatedItem.originalPrice = product.originalPrice;
                    return updatedItem;
                });
            }
            // Use front image for cart display
            const frontImage = getFrontImage(product);
            return [...prev, { ...product, image: frontImage || product.image, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCartItems(prev => {
            return prev.map(item => {
                if (item.id === productId) {
                    return { ...item, quantity: Math.max(0, item.quantity + delta) };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const decreaseQuantity = (productId) => {
        updateQuantity(productId, -1);
    };

    const cartTotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [cartItems]);

    const cartCount = useMemo(() => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    }, [cartItems]);

    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [location, setLocation] = useState('Banjara Hills, Hyderabad');
    const [isCartOpen, setIsCartOpen] = useState(false);

    const toggleLocation = () => setIsLocationOpen(!isLocationOpen);
    const toggleCart = () => setIsCartOpen(!isCartOpen);

    const toggleLogin = () => setIsLoginOpen(!isLoginOpen);

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        cartTotal,
        cartCount,
        isLoginOpen,
        toggleLogin,
        isLocationOpen,
        toggleLocation,
        location,
        setLocation,
        isCartOpen,
        toggleCart,
        decreaseQuantity,
        user,
        logout,
        authLoading,
        membership,
        setMembership,
        clearCart: () => setCartItems([])
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

