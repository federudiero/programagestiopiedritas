import { COLLECTIONS } from "./paths";
import { deleteDocById, listDocs, saveDoc } from "./crudService";
import { toNumber, todayStr } from "../utils/pricingCalculator";
import { logAudit } from "./auditoriaService";

export async function listCajaMovimientos() {
  const rows = await listDocs(COLLECTIONS.cajaMovimientos, "fechaStr");
  return rows.sort((a, b) => String(b.fechaStr || "").localeCompare(String(a.fechaStr || "")));
}

export function sanitizeCajaMovimiento(mov) {
  const tipo = ["ingreso", "egreso"].includes(mov.tipo) ? mov.tipo : "egreso";
  const concepto = String(mov.concepto || "").trim();
  if (!concepto) throw new Error("El concepto es obligatorio.");
  const monto = toNumber(mov.monto);
  if (monto <= 0) throw new Error("El monto debe ser mayor a cero.");

  return {
    fechaStr: mov.fechaStr || todayStr(),
    tipo,
    concepto,
    monto,
    metodoPago: String(mov.metodoPago || "efectivo").trim(),
    observaciones: String(mov.observaciones || "").trim(),
  };
}

export async function saveCajaMovimiento(mov) {
  const sanitized = sanitizeCajaMovimiento(mov);
  const saved = await saveDoc(COLLECTIONS.cajaMovimientos, sanitized, mov.id || null);
  await logAudit(mov.id ? "actualizar" : "crear", "cajaMovimiento", saved.id, sanitized);
  return saved;
}

export async function deleteCajaMovimiento(id) {
  await deleteDocById(COLLECTIONS.cajaMovimientos, id);
  await logAudit("eliminar", "cajaMovimiento", id);
}
