import express from "express";
import axios from "axios";
import * as db from "../db";
import { getAuth } from "firebase-admin/auth";

const GOOGLE_CLIENT_ID = "780065023529-q9k11begnuevbo544f14mnskrvd7jll8.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://elites-fight.onrender.com/api/auth/google/callback";

/**
 * Handler de autenticação OAuth do Google.
 * 
 * Fluxo:
 * 1. GET /api/auth/google - Redireciona o usuário para o Google OAuth
 * 2. GET /api/auth/google/callback - Recebe o callback com o código
 * 3. Troca o código pelo access token do Google
 * 4. Usa o access token para obter o ID token do Google
 * 5. Verifica o token com Firebase Admin SDK
 * 6. Cria/atualiza o usuário no banco de dados
 * 7. Retorna o Firebase ID token e redireciona
 */
export function createAuthHandler(): express.Router {
  const router = express.Router();

  // Endpoint para verificar se o OAuth está configurado
  router.get("/auth/google/check", (_req, res) => {
    const configured = !!GOOGLE_CLIENT_SECRET;
    res.json({ configured });
  });

  // Endpoint de login - redireciona para o Google OAuth
  router.get("/auth/google", (req, res) => {
    if (!GOOGLE_CLIENT_SECRET) {
      console.warn("[Auth] GOOGLE_CLIENT_SECRET não configurado, redirecionando para o Firebase popup");
      return res.redirect("/dashboard?authError=server_not_configured");
    }

    const redirectAfter = (req.query.redirect as string) || "/dashboard";
    const state = encodeURIComponent(JSON.stringify({ redirectAfter }));
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=openid%20profile%20email` +
      `&state=${state}` +
      `&prompt=select_account`;
    
    res.redirect(authUrl);
  });

  // Callback do Google OAuth
  router.get("/auth/google/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      console.error("[Auth] Erro no OAuth Google:", error);
      return res.redirect(`/dashboard?authError=${encodeURIComponent(String(error))}`);
    }

    if (!code || typeof code !== "string") {
      console.error("[Auth] Código de autorização ausente");
      return res.redirect("/dashboard?authError=missing_code");
    }

    try {
      // 1. Trocar o código pelo access token
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      });

      const { access_token, id_token: googleIdToken } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Access token não recebido do Google");
      }

      // 2. Obter informações do usuário do Google
      const userInfoResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const userInfo = userInfoResponse.data;
      const { sub: googleId, name, email, picture } = userInfo;

      // 3. Verificar/atualizar o usuário no banco de dados
      // Usamos o googleId como openId (mesmo que o Firebase usaria)
      const signedInAt = new Date();
      let user = await db.getUserByOpenId(googleId);
      
      if (!user) {
        await db.upsertUser({
          openId: googleId,
          name: name || email || "Usuário Google",
          email: email || null,
          photoUrl: picture || null,
          loginMethod: "google",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(googleId);
      } else {
        await db.upsertUser({
          openId: user.openId,
          name: name || user.name,
          email: email || user.email,
          photoUrl: picture || user.photoUrl,
          lastSignedIn: signedInAt,
        });
      }

      if (!user) {
        throw new Error("Usuário não foi criado/atualizado");
      }

      // 4. Obter o Firebase ID token
      // Precisamos do Firebase Admin SDK para criar um token customizado
      const firebaseAuthAdmin = getAuth();
      const firebaseToken = await firebaseAuthAdmin.createCustomToken(googleId);

      // 5. Criar a página HTML que faz login no Firebase client SDK e redireciona
      const redirectAfter = state ? JSON.parse(decodeURIComponent(state as string)).redirectAfter : "/dashboard";
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Autenticando...</title>
          <style>
            body { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: system-ui, sans-serif;
              background: #1a1a1a;
              color: #fff;
            }
            .loading { text-align: center; }
            .spinner { 
              width: 40px; height: 40px; 
              border: 3px solid #333; 
              border-top: 3px solid #d4af37; 
              border-radius: 50%; 
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="spinner"></div>
            <p>Autenticando...</p>
          </div>
          <script type="module">
            import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
            import { getAuth, signInWithCustomToken, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

            const firebaseConfig = {
              apiKey: "AIzaSyBSku-8IuEJkHz_rMGYmZepZLetNQP6Hok",
              authDomain: "elites-fight.firebaseapp.com",
              projectId: "elites-fight",
              storageBucket: "elites-fight.firebasestorage.app",
              messagingSenderId: "780065023529",
              appId: "1:780065023529:web:b1a948da4a2177b53a9e38"
            };

            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);

            try {
              await setPersistence(auth, browserLocalPersistence);
              await signInWithCustomToken(auth, "${firebaseToken}");
              const idToken = await auth.currentUser.getIdToken(true);
              localStorage.setItem("firebase-token", idToken);
              window.location.replace("${redirectAfter}");
            } catch (err) {
              console.error("Firebase auth error:", err);
              // Fallback: salvar apenas no localStorage sem Firebase
              localStorage.setItem("firebase-token", "");
              window.location.replace("${redirectAfter}");
            }
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error: any) {
      console.error("[Auth] Erro ao processar callback OAuth:", error?.message, error?.response?.data);
      res.redirect(`/dashboard?authError=callback_failed`);
    }
  });

  return router;
}
