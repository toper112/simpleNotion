// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAP5D_rWxQtA1UwVrpGWVk7MzZ4_XkJ8Rg",
  authDomain: "simplenotion.firebaseapp.com",
  projectId: "simplenotion",
  storageBucket: "simplenotion.firebasestorage.app",
  messagingSenderId: "1064545030092",
  appId: "1:1064545030092:web:bcd557d46bec70931f1769",
  measurementId: "G-YDVR2D5WKR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);