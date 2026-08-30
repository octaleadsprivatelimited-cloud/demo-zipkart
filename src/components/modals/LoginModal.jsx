import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import {
    saveUserProfile,
    registerWithPassword,
    loginWithPassword,
    resetPassword,
    getUserProfile,
    loginWithGoogle
} from '../../services/userService';

const LoginModal = () => {
    const { isLoginOpen, toggleLogin } = useCart();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Auth mode: 'otp' | 'password'
    const [authMode, setAuthMode] = useState('otp');
    // Step for OTP flow: 'phone' | 'otp' | 'personalData'
    const [step, setStep] = useState('phone');
    // For password mode: login or register
    const [isNewUser, setIsNewUser] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Personal data state
    const [personalData, setPersonalData] = useState({
        name: '',
        email: '',
        gender: '',
        dateOfBirth: ''
    });
    const [verifiedUser, setVerifiedUser] = useState(null);

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Cleanup recaptcha on unmount
    useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.log('Recaptcha cleanup error:', e);
                }
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    // Reset state when switching modes
    const switchToPasswordMode = () => {
        setAuthMode('password');
        setError('');
        setPassword('');
        setConfirmPassword('');
        // Clean up recaptcha
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.log('Recaptcha cleanup:', e);
            }
            window.recaptchaVerifier = null;
        }
    };

    const switchToOtpMode = () => {
        setAuthMode('otp');
        setStep('phone');
        setError('');
        setOtp('');
    };

    const setupRecaptcha = async () => {
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.log('Error clearing old recaptcha:', e);
            }
            window.recaptchaVerifier = null;
        }

        try {
            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                'recaptcha-container',
                {
                    size: 'invisible',
                    callback: () => {
                        console.log('reCAPTCHA verified successfully');
                    },
                    'expired-callback': () => {
                        console.log('reCAPTCHA expired');
                        if (window.recaptchaVerifier) {
                            window.recaptchaVerifier.clear();
                            window.recaptchaVerifier = null;
                        }
                    }
                }
            );

            await window.recaptchaVerifier.render();
            console.log('reCAPTCHA initialized and rendered');
        } catch (error) {
            console.error('Error creating RecaptchaVerifier:', error);
            throw error;
        }
    };

    const handleSendOTP = async () => {
        if (cooldown > 0) return;

        setLoading(true);
        setError('');

        try {
            await setupRecaptcha();
            const formatPh = '+91' + phoneNumber;
            console.log('Sending OTP to:', formatPh);

            const result = await signInWithPhoneNumber(
                auth,
                formatPh,
                window.recaptchaVerifier
            );

            window.confirmationResult = result;
            setStep('otp');
            setCooldown(60);

        } catch (err) {
            console.error('Error sending OTP:', err);

            let msg = 'Failed to send OTP. ';
            let cooldownTime = 30;

            switch (err.code) {
                case 'auth/invalid-app-credential':
                case 'auth/captcha-check-failed':
                    msg = 'OTP verification is currently unavailable. Please use password login instead.';
                    break;
                case 'auth/too-many-requests':
                    msg = 'Too many attempts. Please use password login or try OTP later.';
                    cooldownTime = 300;
                    break;
                case 'auth/invalid-phone-number':
                    msg = 'Invalid phone number format.';
                    cooldownTime = 0;
                    break;
                default:
                    msg = 'OTP service error. Please use password login instead.';
            }

            setError(msg);
            setCooldown(cooldownTime);

            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.log('Cleanup error:', e);
                }
                window.recaptchaVerifier = null;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await window.confirmationResult.confirm(otp);
            console.log('UID:', result.user.uid);
            const user = result.user;
            setVerifiedUser(user);

            // Check if user profile exists and has personal data
            const userProfile = await getUserProfile(user.uid);

            if (!userProfile || !userProfile.name) {
                // New user or user without personal data - show personal data form
                setStep('personalData');
            } else {
                // Existing user with personal data - complete login
                await saveUserProfile(user.uid, user.phoneNumber, 'otp');
                toggleLogin();
            }
        } catch (err) {
            console.error('Error verifying OTP:', err);
            setError('Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePersonalData = async () => {
        setLoading(true);
        setError('');

        // Validation
        if (!personalData.name.trim()) {
            setError('Please enter your name');
            setLoading(false);
            return;
        }

        if (!personalData.email.trim() || !personalData.email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        if (!personalData.gender) {
            setError('Please select your gender');
            setLoading(false);
            return;
        }

        if (!personalData.dateOfBirth) {
            setError('Please select your date of birth');
            setLoading(false);
            return;
        }

        try {
            // Save user profile with personal data
            await saveUserProfile(
                verifiedUser.uid,
                verifiedUser.phoneNumber,
                authMode === 'otp' ? 'otp' : 'password',
                personalData
            );

            // Reset personal data form
            setPersonalData({
                name: '',
                email: '',
                gender: '',
                dateOfBirth: ''
            });

            toggleLogin();
        } catch (err) {
            console.error('Error saving personal data:', err);
            setError('Failed to save your information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const result = await loginWithPassword(phoneNumber, password);
            const user = result.user;
            setVerifiedUser(user);

            // Check if user has personal data
            const userProfile = await getUserProfile(user.uid);

            if (!userProfile || !userProfile.name) {
                // User without personal data - show personal data form
                setAuthMode('password');
                setStep('personalData');
            } else {
                // Existing user with personal data - complete login
                toggleLogin();
            }
        } catch (err) {
            console.error('Error logging in:', err);

            if (err.code === 'auth/user-not-found') {
                setError('No account found. Please create a new account.');
                setIsNewUser(true);
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Incorrect password. Please try again.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid phone number format.');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordRegister = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const result = await registerWithPassword(phoneNumber, password);
            const user = result.user;
            setVerifiedUser(user);

            // New user - show personal data form
            setAuthMode('password');
            setStep('personalData');
        } catch (err) {
            console.error('Error registering:', err);

            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this number already exists. Please login instead.');
                setIsNewUser(false);
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Use at least 6 characters.');
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            await resetPassword(phoneNumber);
            setSuccessMessage('Password reset instructions sent! Check your email.');
        } catch (err) {
            console.error('Error resetting password:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this number.');
            } else {
                setError('Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await loginWithGoogle();
            const user = result.user;
            setVerifiedUser(user);

            // Check if user has complete personal data
            const userProfile = await getUserProfile(user.uid);

            // Check if user needs to complete profile (missing gender or dateOfBirth)
            if (!userProfile || !userProfile.gender || !userProfile.dateOfBirth) {
                // Pre-fill form with Google data if available
                setPersonalData({
                    name: user.displayName || userProfile?.name || '',
                    email: user.email || userProfile?.email || '',
                    gender: userProfile?.gender || '',
                    dateOfBirth: userProfile?.dateOfBirth || ''
                });
                setAuthMode('google');
                setStep('personalData');
            } else {
                // Existing user with complete data - skip form and log in directly
                console.log('✅ Existing Google user logged in:', userProfile.email);
                toggleLogin();
            }
        } catch (err) {
            console.error('Error logging in with Google:', err);

            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign-in cancelled. Please try again.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Popup blocked. Please allow popups and try again.');
            } else {
                setError('Google sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Body scroll lock effect
    useEffect(() => {
        if (isLoginOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isLoginOpen]);

    if (!isLoginOpen) return null;

    return (
        <>
            {/* Invisible reCAPTCHA container - required for Firebase Phone Auth */}
            <div id="recaptcha-container"></div>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
                <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-[95vw] sm:max-w-sm overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-200">
                    <button
                        onClick={toggleLogin}
                        className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>

                    {(step === 'otp' || authMode === 'password') && (
                        <button
                            onClick={() => {
                                if (authMode === 'password') {
                                    switchToOtpMode();
                                } else {
                                    setStep('phone');
                                }
                            }}
                            className="absolute top-4 left-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-500" />
                        </button>
                    )}

                    <div className="p-4 sm:p-6 pb-4 sm:pb-5">
                        <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
                            <div className="w-20 h-14 sm:w-24 sm:h-16 flex items-center justify-center mb-0.5 sm:mb-1">
                                <img src="/images/logos/zipcart-login-logo.png" alt="ZipCart" className="w-full h-full object-contain" />
                            </div>

                            {/* OTP Mode - Phone Step */}
                            {authMode === 'otp' && step === 'phone' && (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900">Fresh and Fast delivery</h2>
                                    <p className="text-gray-500 font-medium">Log in or Sign up</p>

                                    <div className="w-full mt-4">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+91</span>
                                            <input
                                                type="tel"
                                                placeholder="Enter mobile number"
                                                className="w-full border border-gray-300 rounded-xl pl-14 pr-4 py-3.5 text-lg outline-none focus:border-green-700 transition-all font-bold tracking-wider"
                                                autoFocus
                                                value={phoneNumber}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setPhoneNumber(val);
                                                }}
                                            />
                                        </div>
                                        {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                                    </div>

                                    <button
                                        onClick={handleSendOTP}
                                        disabled={phoneNumber.length !== 10 || loading || cooldown > 0}
                                        className={`w-full font-bold py-3.5 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 ${phoneNumber.length === 10 && !loading && cooldown === 0
                                            ? 'bg-green-700 hover:bg-green-800 text-white cursor-pointer shadow-md'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : cooldown > 0 ? `Wait ${cooldown}s` : 'Continue with OTP'}
                                    </button>

                                    <div className="w-full flex items-center gap-3 my-2">
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                        <span className="text-gray-400 text-sm">or</span>
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>

                                    <button
                                        onClick={switchToPasswordMode}
                                        disabled={phoneNumber.length !== 10}
                                        className={`w-full font-bold py-3.5 rounded-xl transition-all border-2 ${phoneNumber.length === 10
                                            ? 'border-green-700 text-green-700 hover:bg-green-50 cursor-pointer'
                                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        Use Password Instead
                                    </button>

                                    <button
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className="w-full font-semibold py-3.5 rounded-xl transition-all border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>
                                </>
                            )}

                            {/* OTP Mode - Verify Step */}
                            {authMode === 'otp' && step === 'otp' && (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900">OTP Verification</h2>
                                    <p className="text-gray-500 font-medium">Enter code sent to +91 {phoneNumber}</p>

                                    <div className="w-full mt-4">
                                        <input
                                            type="tel"
                                            placeholder="Enter 6-digit code"
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-center text-2xl outline-none focus:border-green-700 transition-all font-bold tracking-[0.5em]"
                                            autoFocus
                                            value={otp}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setOtp(val);
                                            }}
                                        />
                                        {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                                    </div>

                                    <button
                                        onClick={handleVerifyOTP}
                                        disabled={otp.length !== 6 || loading}
                                        className={`w-full font-bold py-3.5 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 ${otp.length === 6 && !loading
                                            ? 'bg-green-700 hover:bg-green-800 text-white cursor-pointer shadow-md'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                                    </button>

                                    <p className="text-xs text-gray-400 mt-4">
                                        Didn't receive code?{' '}
                                        {cooldown > 0 ? (
                                            <span className="text-gray-500">Resend in {cooldown}s</span>
                                        ) : (
                                            <button
                                                onClick={handleSendOTP}
                                                disabled={loading}
                                                className="text-green-700 font-bold hover:underline disabled:text-gray-400"
                                            >
                                                Resend
                                            </button>
                                        )}
                                    </p>

                                    <button
                                        onClick={switchToPasswordMode}
                                        className="text-sm text-green-700 font-medium hover:underline mt-2"
                                    >
                                        Use Password Instead
                                    </button>
                                </>
                            )}

                            {/* Personal Data Collection Step */}
                            {step === 'personalData' && (
                                <>
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Complete Your Profile</h2>
                                    <p className="text-gray-500 text-xs sm:text-sm font-medium">Tell us a bit about yourself</p>

                                    <div className="w-full mt-2 sm:mt-3 space-y-2 sm:space-y-2.5">
                                        {/* Name */}
                                        <input
                                            type="text"
                                            placeholder="Full Name *"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base outline-none focus:border-green-700 transition-all"
                                            value={personalData.name}
                                            onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                                            required
                                            autoFocus
                                        />

                                        {/* Email */}
                                        <input
                                            type="email"
                                            placeholder="Email Address *"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base outline-none focus:border-green-700 transition-all"
                                            value={personalData.email}
                                            onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                                            required
                                        />

                                        {/* Gender */}
                                        <div>
                                            <label className="block text-xs sm:text-xs font-bold text-gray-700 mb-1 sm:mb-1.5 text-left">Gender <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Male', 'Female', 'Other'].map((gender) => (
                                                    <button
                                                        key={gender}
                                                        type="button"
                                                        onClick={() => setPersonalData({ ...personalData, gender })}
                                                        className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-lg border-2 font-medium transition-all text-xs sm:text-sm ${personalData.gender === gender
                                                            ? 'border-green-700 bg-green-50 text-green-700'
                                                            : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                                            }`}
                                                    >
                                                        {gender}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label className="block text-xs sm:text-xs font-bold text-gray-700 mb-1 sm:mb-1.5 text-left">Date of Birth <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base outline-none focus:border-green-700 transition-all"
                                                value={personalData.dateOfBirth}
                                                onChange={(e) => setPersonalData({ ...personalData, dateOfBirth: e.target.value })}
                                                required
                                            />
                                        </div>

                                        {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                                    </div>

                                    <button
                                        onClick={handleSavePersonalData}
                                        disabled={loading}
                                        className={`w-full font-bold py-2.5 sm:py-3 rounded-lg mt-2 sm:mt-3 transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${!loading
                                            ? 'bg-green-700 hover:bg-green-800 text-white cursor-pointer shadow-md'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Continue'}
                                    </button>
                                </>
                            )}

                            {/* Password Mode */}
                            {authMode === 'password' && step !== 'personalData' && (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {isNewUser ? 'Create Account' : 'Welcome Back'}
                                    </h2>
                                    <p className="text-gray-500 font-medium">
                                        {isNewUser ? 'Set up your password' : 'Login with your password'}
                                    </p>

                                    <div className="w-full mt-4 space-y-3">
                                        {/* Phone Number Display */}
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+91</span>
                                            <input
                                                type="tel"
                                                className="w-full border border-gray-200 rounded-xl pl-14 pr-4 py-3.5 text-lg outline-none bg-gray-50 font-bold tracking-wider"
                                                value={phoneNumber}
                                                disabled
                                            />
                                        </div>

                                        {/* Password Input */}
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Enter password"
                                                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-lg outline-none focus:border-green-700 transition-all pr-12"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {/* Confirm Password (for registration) */}
                                        {isNewUser && (
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Confirm password"
                                                    className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-lg outline-none focus:border-green-700 transition-all pr-12"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
                                        {successMessage && <p className="text-green-600 text-xs font-medium">{successMessage}</p>}
                                    </div>

                                    <button
                                        onClick={isNewUser ? handlePasswordRegister : handlePasswordLogin}
                                        disabled={password.length < 6 || loading || (isNewUser && confirmPassword.length < 6)}
                                        className={`w-full font-bold py-3.5 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 ${password.length >= 6 && !loading && (!isNewUser || confirmPassword.length >= 6)
                                            ? 'bg-green-700 hover:bg-green-800 text-white cursor-pointer shadow-md'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isNewUser ? 'Create Account' : 'Login'}
                                    </button>

                                    <div className="flex flex-col items-center gap-2 mt-3">
                                        <button
                                            onClick={() => setIsNewUser(!isNewUser)}
                                            className="text-sm text-green-700 font-medium hover:underline"
                                        >
                                            {isNewUser ? 'Already have an account? Login' : 'New user? Create account'}
                                        </button>

                                        {!isNewUser && (
                                            <button
                                                onClick={handleForgotPassword}
                                                disabled={loading}
                                                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                                            >
                                                Forgot Password?
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            <p className="text-[10px] text-gray-400 mt-4 leading-relaxed px-4">
                                By continuing, you agree to our Terms of Service & Privacy Policy.
                                Message and data rates may apply.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginModal;
