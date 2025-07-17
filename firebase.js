// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMN8GO7zxDJV9iX7lfoanYQ8Me1P97Qdc",
  authDomain: "billing-959b0.firebaseapp.com",
  projectId: "billing-959b0",
  storageBucket: "billing-959b0.firebasestorage.app",
  messagingSenderId: "210008652381",
  appId: "1:210008652381:web:7e06e69448c6833ee4abb4",
  measurementId: "G-Z6FMSQJ4CX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
