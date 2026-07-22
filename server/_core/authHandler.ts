import express from "express";
import axios from "axios";
import * as db from "../db";
import { getAuth } from "firebase-admin/auth";

const GOOGLE_CLIENT_ID = "780065023529-q9k11begnuevbo544f14mnskrvd7jll8.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// Usar o Firebase Auth Handler como redirect URI (já está autorizado no Google Cloud)
const FIREBASE_AUTH_HANDLER = "https://elites-fight.firebaseapp.com/__/auth/handler";

/**
 * Handler de autenticação OAuth do Google.
 * 
 * Em vez de usar um endpoint customizado no Render (que causaria redirect_uri_mismatch),
 * usamos o Firebase Auth Handler como redirect URI, que já está autorizado no Google Cloud Console.
 * 
 * Fluxo:
 * 1. GET /api/auth/google - Redireciona para o Google OAuth com Firebase handler como callback
 * 2. Google redireciona para Firebase handler
 * 3. Firebase handler faz login no Firebase e redireciona para o site
 */
export function createAuthHandler(): express.Router {
  const router = express.Router();

  // Endpoint para verificar se o OAuth está configurado
  router.get("/auth/google/check", (_req, res) => {
    const configured = !!GOOGLE_CLIENT_SECRET;
    res.json({ configured });
  });

  // Endpoint de login - redireciona para o Google OAuth
  // Usa o Firebase Auth Handler como redirect_uri (já autorizado no Google Cloud)
  router.get("/auth/google", (req, res) => {
    if (!GOOGLE_CLIENT_SECRET) {
      // Se o client secret não está configurado, usar o popup do Firebase
      return res.redirect("/dashboard?authError=server_not_configured");
    }

    const redirectAfter = (req.query.redirect as string) || "/dashboard";
    const state = encodeURIComponent(JSON.stringify({ redirectAfter, source: "server" }));
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(FIREBASE_AUTH_HANDLER)}` +
      `&response_type=code` +
      `&scope=openid%20profile%20email` +
      `&state=${state}` +
      `&prompt=select_account`;
    
    res.redirect(authUrl);
  });

  return router;
}
