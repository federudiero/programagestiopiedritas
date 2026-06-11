import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { productos, vendedores } from "./seedData.mjs";

const firebaseConfig = {
  apiKey: "AIzaSyD6-jasegdpkM0MlYYUMvMFq9ImWeNLl0M",
  authDomain: "porgrama-de-productos-costos.firebaseapp.com",
  projectId: "porgrama-de-productos-costos",
  storageBucket: "porgrama-de-productos-costos.firebasestorage.app",
  messagingSenderId: "4780272271",
  appId: "1:4780272271:web:b9ef6ca9d20722ef4e1efa",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = process.env.FIREBASE_EMAIL;
const PASSWORD = process.env.FIREBASE_PASSWORD;
const CUENTA_ID = process.env.CUENTA_ID || "";

if (!EMAIL || !PASSWORD) {
  console.error("Faltan FIREBASE_EMAIL y FIREBASE_PASSWORD.");
  console.error('PowerShell: $env:FIREBASE_EMAIL="federudiero@gmail.com"; $env:FIREBASE_PASSWORD="TU_PASSWORD"; npm run seed:datos');
  process.exit(1);
}

function getPath(collectionName, id) {
  if (CUENTA_ID) return ["cuentas", CUENTA_ID, collectionName, id];
  return [collectionName, id];
}

async function setById(collectionName, item) {
  const { id, ...data } = item;
  if (!id) throw new Error(`Falta id en ${collectionName}`);
  await setDoc(doc(db, ...getPath(collectionName, id)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function main() {
  console.log("Iniciando sesión...");
  const credential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  console.log(`Sesión iniciada como ${credential.user.email}`);

  console.log("Cargando productos...");
  for (const producto of productos) {
    await setById("productosCalculadora", producto);
    console.log(`Producto OK: ${producto.nombre}`);
  }

  console.log("Cargando vendedores...");
  for (const vendedor of vendedores) {
    await setById("vendedores", vendedor);
    console.log(`Vendedor OK: ${vendedor.nombre}`);
  }

  await signOut(auth);
  console.log(`Carga finalizada. Productos: ${productos.length}. Vendedores: ${vendedores.length}.`);
}

main().catch((error) => {
  console.error("Error cargando datos iniciales:");
  console.error(error);
  process.exit(1);
});
