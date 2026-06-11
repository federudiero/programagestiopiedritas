import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { isFirebaseConfigured, waitForFirebaseAuth } from "../firebase/firebaseClient";
import { getCollectionRef, getDocRef } from "./paths";

function getLocalKey(collectionName) {
  return `gestion_${collectionName}_v1`;
}

function readLocal(collectionName) {
  try {
    const parsed = JSON.parse(localStorage.getItem(getLocalKey(collectionName)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(collectionName, rows) {
  localStorage.setItem(getLocalKey(collectionName), JSON.stringify(rows));
}

export async function listDocs(collectionName, orderField = "nombre") {
  if (!isFirebaseConfigured) {
    const rows = readLocal(collectionName);
    return rows.sort((a, b) => String(a[orderField] || "").localeCompare(String(b[orderField] || "")));
  }

  await waitForFirebaseAuth();
  const ref = getCollectionRef(collectionName);
  let snapshot;

  try {
    snapshot = await getDocs(query(ref, orderBy(orderField, "asc")));
  } catch {
    snapshot = await getDocs(ref);
  }

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveDoc(collectionName, data, id = null) {
  const nowIso = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const rows = readLocal(collectionName);

    if (id) {
      const updated = rows.map((row) => (row.id === id ? { ...row, ...data, updatedAt: nowIso } : row));
      writeLocal(collectionName, updated);
      return { id, ...data };
    }

    const newId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const created = { id: newId, ...data, createdAt: nowIso, updatedAt: nowIso };
    writeLocal(collectionName, [...rows, created]);
    return created;
  }

  await waitForFirebaseAuth();

  if (id) {
    await setDoc(
      getDocRef(collectionName, id),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { id, ...data };
  }

  const createdRef = await addDoc(getCollectionRef(collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: createdRef.id, ...data };
}

export async function setDocById(collectionName, id, data, { merge = true } = {}) {
  const nowIso = new Date().toISOString();

  if (!id) throw new Error("Falta ID del documento.");

  if (!isFirebaseConfigured) {
    const rows = readLocal(collectionName);
    const exists = rows.some((row) => row.id === id);
    const next = exists
      ? rows.map((row) => (row.id === id ? { ...row, ...data, id, updatedAt: nowIso } : row))
      : [...rows, { ...data, id, createdAt: nowIso, updatedAt: nowIso }];
    writeLocal(collectionName, next);
    return { id, ...data };
  }

  await waitForFirebaseAuth();
  await setDoc(
    getDocRef(collectionName, id),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge }
  );
  return { id, ...data };
}

export async function deleteDocById(collectionName, id) {
  if (!id) return;

  if (!isFirebaseConfigured) {
    writeLocal(collectionName, readLocal(collectionName).filter((row) => row.id !== id));
    return;
  }

  await waitForFirebaseAuth();
  await deleteDoc(getDocRef(collectionName, id));
}

export async function importDocs(collectionName, docs, { merge = true } = {}) {
  if (!Array.isArray(docs)) throw new Error(`La colección ${collectionName} debe ser un array.`);
  let count = 0;

  for (const item of docs) {
    const { id, ...data } = item;
    if (id) {
      await setDocById(collectionName, id, data, { merge });
    } else {
      await saveDoc(collectionName, data);
    }
    count += 1;
  }

  return count;
}
