import { COLLECTIONS } from "./paths";
import { deleteDocById, listDocs, saveDoc, setDocById } from "./crudService";
import { normalizePhone, summarizeItems, toNumber, todayStr } from "../utils/pricingCalculator";
import { upsertClienteFromPedido } from "./clientesService";
import { logAudit } from "./auditoriaService";
import { detectZonaFromText } from "../utils/zonificacion";

export const ESTADOS_PEDIDO = ["pendiente", "entregado", "cancelado"];
export const METODOS_PAGO = ["pendiente", "efectivo", "transferencia", "tarjeta", "mixto", "cuentaCorriente", "pagado"];

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[\n|;]/).map((item) => item.trim()).filter(Boolean);
}

export function sanitizePedido(pedido) {
  const nombreCliente = String(pedido.nombreCliente || "").trim();
  const telefono = String(pedido.telefono || "").trim();
  const direccion = String(pedido.direccion || "").trim();
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const resumen = summarizeItems(items);
  const totalManual = toNumber(pedido.totalManual);
  const envioIngresado = toNumber(pedido.envioCobrado);
  const tieneItems = items.length > 0;

  let subtotalProductos = tieneItems ? resumen.totalCliente : toNumber(pedido.subtotalProductos || pedido.totalVentaProductos);
  let envioCobrado = envioIngresado;
  const envioDetectadoPor = String(pedido.envioDetectadoPor || "manual").trim();
  let totalCliente = tieneItems
    ? totalManual || subtotalProductos + envioCobrado
    : totalManual;

  if (tieneItems && totalCliente > subtotalProductos && envioCobrado <= 0 && /diferencia/i.test(envioDetectadoPor)) {
    envioCobrado = totalCliente - subtotalProductos;
  }

  if (tieneItems && totalManual <= 0) {
    totalCliente = subtotalProductos + envioCobrado;
  }

  const motivosRevision = normalizeStringArray(pedido.motivosRevision);

  if (tieneItems && totalCliente < subtotalProductos) {
    motivosRevision.push("El total cliente es menor que el subtotal de productos.");
  }

  if (tieneItems && totalCliente > subtotalProductos && envioCobrado <= 0 && !/diferencia/i.test(envioDetectadoPor)) {
    motivosRevision.push("El total cliente es mayor que el subtotal de productos. Cargá envío cobrado o ajustá ítems/precios.");
  }

  const requiereRevision = Boolean(pedido.requiereRevision) || motivosRevision.length > 0;
  const usarTotalManual = !tieneItems && totalManual > 0;

  if (!nombreCliente && !telefono && !direccion && !pedido.pedidoTexto) {
    throw new Error("El pedido necesita al menos cliente, teléfono, dirección o detalle.");
  }

  const zonaDetectada = detectZonaFromText(`${direccion} ${pedido.observaciones || ""} ${pedido.fechaEntrega || ""}`);

  return {
    fechaStr: pedido.fechaStr || todayStr(),
    fechaEntrega: String(pedido.fechaEntrega || "").trim(),
    estado: ESTADOS_PEDIDO.includes(pedido.estado) ? pedido.estado : "pendiente",
    metodoPago: METODOS_PAGO.includes(pedido.metodoPago) ? pedido.metodoPago : "pendiente",
    nombreCliente: nombreCliente || "Sin nombre",
    telefono,
    telefonoNormalized: normalizePhone(pedido.telefonoNormalized || telefono),
    direccion,
    vendedorId: String(pedido.vendedorId || "").trim(),
    vendedorNombre: String(pedido.vendedorNombre || "").trim(),
    pedidoTexto: String(pedido.pedidoTexto || "").trim(),
    observaciones: String(pedido.observaciones || "").trim(),
    rawText: String(pedido.rawText || "").trim(),
    items,
    totalManual,
    subtotalProductos,
    totalVentaProductos: subtotalProductos,
    envioCobrado: tieneItems ? envioCobrado : toNumber(pedido.envioCobrado),
    envioTexto: String(pedido.envioTexto || "").trim(),
    envioDetectadoPor,
    totalCliente: usarTotalManual ? totalManual : totalCliente,
    totalCostoMaterial: usarTotalManual ? 0 : resumen.totalCostoMaterial,
    totalComision: usarTotalManual ? 0 : resumen.totalComision,
    totalCosto: usarTotalManual ? 0 : resumen.totalCosto,
    totalGanancia: usarTotalManual ? 0 : resumen.totalGanancia,
    totalGananciaProductos: usarTotalManual ? 0 : resumen.totalGanancia,
    cantidadItems: resumen.cantidadItems,
    calculoCompleto: tieneItems,
    requiereRevision,
    motivosRevision,
    lineasNoIdentificadas: normalizeStringArray(pedido.lineasNoIdentificadas),
    zonaId: pedido.zonaId || zonaDetectada?.id || "",
    zonaNombre: pedido.zonaNombre || zonaDetectada?.nombre || "",
    zonaAliasDetectado: pedido.zonaAliasDetectado || zonaDetectada?.aliasDetectado || "",
    cuentaCorrientePagada: Boolean(pedido.cuentaCorrientePagada),
    cuentaCorrienteSaldo: toNumber(pedido.cuentaCorrienteSaldo),
  };
}

export async function listPedidos() {
  const pedidos = await listDocs(COLLECTIONS.pedidos, "fechaStr");
  return pedidos.sort((a, b) => String(b.fechaStr || "").localeCompare(String(a.fechaStr || "")));
}

export async function savePedido(pedido) {
  const sanitized = sanitizePedido(pedido);
  const saved = await saveDoc(COLLECTIONS.pedidos, sanitized, pedido.id || null);
  await upsertClienteFromPedido(sanitized);
  await logAudit(pedido.id ? "actualizar" : "crear", "pedido", saved.id, { cliente: sanitized.nombreCliente, totalCliente: sanitized.totalCliente, estado: sanitized.estado });
  return saved;
}

export async function updatePedidoEstadoOnly(id, estado) {
  if (!id) throw new Error("Falta ID del pedido.");
  if (!ESTADOS_PEDIDO.includes(estado)) throw new Error("Estado de pedido inválido.");

  const saved = await setDocById(COLLECTIONS.pedidos, id, {
    estado,
    estadoActualizadoAt: new Date().toISOString(),
  }, { merge: true });
  await logAudit("cambiar_estado", "pedido", id, { estado });
  return saved;
}

export async function updatePedidoFieldsOnly(id, fields = {}) {
  if (!id) throw new Error("Falta ID del pedido.");
  const saved = await setDocById(COLLECTIONS.pedidos, id, {
    ...fields,
    camposActualizadosAt: new Date().toISOString(),
  }, { merge: true });
  await logAudit("actualizar_campos", "pedido", id, fields);
  return saved;
}

export async function deletePedido(id) {
  await deleteDocById(COLLECTIONS.pedidos, id);
  await logAudit("eliminar", "pedido", id);
}
