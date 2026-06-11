import { collection, doc } from "firebase/firestore";
import { cuentaId, db } from "../firebase/firebaseClient";

export const COLLECTIONS = {
  productos: "productosCalculadora",
  pedidos: "pedidos",
  clientes: "clientes",
  vendedores: "vendedores",
  backups: "backups",
  cajaMovimientos: "cajaMovimientos",
  stockMovimientos: "stockMovimientos",
  comisionesLiquidaciones: "comisionesLiquidaciones",
  cuentasCorrientes: "cuentasCorrientes",
  auditoria: "auditoria",
  zonasEnvio: "zonasEnvio",
};

export function getCollectionRef(collectionName) {
  if (!db) return null;

  if (cuentaId) {
    return collection(db, "cuentas", cuentaId, collectionName);
  }

  return collection(db, collectionName);
}

export function getDocRef(collectionName, id) {
  if (!db) return null;

  if (cuentaId) {
    return doc(db, "cuentas", cuentaId, collectionName, id);
  }

  return doc(db, collectionName, id);
}
