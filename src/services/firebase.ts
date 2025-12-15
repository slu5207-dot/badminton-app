import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDA7uEyA6VFIUvNK9iiBOd8-2GbFnDEgyM",
  authDomain: "badminton-app-4c60d.firebaseapp.com",
  projectId: "badminton-app-4c60d",
  storageBucket: "badminton-app-4c60d.firebasestorage.app",
  messagingSenderId: "616446140160",
  appId: "1:616446140160:web:fbc5f9a974a2d7ffcc1de5"
};

// Initialize Firebase
// Check if an app is already initialized to avoid "Service firestore is not available" error during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);