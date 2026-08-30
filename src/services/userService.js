import { db, auth, GoogleAuthProvider } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithPopup
} from 'firebase/auth';

// Convert phone number to email format for Firebase Auth
const phoneToEmail = (phoneNumber) => {
    // Remove any non-digit characters and country code prefix
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    return `${cleanPhone}@zipcart.app`;
};

// Extract phone number from email format
export const emailToPhone = (email) => {
    if (!email || !email.includes('@zipcart.app')) return null;
    const phone = email.split('@')[0];
    return `+91${phone}`;
};

/**
 * Register a new user with phone number and password
 * @param {string} phoneNumber - User's 10-digit phone number
 * @param {string} password - User's password (min 6 characters)
 */
export const registerWithPassword = async (phoneNumber, password) => {
    try {
        const email = phoneToEmail(phoneNumber);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user profile to Firestore
        await saveUserProfile(user.uid, `+91${phoneNumber}`, 'password');

        return { success: true, user };
    } catch (error) {

        throw error;
    }
};

/**
 * Login with phone number and password
 * @param {string} phoneNumber - User's 10-digit phone number
 * @param {string} password - User's password
 */
export const loginWithPassword = async (phoneNumber, password) => {
    try {
        const email = phoneToEmail(phoneNumber);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Update last login timestamp
        await saveUserProfile(userCredential.user.uid, `+91${phoneNumber}`, 'password');

        return { success: true, user: userCredential.user };
    } catch (error) {

        throw error;
    }
};

/**
 * Send password reset email
 * @param {string} phoneNumber - User's 10-digit phone number
 */
export const resetPassword = async (phoneNumber) => {
    try {
        const email = phoneToEmail(phoneNumber);
        await sendPasswordResetEmail(auth, email);

        return { success: true };
    } catch (error) {

        throw error;
    }
};

/**
 * Login with Google
 * Opens Google sign-in popup and authenticates user
 */
export const loginWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Extract Google profile data
        const googleProfileData = {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };



        // Save/update user profile with Google data
        await saveUserProfile(
            user.uid,
            user.phoneNumber || null,
            'google',
            googleProfileData
        );

        return { success: true, user };
    } catch (error) {

        throw error;
    }
};

/**
 * Save or update user profile in Firestore
 * @param {string} uid - Firebase Auth user ID
 * @param {string} phoneNumber - User's phone number
 * @param {string} authMethod - 'otp' or 'password'
 * @param {object} personalData - Optional personal data (name, email, gender, dateOfBirth)
 */
export const saveUserProfile = async (uid, phoneNumber, authMethod = 'otp', personalData = null) => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        const userData = {
            phoneNumber,
            authMethod,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Add personal data if provided
        if (personalData) {
            if (personalData.name) userData.name = personalData.name;
            if (personalData.email) userData.email = personalData.email;
            if (personalData.gender) userData.gender = personalData.gender;
            if (personalData.dateOfBirth) userData.dateOfBirth = personalData.dateOfBirth;
            if (personalData.photoURL) userData.photoURL = personalData.photoURL;
        }

        if (!userDoc.exists()) {
            // New user identification
            userData.createdAt = serverTimestamp();
            userData.role = 'user';
            userData.status = 'active';
        }

        await setDoc(userRef, userData, { merge: true });

        return { success: true, isNewUser: !userDoc.exists() };
    } catch (error) {

        throw error;
    }
};

/**
 * Get user profile from Firestore
 * @param {string} uid - Firebase Auth user ID
 */
export const getUserProfile = async (uid) => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() };
        }
        return null;
    } catch (error) {

        throw error;
    }
};

/**
 * Update user's personal data in Firestore
 * @param {string} uid - Firebase Auth user ID
 * @param {object} personalData - Personal data to update (name, email, gender, dateOfBirth)
 */
export const updateUserPersonalData = async (uid, personalData) => {
    try {
        const userRef = doc(db, 'users', uid);
        const updateData = {
            updatedAt: serverTimestamp()
        };

        // Only update provided fields
        if (personalData.name !== undefined) updateData.name = personalData.name;
        if (personalData.email !== undefined) updateData.email = personalData.email;
        if (personalData.gender !== undefined) updateData.gender = personalData.gender;
        if (personalData.dateOfBirth !== undefined) updateData.dateOfBirth = personalData.dateOfBirth;

        await setDoc(userRef, updateData, { merge: true });

        return { success: true };
    } catch (error) {

        throw error;
    }
};

/**
 * Add a new address for the user
 * @param {string} userId - User ID
 * @param {object} addressData - Address details
 */
export const addUserAddress = async (userId, addressData) => {
    try {
        const addressesRef = collection(db, 'users', userId, 'addresses');
        const newAddress = {
            ...addressData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(addressesRef, newAddress);

        return { success: true, id: docRef.id, ...newAddress };
    } catch (error) {

        throw error;
    }
};

/**
 * Get all addresses for a user
 * @param {string} userId - User ID
 */
export const getUserAddresses = async (userId) => {
    try {
        const addressesRef = collection(db, 'users', userId, 'addresses');
        const q = query(addressesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const addresses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return addresses;
    } catch (error) {

        throw error;
    }
};

/**
 * Update an existing address
 * @param {string} userId - User ID
 * @param {string} addressId - Address ID
 * @param {object} addressData - Updated address details
 */
export const updateUserAddress = async (userId, addressId, addressData) => {
    try {
        const addressRef = doc(db, 'users', userId, 'addresses', addressId);
        const updateData = {
            ...addressData,
            updatedAt: serverTimestamp()
        };
        await updateDoc(addressRef, updateData);

        return { success: true };
    } catch (error) {

        throw error;
    }
};

/**
 * Delete an address
 * @param {string} userId - User ID
 * @param {string} addressId - Address ID
 */
export const deleteUserAddress = async (userId, addressId) => {
    try {
        const addressRef = doc(db, 'users', userId, 'addresses', addressId);
        await deleteDoc(addressRef);

        return { success: true };
    } catch (error) {

        throw error;
    }
};
