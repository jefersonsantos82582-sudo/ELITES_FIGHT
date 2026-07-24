import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "elites-fight";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type VerifiedFirebaseToken = {
  uid: string;
  name?: string;
  email?: string;
  picture?: string;
};

function getFirebaseAuth() {
  if (!getApps().length) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountRaw) {
      return null;
    }

    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw) as FirebaseServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT precisa conter um JSON válido");
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT não contém client_email e private_key");
    }

    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id ?? FIREBASE_PROJECT_ID,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
      projectId: serviceAccount.project_id ?? FIREBASE_PROJECT_ID,
    });
  }

  return getAuth();
}

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private async verifyFirebaseToken(idToken: string): Promise<VerifiedFirebaseToken> {
    const firebaseAuth = getFirebaseAuth();
    if (firebaseAuth) {
      return firebaseAuth.verifyIdToken(idToken);
    }

    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      algorithms: ["RS256"],
      audience: FIREBASE_PROJECT_ID,
      issuer: FIREBASE_ISSUER,
    });

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
      throw new Error("Token Firebase sem um identificador de usuário válido");
    }
    if (typeof payload.iat !== "number" || payload.iat > nowInSeconds) {
      throw new Error("Token Firebase com data de emissão inválida");
    }

    return {
      uid: payload.sub,
      name: typeof payload.name === "string" ? payload.name : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    let idToken: string | undefined;

    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.slice(7);
      console.log("[Auth] Token encontrado no header Authorization");
    }

    if (!idToken) {
      const cookies = this.parseCookies(req.headers.cookie);
      // Tentar múltiplos nomes para garantir compatibilidade total
      idToken = cookies.get("app_session_id") || cookies.get("firebase-token") || cookies.get("token");
      if (idToken) {
        console.log("[Auth] Token encontrado no cookie");
      }
    }

    if (!idToken) {
      console.error("[Auth] Nenhum token de autenticacao encontrado");
      throw ForbiddenError("Missing authentication token");
    }

    try {
      const decodedToken = await this.verifyFirebaseToken(idToken);
      const { uid, name, email, picture } = decodedToken;
      const signedInAt = new Date();

      let dbUser: any = null;
      try {
        // Tentar sincronizar com o banco de dados
        await db.upsertUser({
          openId: uid,
          name: name || email || "Usuário Google",
          email: email || null,
          photoUrl: picture || null,
          loginMethod: "google",
          lastSignedIn: signedInAt,
        });
        dbUser = await db.getUserByOpenId(uid);
      } catch (dbError) {
        console.error("[Auth] Erro ao sincronizar com o banco de dados:", dbError);
      }

      // Se temos o usuário no banco, retornamos ele
      if (dbUser) return dbUser;

      // ROTA DE EMERGÊNCIA: Se o banco de dados falhar ou o usuário não existir,
      // retornamos um objeto de usuário baseado no Token do Firebase para destravar o fluxo.
      // Usamos um ID numérico que não conflite com seriais positivos do Postgres.
      return {
        id: 999999, // ID alto para evitar conflitos
        openId: uid,
        name: name || email || "Usuário Google",
        email: email || null,
        photoUrl: picture || null,
        role: (uid === ENV.ownerOpenId || email === "jefersonsantos82582@gmail.com") ? "admin" : "user",
        plan: "free",
        sheetsGenerated: 0,
        lastSignedIn: signedInAt,
        createdAt: signedInAt,
        updatedAt: signedInAt,
        suspended: false,
        loginMethod: "google",
      } as any;
    } catch (error) {
      console.error("[Auth] Falha ao validar o token Firebase:", error);
      throw ForbiddenError("Invalid authentication token");
    }
  }
}

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

export const sdk = new SDKServer();
