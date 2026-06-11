import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env || {};

const fallbackConfig = {
  apiKey: "AIzaSyD6-jasegdpkM0MlYYUMvMFq9ImWeNLl0M",
  authDomain: "porgrama-de-productos-costos.firebaseapp.com",
  projectId: "porgrama-de-productos-costos",
  storageBucket: "porgrama-de-productos-costos.firebasestorage.app",
  messagingSenderId: "4780272271",
  appId: "1:4780272271:web:b9ef6ca9d20722ef4e1efa",
};

function readEnv(primaryName, legacyName) {
  const primary = String(env[primaryName] || "").trim();
  if (primary) return primary;

  // Defensa para el error común visto en Vercel: cargar ITE_FIREBASE_API_KEY
  // en vez de VITE_FIREBASE_API_KEY.
  const legacy = String(env[legacyName] || "").trim();
  if (legacy) return legacy;

  return "";
}

const envFirebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY", "ITE_FIREBASE_API_KEY"),
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN", "ITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID", "ITE_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET", "ITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "ITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("VITE_FIREBASE_APP_ID", "ITE_FIREBASE_APP_ID"),
};

function hasCompleteConfig(config) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export const firebaseConfigSource = hasCompleteConfig(envFirebaseConfig) ? "env" : "fallback";
export const firebaseConfig = hasCompleteConfig(envFirebaseConfig) ? envFirebaseConfig : fallbackConfig;

export const allowedEmail = String(env.VITE_ALLOWED_EMAIL || env.ITE_ALLOWED_EMAIL || "federudiero@gmail.com")
  .trim()
  .toLowerCase();
export const cuentaId = String(env.VITE_CUENTA_ID || env.ITE_CUENTA_ID || "").trim();

export const isFirebaseConfigured = hasCompleteConfig(firebaseConfig);

export const firebaseDiagnostics = {
  source: firebaseConfigSource,
  projectId: firebaseConfig.projectId || "",
  authDomain: firebaseConfig.authDomain || "",
  allowedEmail,
  cuentaId,
  missingEnvNames: Object.entries(envFirebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key),
};

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

let authResolved = false;
let authCurrentUser = null;
let authResolveQueue = [];

if (auth) {
  onAuthStateChanged(auth, (user) => {
    authResolved = true;
    authCurrentUser = user;
    authResolveQueue.forEach((resolve) => resolve(user));
    authResolveQueue = [];
  });
}

export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export function waitForFirebaseAuth() {
  if (!auth) return Promise.resolve(null);
  if (authResolved) return Promise.resolve(authCurrentUser);

  return new Promise((resolve) => {
    authResolveQueue.push(resolve);
  });
}

export async function loginWithEmail(email, password) {
  if (!auth) throw new Error("Firebase no está configurado.");

  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (allowedEmail && normalizedEmail !== allowedEmail) {
    throw new Error(`Esta app solo permite ingresar con ${allowedEmail}.`);
  }

  return signInWithEmailAndPassword(auth, normalizedEmail, password);
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

export function getFirebaseRouteLabel() {
  if (!isFirebaseConfigured) return "localStorage";
  if (cuentaId) return `/cuentas/${cuentaId}`;
  return "raíz del proyecto";
}
