// src/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDhqiZejvovQt2SLl8GYxYops5gFcL-1Fg",
  authDomain: "cmpe277-lostandfound.firebaseapp.com",
  projectId: "cmpe277-lostandfound",
  storageBucket: "cmpe277-lostandfound.firebasestorage.app",
  messagingSenderId: "718919494761",
  appId: "1:718919494761:web:f7315829dff87dd980c6f8",
  measurementId: "G-MSGYRSCR9B"
};

const app = initializeApp(firebaseConfig);

// Persist auth state across app restarts on React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
