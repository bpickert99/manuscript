import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// ⚠️  FILL THESE IN from your Firebase console → Project Settings → Your apps
// If this file ever reverts to these placeholder values after a push, re-enter them manually.
const firebaseConfig = {
  apiKey: "AIzaSyCVBQ5-sLLsa7JnB-cK7IJnuRRPw9qdS-U",
  authDomain: "manuscript-4724a.firebaseapp.com",
  projectId: "manuscript-4724a",
  storageBucket: "manuscript-4724a.firebasestorage.app",
  messagingSenderId: "271308193883",
  appId: "1:271308193883:web:5cd719b6d919f6d93e3f7e",
  measurementId: "G-N71EN7HQN3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence — syncs automatically when connectivity returns.
// Fails silently if another tab already has persistence (multi-tab limitation).
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser.');
  }
});
