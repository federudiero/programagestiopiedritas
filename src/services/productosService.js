import { COLLECTIONS } from "./paths";
import { deleteDocById, importDocs, listDocs, saveDoc } from "./crudService";
import { normalizePrecios, toNumber } from "../utils/pricingCalculator";
import { logAudit } from "./auditoriaService";

function normalizeAliases(aliases) {
  if (Array.isArray(aliases)) {
    return aliases.map((alias) => String(alias || "").trim()).filter(Boolean);
  }

  return String(aliases || "")
    .split(/[\n,;]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

export function sanitizeProducto(producto) {
  const nombre = String(producto.nombre || "").trim();
  if (!nombre) throw new Error("El nombre del producto es obligatorio.");

  return {
    codigo: String(producto.codigo || "").trim(),
    nombre,
    familia: String(producto.familia || "General").trim() || "General",
    unidad: String(producto.unidad || "unidad").trim() || "unidad",
    costoMaterialUnitario: toNumber(producto.costoMaterialUnitario),
    comision: {
      tipo: producto.comision?.tipo || "sin_comision",
      valor: toNumber(producto.comision?.valor),
    },
    descuentoEfectivo: {
      aplica: Boolean(producto.descuentoEfectivo?.aplica),
      porcentaje: toNumber(producto.descuentoEfectivo?.porcentaje),
    },
    precios: normalizePrecios(producto.precios || [{ desde: 1, precioUnitario: 0 }]),
    aliases: normalizeAliases(producto.aliases),
    stockActual: toNumber(producto.stockActual),
    stockMinimo: toNumber(producto.stockMinimo),
    activo: producto.activo !== false,
  };
}

export async function listProductos() {
  return listDocs(COLLECTIONS.productos, "nombre");
}

export async function saveProducto(producto) {
  const sanitized = sanitizeProducto(producto);
  const saved = await saveDoc(COLLECTIONS.productos, sanitized, producto.id || null);
  await logAudit(producto.id ? "actualizar" : "crear", "producto", saved.id, { nombre: sanitized.nombre, costoMaterialUnitario: sanitized.costoMaterialUnitario, stockActual: sanitized.stockActual });
  return saved;
}

export async function deleteProducto(id) {
  await deleteDocById(COLLECTIONS.productos, id);
  await logAudit("eliminar", "producto", id);
}

export async function importProductos(productos) {
  return importDocs(COLLECTIONS.productos, productos.map(sanitizeProducto));
}
