import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import admin from "firebase-admin";

/**
 * Inicializa o Firebase Admin SDK.
 * Tenta carregar as credenciais da variável de ambiente FIREBASE_SERVICE_ACCOUNT.
 * Caso não exista, usa a configuração padrão para o projeto.
 */
function initializeFirebase() {
  if (admin.apps.length) return;

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  try {
    if (serviceAccountVar) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[Firebase] Inicializado com Service Account da variável de ambiente.");
    } else {
      // Fallback para as credenciais fornecidas pelo usuário no chat
      // NOTA: Em produção, o ideal é usar a variável de ambiente acima.
      const fallbackConfig = {
        projectId: "elites-fight",
        clientEmail: "firebase-adminsdk-fbsvc@elites-fight.iam.gserviceaccount.com",
        // A chave privada deve ter as quebras de linha \n preservadas
        privateKey: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCtjN0/+3Q7nsGI\nugie+3jTAzsfk55gQT0Kwyt4JwEWdemc2jBFfvL0XYimVbOMYXEcIm301Do3tAy0\nWQ3b+LGP6QRC1KCBTHDthspXDNJAfFsxGyC1iOtHlEaXQM4kqfxpicFr85slta3i\n3qO Z95FjYo+ulZzlm6uGK86Tzxa4bKSS7qx7HaZagak97aTk3PIf9vg+pC5jEoCD\nVmk+Ojjp+2VYOb7Od+EYrZh8IgUD8b2RRPVB3n5lK2J UMf8ygSbexmgsiLdBfZI9\niN9J/MB+5JCPz7ORAcSHGwk0ygYC1IppVj33Q+b7kyiYe9TbWM2Cp5t3I11N6Hvk\ngA9+pNDxAgMBAAECg gEACiNq/2Rcn2kATFD11PfC0KzlJMyWWXAmNT0+ilfY9+tu\neMPEQyMN5VmbdIAYK5C7r1WRj9ZgCkYB4f070oheMxZ9MbxDHhqNlEqmA lzU4YCC\nQUWg7QnxGK7gStC12i11+eJawsgp3ZOV82VnMETmoOQumZfS4RTtebqQaFEWNjLF\n79bgciBcNk8L3KbovStNKvrRqf8pykH 9lXMZjWaGaJFuUg0SQkeX23jMpexAVVgC\ntxH/PgPpBLXnC2maHn5coL/kCMJPZ+oI4oG3ap+Znz2z2VJygQQKZFgXxgvY2e9w\nc0A+l Gw3LaDsqOaJpknN7sR22P8sYb7UPZrTEw8viwKBgQDT8F8SGZxpIE4yF88s\nec9X/+vIZhVXl+TVYmZBdkBvQmXtbuWQqJ0nWnKBXF9Em O93IiF/BVTfkZKnJuv1\n4Me9BO8HF3U3B6N8VrN827tZNeL4U2sBixmS46lw/zKebhJbCBvi0rEebEqY7FP6\n2E6wtFcIc7d9NIEuZzmYl+t2+wKBgQDRoWc60+1XIIHBUxGjpHSnpZx6ph5Q9v2r\nKoVvh4LHAdTdngKupIKehh52mFypgn1W+nEKPt4jULW7/drp2hnCtapCLg cnJO0w\ngw+ylNYqevexPhQh5NadM5wdMsZirlDR4xqbBeUoH3mfTDA9dGHLMKZBrCAOcYUg\nUz66tkuEAwKBgQCghtULmZhty8lOidgi oNSam74UGLYblXH+6bv340BkxQ786t04\nV25JC2nlb3i9NXVTb+edFQW3HMTOlF1u6+V91snRPkRK/R8oI2dpr+jUZktWuaA4\nGAqzxn plmvXVKBwBFUBB6kG7gFx0PbRSMBpSHxY40aTuUaFy6z6lxJPVlwKBgE3K\nl4Q9INY0OfKD4QfY/3E3A9p/ysBA5+Gc5ed9Ygp3o4aaHGSyp8Yr/yIDaF9/DQQ5\n67jhm41/ZfFdQt+FEAoxX/0vF3hvO5XFDQ44LUGWYFRltRLe2MV9YXF0Zio4hcVd\ngYIFrgQ1qexzWXN0vNWq OAgm176EYeKdAapH+74BAoGBAJ7VkpuTlR6Zw3gn3zQU\naKwYim7m+wfmZrDXv+s7rLvUyVdmSsUzXRDs+BwP4IQt+VMZK+Vh80RoFLhL HSFc\njsaVD3uiZ/oK23XAEeU8lvmw+tl0INwiHQry8L4ftweu37woRkuKSuHZQ0hLZLsa\nhWmzpJeDAeb7n2ZVTQ7qqBEQ\n-----END PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
      };

      admin.initializeApp({
        credential: admin.credential.cert(fallbackConfig),
      });
      console.log("[Firebase] Inicializado com configuração de fallback.");
    }
  } catch (error) {
    console.error("[Firebase] Erro ao inicializar:", error);
    // Fallback mínimo para não quebrar o boot, mas a autenticação falhará
    admin.initializeApp({ projectId: "elites-fight" });
  }
}

initializeFirebase();

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
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    let idToken: string | undefined;

    // 1. Tentar pegar do header Authorization
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.slice(7);
    }

    // 2. Tentar pegar do cookie se não houver no header
    if (!idToken) {
      const cookies = this.parseCookies(req.headers.cookie);
      idToken = cookies.get("firebase-token") || cookies.get(COOKIE_NAME);
    }

    if (!idToken) {
      throw ForbiddenError("Missing authentication token");
    }

    try {
      // Verificar o token do Firebase
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, name, email } = decodedToken;

      const signedInAt = new Date();
      let user = await db.getUserByOpenId(uid);

      if (!user) {
        await db.upsertUser({
          openId: uid,
          name: name || email || "Usuário Google",
          email: email || null,
          loginMethod: "google",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(uid);
      }

      if (!user) {
        throw ForbiddenError("User not found after sync");
      }

      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt,
      });

      return user;
    } catch (error) {
      console.error("[Auth] Firebase verification failed", error);
      throw ForbiddenError("Invalid authentication token");
    }
  }
}

/** Result of `sdk.authenticateRequest`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

export const sdk = new SDKServer();
