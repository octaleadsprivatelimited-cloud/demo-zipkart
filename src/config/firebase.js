// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC97-RP5dc2utAV8MrZpm8LX0QwSveCnQc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "zipcart-e4531.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zipcart-e4531",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "zipcart-e4531.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "528301618924",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:528301618924:web:6643849a09b6de49bf57c9",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1Q3GDXSPB5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Enable App Check debug mode for localhost development
// This generates a debug token that must be registered in Firebase Console
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Initialize App Check with reCAPTCHA Enterprise
// Required for Firebase Phone Auth in SDK v12+
if (typeof window !== 'undefined') {
    try {
        const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
            || import.meta.env.VITE_RECAPTCHA_SITE_KEY;
        if (recaptchaSiteKey) {
            initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        }
    } catch {
        // App Check initialization failed - phone auth may not work
    }
}

// Initialize Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Set auth persistence to LOCAL (persist across browser sessions and page refreshes)
setPersistence(auth, browserLocalPersistence).catch(() => {
    // Silently handle persistence errors
});

// Export Firebase services for use in other files
export { app, analytics, auth, db, storage, functions, GoogleAuthProvider };
