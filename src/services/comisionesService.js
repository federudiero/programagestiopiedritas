import { COLLECTIONS } from "./paths";
import { deleteDocById, listDocs, saveDoc } from "./crudService";
import { toNumber, todayStr } from "../utils/pricingCalculator";
import { logAudit } from "./auditoriaService";

export async function listLiquidacionesComisiones() {
  const rows = await listDocs(COLLECTIONS.comisionesLiquidaciones, "fechaStr");
  return rows.sort((a, b) => String(b.fechaStr || "").localeCompare(String(a.fechaStr || "")));
}

export async function saveLiquidacionComision(data) {
  const vendedorNombre = String(data.vendedorNombre || "Sin vendedor").trim();
  const monto = toNumber(data.monto);
  if (monto <= 0) throw new Error("La liquidación necesita un monto mayor a cero.");

  const sanitized = {
    fechaStr: data.fechaStr || todayStr(),
    desde: String(data.desde || ""),
    hasta: String(data.hasta || ""),
    vendedorNombre,
    vendedorId: String(data.vendedorId || ""),
    pedidos: toNumber(data.pedidos),
    monto,
    observaciones: String(data.observaciones || "").trim(),
    estado: data.estado || "pagada",
  };

  const saved = await saveDoc(COLLECTIONS.comisionesLiquidaciones, sanitized, data.id || null);
  await logAudit(data.id ? "actualizar" : "crear", "liquidacionComision", saved.id, sanitized);
  return saved;
}

export async function deleteLiquidacionComision(id) {
  await deleteDocById(COLLECTIONS.comisionesLiquidaciones, id);
  await logAudit("eliminar", "liquidacionComision", id);
}
