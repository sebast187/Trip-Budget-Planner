// js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBF7PdhTa3xViN8pEPRyrMCCg7FylNMu_U",
  authDomain: "trip-budget-planner-c35c9.firebaseapp.com",
  databaseURL: "https://trip-budget-planner-c35c9-default-rtdb.firebaseio.com",
  projectId: "trip-budget-planner-c35c9",
  storageBucket: "trip-budget-planner-c35c9.appspot.com", // Corrected from .firebasestorage.app
  messagingSenderId: "869784882422",
  appId: "1:869784882422:web:8a53778545fc24b16930d7",
  measurementId: "G-VBXPQWV9VR"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // Realtime Database
