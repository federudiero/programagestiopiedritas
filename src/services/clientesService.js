import { COLLECTIONS } from "./paths";
import { deleteDocById, listDocs, saveDoc, setDocById } from "./crudService";
import { normalizePhone, toNumber } from "../utils/pricingCalculator";

export function sanitizeCliente(cliente) {
  const nombre = String(cliente.nombre || "").trim();
  const telefono = String(cliente.telefono || "").trim();
  const telefonoNormalized = normalizePhone(cliente.telefonoNormalized || telefono);

  if (!nombre && !telefonoNormalized) {
    throw new Error("El cliente necesita nombre o teléfono.");
  }

  return {
    nombre: nombre || "Sin nombre",
    telefono,
    telefonoNormalized,
    direcciones: Array.isArray(cliente.direcciones)
      ? [...new Set(cliente.direcciones.map((item) => String(item || "").trim()).filter(Boolean))]
      : [],
    totalPedidos: toNumber(cliente.totalPedidos),
    totalComprado: toNumber(cliente.totalComprado),
    ultimaCompraFechaStr: cliente.ultimaCompraFechaStr || "",
    observaciones: String(cliente.observaciones || "").trim(),
    activo: cliente.activo !== false,
  };
}

export function getClienteIdFromPhone(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? `tel-${normalized}` : "";
}

export async function listClientes() {
  return listDocs(COLLECTIONS.clientes, "nombre");
}

export async function saveCliente(cliente) {
  const sanitized = sanitizeCliente(cliente);
  const id = cliente.id || getClienteIdFromPhone(sanitized.telefonoNormalized) || null;
  return saveDoc(COLLECTIONS.clientes, sanitized, id);
}

export async function deleteCliente(id) {
  return deleteDocById(COLLECTIONS.clientes, id);
}

export async function upsertClienteFromPedido(pedido) {
  const phone = pedido.telefonoNormalized || normalizePhone(pedido.telefono);
  if (!phone) return null;

  const clienteId = getClienteIdFromPhone(phone);
  const direccion = String(pedido.direccion || "").trim();

  const cliente = {
    nombre: pedido.nombreCliente || "Sin nombre",
    telefono: pedido.telefono || phone,
    telefonoNormalized: phone,
    direcciones: direccion ? [direccion] : [],
    totalPedidos: 0,
    totalComprado: 0,
    ultimaCompraFechaStr: pedido.fechaStr || "",
    activo: true,
  };

  // Client-side app cannot safely increment existing totals without a transaction in this generic service.
  // We store latest customer identity and address. Statistics are calculated from pedidos.
  return setDocById(COLLECTIONS.clientes, clienteId, cliente, { merge: true });
}
