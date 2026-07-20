import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBSku-8IuEJkHz_rMGYmZepZLetNQP6Hok",
  authDomain: "elites-fight.firebaseapp.com",
  projectId: "elites-fight",
  storageBucket: "elites-fight.firebasestorage.app",
  messagingSenderId: "780065023529",
  appId: "1:780065023529:web:b1a948da4a2177b53a9e38"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
