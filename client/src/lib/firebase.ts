import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";

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

// Configurar persistência local - essencial para produção
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao configurar persistência do Firebase:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configurações do Google OAuth para o fluxo de redirect direto
export const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_CLIENT_ID = "780065023529-q9k11begnuevbo544f14mnskrvd7jll8.apps.googleusercontent.com";
export const GOOGLE_REDIRECT_URI = "https://elites-fight.onrender.com/api/auth/google/callback";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
