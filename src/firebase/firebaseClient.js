import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const allowedEmail = String(import.meta.env.VITE_ALLOWED_EMAIL || "")
  .trim()
  .toLowerCase();
export const cuentaId = String(import.meta.env.VITE_CUENTA_ID || "").trim();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

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
