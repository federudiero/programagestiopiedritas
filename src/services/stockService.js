import { saveProducto } from "./productosService";
import { COLLECTIONS } from "./paths";
import { deleteDocById, listDocs, saveDoc } from "./crudService";
import { toNumber, todayStr } from "../utils/pricingCalculator";
import { logAudit } from "./auditoriaService";

export async function listStockMovimientos() {
  const rows = await listDocs(COLLECTIONS.stockMovimientos, "fechaStr");
  return rows.sort((a, b) => String(b.fechaStr || "").localeCompare(String(a.fechaStr || "")));
}

export async function saveStockManual(producto, data) {
  if (!producto?.id) throw new Error("Seleccioná un producto.");
  const tipo = ["entrada", "salida", "ajuste"].includes(data.tipo) ? data.tipo : "entrada";
  const cantidad = toNumber(data.cantidad);
  if (tipo !== "ajuste" && cantidad <= 0) throw new Error("La cantidad debe ser mayor a cero.");

  const stockActual = toNumber(producto.stockActual);
  let nuevoStock = stockActual;
  if (tipo === "entrada") nuevoStock = stockActual + cantidad;
  if (tipo === "salida") nuevoStock = Math.max(0, stockActual - cantidad);
  if (tipo === "ajuste") nuevoStock = Math.max(0, toNumber(data.nuevoStock));

  const movimiento = {
    fechaStr: data.fechaStr || todayStr(),
    productoId: producto.id,
    productoNombre: producto.nombre || "Producto",
    tipo,
    cantidad: tipo === "ajuste" ? nuevoStock - stockActual : cantidad,
    stockAnterior: stockActual,
    stockNuevo: nuevoStock,
    observaciones: String(data.observaciones || "").trim(),
  };

  await saveProducto({ ...producto, stockActual: nuevoStock });
  const saved = await saveDoc(COLLECTIONS.stockMovimientos, movimiento);
  await logAudit("stock", "producto", producto.id, movimiento);
  return saved;
}

export async function deleteStockMovimiento(id) {
  await deleteDocById(COLLECTIONS.stockMovimientos, id);
}
