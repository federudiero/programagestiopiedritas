import { COLLECTIONS } from "./paths";
import { deleteDocById, importDocs, listDocs, saveDoc } from "./crudService";

export function sanitizeVendedor(vendedor) {
  const nombre = String(vendedor.nombre || "").trim();
  if (!nombre) throw new Error("El nombre del vendedor es obligatorio.");

  return {
    nombre,
    telefono: String(vendedor.telefono || "").trim(),
    email: String(vendedor.email || "").trim().toLowerCase(),
    observaciones: String(vendedor.observaciones || "").trim(),
    activo: vendedor.activo !== false,
  };
}

export async function listVendedores() {
  return listDocs(COLLECTIONS.vendedores, "nombre");
}

export async function saveVendedor(vendedor) {
  return saveDoc(COLLECTIONS.vendedores, sanitizeVendedor(vendedor), vendedor.id || null);
}

export async function deleteVendedor(id) {
  return deleteDocById(COLLECTIONS.vendedores, id);
}

export async function importVendedores(vendedores) {
  return importDocs(COLLECTIONS.vendedores, vendedores.map(sanitizeVendedor));
}
