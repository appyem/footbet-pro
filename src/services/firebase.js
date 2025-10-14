// src/services/firebase.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBHz3LsqwCDxQkhmUdj1E86kAYPXnQrkGg",
  authDomain: "footbet-pro.firebaseapp.com",
  projectId: "footbet-pro",
  storageBucket: "footbet-pro.firebasestorage.app",
  messagingSenderId: "768296334899",
  appId: "1:768296334899:web:708aa3e1883b0a89a2d546"
};

const app = initializeApp(firebaseConfig);

export { app };