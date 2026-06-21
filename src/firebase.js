// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAP5D_rWxQtA1UwVrpGWVk7MzZ4_XkJ8Rg",
  authDomain: "simplenotion.firebaseapp.com",
  projectId: "simplenotion",
  storageBucket: "simplenotion.firebasestorage.app",
  messagingSenderId: "1064545030092",
  appId: "1:1064545030092:web:bcd557d46bec70931f1769",
  measurementId: "G-YDVR2D5WKR",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);