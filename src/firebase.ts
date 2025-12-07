import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDA7uEyA6VFIUvNK9iiBOd8-2GbFnDEgyM",
  authDomain: "badminton-app-4c60d.firebaseapp.com",
  projectId: "badminton-app-4c60d",
  storageBucket: "badminton-app-4c60d.firebasestorage.app",
  messagingSenderId: "616446140160",
  appId: "1:616446140160:web:fbc5f9a974a2d7ffcc1de5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);