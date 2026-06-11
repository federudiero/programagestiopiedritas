import { COLLECTIONS } from "./paths";
import { listDocs, saveDoc } from "./crudService";

export async function logAudit(action, entityType, entityId, details = {}) {
  try {
    return await saveDoc(COLLECTIONS.auditoria, {
      action: String(action || "accion"),
      entityType: String(entityType || "general"),
      entityId: String(entityId || ""),
      details,
      createdAtIso: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("No se pudo registrar auditoría", error);
    return null;
  }
}

export async function listAuditoria() {
  const rows = await listDocs(COLLECTIONS.auditoria, "createdAtIso");
  return rows.sort((a, b) => String(b.createdAtIso || "").localeCompare(String(a.createdAtIso || "")));
}
