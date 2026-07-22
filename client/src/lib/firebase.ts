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

// Configurar persistência local explicitamente
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao configurar persistência do Firebase:", err);
});

export const googleProvider = new GoogleAuthProvider();
// Adicionar escopos se necessário, mas o padrão geralmente é suficiente
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
