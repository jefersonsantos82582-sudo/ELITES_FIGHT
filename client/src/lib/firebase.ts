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

// Configurar persistência local ANTES de qualquer operação
// browserLocalPersistence é a mais adequada para produção no Render
// Isso garante que a sessão persiste ao recarregar a página
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao configurar persistência do Firebase:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Configurar hint para login - isso ajuda o Firebase a saber que é um redirect
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
