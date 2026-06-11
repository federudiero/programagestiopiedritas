import { useMemo, useState } from "react";
import {
  buildOrderItem,
  formatCurrency,
  formatPercent,
  normalizePhone,
  summarizeItems,
  todayStr,
  toNumber,
} from "../utils/pricingCalculator";
import { parsePedidoText, parsePedidosText } from "../utils/orderParser";
import { deletePedido, savePedido, updatePedidoEstadoOnly } from "../services/pedidosService";
import SummaryCard from "./SummaryCard";
import PaginationControls, { usePagination } from "./PaginationControls";

const emptyPedido = {
  fechaStr: todayStr(),
  fechaEntrega: "",
  estado: "pendiente",
  metodoPago: "pendiente",
  nombreCliente: "",
  telefono: "",
  direccion: "",
  vendedorId: "",
  vendedorNombre: "",
  pedidoTexto: "",
  observaciones: "",
  rawText: "",
  totalManual: "",
  subtotalProductos: 0,
  envioCobrado: "",
  envioDetectadoPor: "manual",
  items: [],
  requiereRevision: false,
  motivosRevision: [],
  lineasNoIdentificadas: [],
};

function getResumenPedido(pedido) {
  const resumen = summarizeItems(pedido.items || []);
  const envioCobrado = toNumber(pedido.envioCobrado);
  const totalManual = toNumber(pedido.totalManual || pedido.totalCliente);
  const totalCliente = (pedido.items || []).length > 0
    ? totalManual || resumen.totalCliente + envioCobrado
    : totalManual;
  const envioFinal = (pedido.items || []).length > 0
    ? Math.max(0, envioCobrado || totalCliente - resumen.totalCliente)
    : envioCobrado;

  return {
    ...resumen,
    envioCobrado: envioFinal,
    totalCliente,
  };
}

function RevisionBadge({ pedido }) {
  if (!pedido.requiereRevision) return <span className="badge badge-ok">OK</span>;
  return <span className="badge badge-warning">Revisar</span>;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getWhatsappHref(phone) {
  let digits = normalizePhone(phone);
  if (!digits) return "";

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (!digits.startsWith("54") && digits.length >= 9 && digits.length <= 11) {
    digits = `549${digits}`;
  }

  return `https://wa.me/${digits}`;
}

function WhatsappLink({ phone, compact = false }) {
  const href = getWhatsappHref(phone);
  if (!href) return <span className="muted">Sin WhatsApp</span>;

  return (
    <a className={compact ? "inline-link" : "btn btn-whatsapp"} href={href} target="_blank" rel="noreferrer">
      WhatsApp
    </a>
  );
}

function renderItems(items = []) {
  if (!items.length) return "Sin ítems";
  return items.map((item) => `${item.cantidad} x ${item.nombre}`).join("; ");
}

function buildPrintableReport(pedidos = [], fechaReporte = todayStr()) {
  const rows = pedidos.map((pedido, index) => {
    const resumen = getResumenPedido(pedido);
    const whatsappHref = getWhatsappHref(pedido.telefono);
    const motivosRevision = (pedido.motivosRevision || []).join(" | ");

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(pedido.fechaStr || fechaReporte)}</td>
        <td>${escapeHtml(pedido.estado || "pendiente")}${pedido.requiereRevision ? "<br><strong>Revisar</strong>" : ""}${motivosRevision ? `<br><small>${escapeHtml(motivosRevision)}</small>` : ""}</td>
        <td>${escapeHtml(pedido.nombreCliente || "Sin nombre")}</td>
        <td>${escapeHtml(pedido.telefono || "")}${whatsappHref ? `<br><a href="${escapeHtml(whatsappHref)}">Abrir WhatsApp</a>` : ""}</td>
        <td>${escapeHtml(pedido.direccion || "")}</td>
        <td>${escapeHtml(renderItems(pedido.items || []))}</td>
        <td>${escapeHtml(pedido.pedidoTexto || "")}</td>
        <td>${escapeHtml(pedido.fechaEntrega || "")}</td>
        <td>${escapeHtml(pedido.vendedorNombre || "")}</td>
        <td>${formatCurrency(resumen.totalCliente - resumen.envioCobrado)}</td>
        <td>${formatCurrency(resumen.envioCobrado)}</td>
        <td>${formatCurrency(resumen.totalCliente)}</td>
        <td>${escapeHtml(pedido.observaciones || "")}</td>
      </tr>
    `;
  }).join("");

  const totalProductos = pedidos.reduce((acc, pedido) => {
    const resumen = getResumenPedido(pedido);
    return acc + (resumen.totalCliente - resumen.envioCobrado);
  }, 0);
  const totalEnvio = pedidos.reduce((acc, pedido) => acc + getResumenPedido(pedido).envioCobrado, 0);
  const totalCliente = pedidos.reduce((acc, pedido) => acc + getResumenPedido(pedido).totalCliente, 0);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte de pedidos</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .muted { color: #6b7280; margin-bottom: 16px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; }
    .card small { color: #6b7280; display: block; }
    .card strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; text-align: left; }
    th { background: #f3f4f6; }
    a { color: #0f5b85; font-weight: 700; }
    @media print {
      body { margin: 10mm; }
      .no-print { display: none; }
      a { color: #0f5b85; text-decoration: underline; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:10px 14px;border:0;border-radius:8px;background:#0f5b85;color:white;font-weight:bold;cursor:pointer;">Imprimir / Guardar PDF</button>
  <h1>Reporte de pedidos</h1>
  <div class="muted">Fecha de carga: ${escapeHtml(fechaReporte)} · Pedidos: ${pedidos.length}</div>
  <div class="summary">
    <div class="card"><small>Pedidos</small><strong>${pedidos.length}</strong></div>
    <div class="card"><small>Productos</small><strong>${formatCurrency(totalProductos)}</strong></div>
    <div class="card"><small>Envíos</small><strong>${formatCurrency(totalEnvio)}</strong></div>
    <div class="card"><small>Total cliente</small><strong>${formatCurrency(totalCliente)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Fecha</th><th>Estado</th><th>Cliente</th><th>Teléfono</th><th>Dirección</th><th>Ítems</th><th>Pedido</th><th>Entrega</th><th>Vendedor</th><th>Productos</th><th>Envío</th><th>Total</th><th>Observaciones</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function openPrintReport(pedidos, fechaReporte) {
  const reportWindow = window.open("", "_blank", "width=1200,height=800");
  if (!reportWindow) {
    throw new Error("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio.");
  }

  reportWindow.document.open();
  reportWindow.document.write(buildPrintableReport(pedidos, fechaReporte));
  reportWindow.document.close();
  reportWindow.focus();
}

export default function PedidosPage({ productos, vendedores, pedidos, onRefresh, setError, setSuccess }) {
  const [form, setForm] = useState(emptyPedido);
  const [rawText, setRawText] = useState("");
  const [batchPreview, setBatchPreview] = useState([]);
  const [batchFechaStr, setBatchFechaStr] = useState(todayStr());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemPagoEfectivo, setItemPagoEfectivo] = useState(false);
  const [itemPrecioManual, setItemPrecioManual] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [estadoOverrides, setEstadoOverrides] = useState({});
  const [activePedidoView, setActivePedidoView] = useState("carga");

  const productosActivos = useMemo(() => productos.filter((producto) => producto.activo !== false), [productos]);
  const productoSeleccionado = productosActivos.find((producto) => producto.id === selectedProductId) || productosActivos[0] || null;
  const resumenForm = getResumenPedido(form);
  const totalVisible = resumenForm.totalCliente;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyBatchDate(pedido) {
    return {
      ...pedido,
      fechaStr: batchFechaStr || pedido.fechaStr || todayStr(),
    };
  }

  function handleParse() {
    const parsed = applyBatchDate(parsePedidoText(rawText, productosActivos));
    setBatchPreview([]);
    setForm((current) => ({
      ...current,
      ...parsed,
      rawText,
      totalManual: parsed.totalManual || current.totalManual,
      envioCobrado: parsed.envioCobrado || "",
    }));
  }

  function handleParseBatch() {
    const parsed = parsePedidosText(rawText, productosActivos).map(applyBatchDate);
    setBatchPreview(parsed);

    if (parsed.length === 1) {
      setForm((current) => ({
        ...current,
        ...parsed[0],
        totalManual: parsed[0].totalManual || current.totalManual,
        envioCobrado: parsed[0].envioCobrado || "",
      }));
    }
  }

  function handlePrintBatchReport() {
    setError("");

    try {
      if (!batchPreview.length) {
        throw new Error("Primero procesá los pedidos para generar el reporte PDF.");
      }
      openPrintReport(batchPreview, batchFechaStr || todayStr());
    } catch (error) {
      setError(error.message || "No se pudo abrir el reporte PDF.");
    }
  }

  function handlePrintSavedReport() {
    setError("");

    try {
      if (!pedidosVisibles.length) {
        throw new Error("No hay pedidos cargados para imprimir con el filtro actual.");
      }
      openPrintReport(pedidosVisibles, batchFechaStr || todayStr());
    } catch (error) {
      setError(error.message || "No se pudo abrir el reporte PDF.");
    }
  }

  function loadPreviewToForm(pedido) {
    setForm((current) => ({
      ...current,
      ...pedido,
      totalManual: pedido.totalManual || current.totalManual,
      envioCobrado: pedido.envioCobrado || "",
    }));
    setEditingId(null);
    setActivePedidoView("manual");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveOnePreview(pedido, estadoOverride = null) {
    setError("");
    setSuccess("");

    try {
      const pedidoToSave = applyBatchDate({
        ...pedido,
        estado: estadoOverride || pedido.estado || "pendiente",
      });
      await savePedido(pedidoToSave);
      setBatchPreview((current) => current.filter((item) => item.tempId !== pedido.tempId));
      await onRefresh();
      setActivePedidoView("listado");
      setSuccess(estadoOverride === "entregado" ? "Pedido guardado como entregado." : "Pedido guardado desde la vista previa.");
    } catch (error) {
      setError(error.message || "No se pudo guardar el pedido.");
    }
  }

  async function saveAllPreview(estadoOverride = null) {
    if (!batchPreview.length) return;
    const label = estadoOverride === "entregado" ? "como entregados" : "detectados";
    if (!window.confirm(`¿Guardar ${batchPreview.length} pedidos ${label}? Revisá primero los que figuran como Revisar.`)) return;

    setError("");
    setSuccess("");

    try {
      for (const pedido of batchPreview) {
        await savePedido(applyBatchDate({
          ...pedido,
          estado: estadoOverride || pedido.estado || "pendiente",
        }));
      }
      const cantidad = batchPreview.length;
      setBatchPreview([]);
      setRawText("");
      await onRefresh();
      setActivePedidoView("listado");
      setSuccess(`${cantidad} pedidos guardados correctamente${estadoOverride === "entregado" ? " como entregados" : ""}.`);
    } catch (error) {
      setError(error.message || "No se pudieron guardar todos los pedidos.");
    }
  }

  async function updatePedidoEstado(pedido, nuevoEstado) {
    if (!pedido?.id || !nuevoEstado) return;

    const estadoActualVisible = estadoOverrides[pedido.id] || pedido.estado || "pendiente";
    if (estadoActualVisible === nuevoEstado) return;

    setError("");
    setSuccess("");

    setEstadoOverrides((current) => ({
      ...current,
      [pedido.id]: nuevoEstado,
    }));

    try {
      await updatePedidoEstadoOnly(pedido.id, nuevoEstado);
      setSuccess(`Estado guardado como ${nuevoEstado}. No se recargó el listado; se sincroniza completo al refrescar.`);
    } catch (error) {
      setEstadoOverrides((current) => {
        const next = { ...current };
        if (pedido.estado) next[pedido.id] = pedido.estado;
        else delete next[pedido.id];
        return next;
      });
      setError(error.message || "No se pudo actualizar el estado del pedido.");
    }
  }

  function handleVendedorChange(vendedorId) {
    const vendedor = vendedores.find((item) => item.id === vendedorId);
    setForm((current) => ({
      ...current,
      vendedorId,
      vendedorNombre: vendedor?.nombre || current.vendedorNombre,
    }));
  }

  function addItem() {
    if (!productoSeleccionado) return;
    const item = buildOrderItem(productoSeleccionado, itemCantidad, itemPagoEfectivo, itemPrecioManual);
    if (!item) return;

    setForm((current) => ({
      ...current,
      items: [...current.items, item],
    }));
    setItemCantidad(1);
    setItemPagoEfectivo(false);
    setItemPrecioManual("");
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await savePedido({ ...form, id: editingId || undefined });
      setForm({ ...emptyPedido, fechaStr: batchFechaStr || todayStr() });
      setRawText("");
      setEditingId(null);
      setActivePedidoView("listado");
      await onRefresh();
      setSuccess(editingId ? "Pedido actualizado." : "Pedido guardado.");
    } catch (error) {
      setError(error.message || "No se pudo guardar el pedido.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este pedido?")) return;
    setError("");
    setSuccess("");

    try {
      await deletePedido(id);
      await onRefresh();
      setSuccess("Pedido eliminado.");
    } catch (error) {
      setError(error.message || "No se pudo eliminar el pedido.");
    }
  }

  function editPedido(pedido) {
    setEditingId(pedido.id);
    setForm({ ...emptyPedido, ...pedido, items: pedido.items || [] });
    setRawText(pedido.rawText || "");
    setActivePedidoView("manual");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleManualRefresh() {
    setEstadoOverrides({});
    await onRefresh();
  }

  const pedidosFiltrados = pedidos.filter((pedido) => filterEstado === "todos" || pedido.estado === filterEstado);
  const pedidosVisibles = pedidosFiltrados.map((pedido) => ({
    ...pedido,
    estado: estadoOverrides[pedido.id] || pedido.estado || "pendiente",
  }));
  const previewPagination = usePagination(batchPreview, { initialPageSize: 10, resetKey: `${batchPreview.length}-${batchFechaStr}` });
  const pedidosPagination = usePagination(pedidosVisibles, { initialPageSize: 10, resetKey: `${filterEstado}-${pedidosVisibles.length}` });

  return (
    <div className="stack pedidos-page">
      <section className="pedidos-command-center">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h2>Cargá pedidos en 3 pasos</h2>
          <p>Elegí fecha, pegá el texto del vendedor, procesá y guardá desde la vista previa. La carga manual queda en modo avanzado para correcciones.</p>
        </div>
        <div className="pedido-mode-switch" role="tablist" aria-label="Modo de pedidos">
          <button type="button" className={activePedidoView === "carga" ? "active" : ""} onClick={() => setActivePedidoView("carga")}>Carga rápida</button>
          <button type="button" className={activePedidoView === "manual" ? "active" : ""} onClick={() => setActivePedidoView("manual")}>Manual / corregir</button>
          <button type="button" className={activePedidoView === "listado" ? "active" : ""} onClick={() => setActivePedidoView("listado")}>Pedidos cargados</button>
        </div>
      </section>

      {activePedidoView === "carga" && (
      <section className="panel quick-order-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Carga rápida</p>
            <h2>Pegá pedidos y guardá directo</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setActivePedidoView("manual")}>Abrir carga manual</button>
        </div>

        <div className="quick-steps">
          <div><strong>1</strong><span>Fecha y estado</span></div>
          <div><strong>2</strong><span>Pegar texto</span></div>
          <div><strong>3</strong><span>Procesar y guardar</span></div>
        </div>

        <div className="grid quick-order-grid">
          <label>
            Fecha de carga para pedidos masivos
            <input type="date" value={batchFechaStr} onChange={(event) => setBatchFechaStr(event.target.value)} />
          </label>
          <label>
            Estado al guardar
            <select value={form.estado} onChange={(event) => updateField("estado", event.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
        </div>

        <label>
          Pegá acá el mensaje del vendedor
          <textarea rows="7" value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="=== PEDIDO ===\n👤 Nombre: ...\n📌 Dirección: ...\n📱 Teléfono: ...\n📝 Pedido: ...\n💰 Total: ..." />
        </label>
        <div className="actions left batch-actions">
          <button type="button" className="btn btn-secondary" onClick={handleParse}>Leer 1 pedido</button>
          <button type="button" className="btn btn-primary" onClick={handleParseBatch}>Procesar pedidos</button>
          <button type="button" className="btn btn-secondary" onClick={handlePrintBatchReport} disabled={!batchPreview.length}>Imprimir PDF vista previa</button>
        </div>

        {batchPreview.length > 0 && (
          <div className="subpanel batch-preview">
            <div className="section-title-row">
              <div>
                <h3>Pedidos detectados: {batchPreview.length}</h3>
                <p className="muted">Fecha de carga: <strong>{batchFechaStr}</strong>. El sistema separa productos y envío interno. Revisá los pedidos marcados como Revisar antes de guardar.</p>
                <PaginationControls pagination={previewPagination} label="pedidos detectados" />
              </div>
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={handlePrintBatchReport}>Imprimir PDF</button>
                <button type="button" className="btn btn-primary" onClick={() => saveAllPreview()}>Guardar todos</button>
                <button type="button" className="btn btn-success" onClick={() => saveAllPreview("entregado")}>Guardar todos entregados</button>
              </div>
            </div>

            <div className="table-wrap compact-table responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Cliente</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                    <th>Ítems</th>
                    <th>Pedido</th>
                    <th>Productos</th>
                    <th>Envío</th>
                    <th>Total cliente</th>
                    <th>Vendedor</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {previewPagination.pageItems.map((pedido, index) => {
                    const resumen = getResumenPedido(pedido);
                    return (
                      <tr key={pedido.tempId}>
                        <td data-label="#">{previewPagination.from + index}</td>
                        <td data-label="Fecha">{pedido.fechaStr || batchFechaStr}</td>
                        <td data-label="Estado">
                          <RevisionBadge pedido={pedido} />
                          {(pedido.motivosRevision || []).length > 0 && (
                            <div className="muted tiny-text">{pedido.motivosRevision.join(" | ")}</div>
                          )}
                        </td>
                        <td data-label="Cliente">{pedido.nombreCliente || <span className="muted">Sin nombre</span>}</td>
                        <td data-label="Teléfono">
                          <div>{pedido.telefono || <span className="muted">Sin teléfono</span>}</div>
                          <WhatsappLink phone={pedido.telefono} compact />
                        </td>
                        <td data-label="Dirección">{pedido.direccion || <span className="muted">Sin dirección</span>}</td>
                        <td data-label="Ítems">
                          {(pedido.items || []).length ? (
                            <div className="tier-list">
                              {pedido.items.map((item, itemIndex) => (
                                <span key={`${pedido.tempId}-${item.productoId}-${itemIndex}`}>{item.cantidad} x {item.nombre}</span>
                              ))}
                            </div>
                          ) : <span className="muted">Sin ítems</span>}
                        </td>
                        <td data-label="Pedido">{pedido.pedidoTexto || <span className="muted">Sin detalle</span>}</td>
                        <td data-label="Productos">{formatCurrency(resumen.totalCliente - resumen.envioCobrado)}</td>
                        <td data-label="Envío">{formatCurrency(resumen.envioCobrado)}</td>
                        <td data-label="Total cliente">{formatCurrency(resumen.totalCliente)}</td>
                        <td data-label="Vendedor">{pedido.vendedorNombre || <span className="muted">Sin vendedor</span>}</td>
                        <td data-label="Acciones">
                          <div className="row-actions stacked-actions">
                            <WhatsappLink phone={pedido.telefono} />
                            <button type="button" className="btn btn-secondary" onClick={() => loadPreviewToForm(pedido)}>Corregir</button>
                            <button type="button" className="btn btn-primary" onClick={() => saveOnePreview(pedido)}>Guardar</button>
                            <button type="button" className="btn btn-success" onClick={() => saveOnePreview(pedido, "entregado")}>Guardar entregado</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      )}

      {(activePedidoView === "manual" || editingId) && (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Modo avanzado</p>
            <h2>{editingId ? "Editar pedido" : "Carga manual / corrección"}</h2>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid form-grid">
            <label>Fecha carga<input type="date" value={form.fechaStr} onChange={(event) => updateField("fechaStr", event.target.value)} /></label>
            <label>Fecha/turno entrega<input value={form.fechaEntrega} onChange={(event) => updateField("fechaEntrega", event.target.value)} placeholder="Jueves de 7 a 13" /></label>
            <label>Estado<select value={form.estado} onChange={(event) => updateField("estado", event.target.value)}><option value="pendiente">Pendiente</option><option value="entregado">Entregado</option><option value="cancelado">Cancelado</option></select></label>
            <label>Método pago<select value={form.metodoPago} onChange={(event) => updateField("metodoPago", event.target.value)}><option value="pendiente">Pendiente</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="mixto">Mixto</option><option value="cuentaCorriente">Cuenta corriente</option><option value="pagado">Pagado</option></select></label>
            <label>Nombre cliente<input value={form.nombreCliente} onChange={(event) => updateField("nombreCliente", event.target.value)} /></label>
            <label>Teléfono<input value={form.telefono} onChange={(event) => updateField("telefono", event.target.value)} /></label>
            <label>Dirección<input value={form.direccion} onChange={(event) => updateField("direccion", event.target.value)} /></label>
            <label>Vendedor<select value={form.vendedorId} onChange={(event) => handleVendedorChange(event.target.value)}><option value="">Sin vendedor</option>{vendedores.map((vendedor) => <option key={vendedor.id} value={vendedor.id}>{vendedor.nombre}</option>)}</select></label>
            <label>Vendedor texto<input value={form.vendedorNombre} onChange={(event) => updateField("vendedorNombre", event.target.value)} placeholder="Si no está en la lista" /></label>
            <label>Total cliente<input type="number" min="0" step="0.01" value={form.totalManual} onChange={(event) => updateField("totalManual", event.target.value)} placeholder="Total que paga el cliente" /></label>
            <label>Envío cobrado<input type="number" min="0" step="0.01" value={form.envioCobrado} onChange={(event) => updateField("envioCobrado", event.target.value)} placeholder="Se calcula por diferencia si viene incluido" /></label>
            <label>Requiere revisión<select value={form.requiereRevision ? "SI" : "NO"} onChange={(event) => updateField("requiereRevision", event.target.value === "SI")}><option value="NO">NO</option><option value="SI">SI</option></select></label>
          </div>

          {form.motivosRevision?.length > 0 && (
            <div className="alert alert-warning">
              Revisar: {form.motivosRevision.join(" | ")}
            </div>
          )}

          <label>Detalle del pedido<textarea rows="3" value={form.pedidoTexto} onChange={(event) => updateField("pedidoTexto", event.target.value)} /></label>
          <label>Observaciones<textarea rows="2" value={form.observaciones} onChange={(event) => updateField("observaciones", event.target.value)} /></label>

          <div className="subpanel">
            <h3>Ítems calculables</h3>
            <div className="grid item-grid">
              <label>Producto<select value={productoSeleccionado?.id || ""} onChange={(event) => setSelectedProductId(event.target.value)}>{productosActivos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select></label>
              <label>Cantidad<input type="number" min="1" value={itemCantidad} onChange={(event) => setItemCantidad(event.target.value)} /></label>
              <label>Efectivo<select value={itemPagoEfectivo ? "SI" : "NO"} onChange={(event) => setItemPagoEfectivo(event.target.value === "SI")}><option value="NO">NO</option><option value="SI">SI</option></select></label>
              <label>Precio manual unit.<input type="number" min="0" step="0.01" value={itemPrecioManual} onChange={(event) => setItemPrecioManual(event.target.value)} /></label>
              <button type="button" className="btn btn-secondary align-end" onClick={addItem}>Agregar ítem</button>
            </div>

            {form.items.length > 0 && (
              <div className="table-wrap compact-table responsive-table">
                <table>
                  <thead><tr><th>Producto</th><th>Cant.</th><th>Precio cliente</th><th>Total productos</th><th>Ganancia</th><th>Texto detectado</th><th></th></tr></thead>
                  <tbody>{form.items.map((item, index) => <tr key={`${item.productoId}-${index}`}><td data-label="Producto">{item.nombre}</td><td data-label="Cant.">{item.cantidad}</td><td data-label="Precio cliente">{formatCurrency(item.precioClienteUnitario)}</td><td data-label="Total productos">{formatCurrency(item.ventaTotal)}</td><td data-label="Ganancia">{formatCurrency(item.gananciaTotal)}</td><td data-label="Texto detectado">{item.textoOriginal || "—"}</td><td data-label="Acciones"><button type="button" className="btn btn-danger" onClick={() => removeItem(index)}>Quitar</button></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="summary-grid">
            <SummaryCard label="Venta productos" value={formatCurrency(resumenForm.totalCliente - resumenForm.envioCobrado)} tone="success" />
            <SummaryCard label="Envío cobrado" value={formatCurrency(resumenForm.envioCobrado)} />
            <SummaryCard label="Total cliente" value={formatCurrency(totalVisible)} tone="success" />
            <SummaryCard label="Costo productos" value={formatCurrency(resumenForm.totalCosto)} />
            <SummaryCard label="Comisión" value={formatCurrency(resumenForm.totalComision)} />
            <SummaryCard label="Ganancia productos" value={formatCurrency(resumenForm.totalGanancia)} tone="success" />
            <SummaryCard label="Margen productos" value={resumenForm.totalCosto > 0 ? formatPercent(resumenForm.totalGanancia / resumenForm.totalCosto) : "—"} />
          </div>

          <div className="actions">
            {editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(emptyPedido); }}>Cancelar</button>}
            <button type="button" className="btn btn-success" onClick={() => updateField("estado", "entregado")}>Marcar formulario como entregado</button>
            <button type="submit" className="btn btn-primary">Guardar pedido</button>
          </div>
        </form>
      </section>
      )}

      {activePedidoView === "listado" && (
      <section className="panel">
        <div className="panel-header">
          <div><p className="eyebrow">Listado</p><h2>Pedidos cargados</h2></div>
          <div className="row-actions list-toolbar">
            <button type="button" className="btn btn-secondary" onClick={handlePrintSavedReport}>Imprimir PDF listado</button>
            <button type="button" className="btn btn-secondary" onClick={handleManualRefresh}>Actualizar datos</button>
            <label className="small-select">Estado<select value={filterEstado} onChange={(event) => setFilterEstado(event.target.value)}><option value="todos">Todos</option><option value="pendiente">Pendiente</option><option value="entregado">Entregado</option><option value="cancelado">Cancelado</option></select></label>
            <PaginationControls pagination={pedidosPagination} label="pedidos" />
          </div>
        </div>
        <div className="table-wrap responsive-table">
          <table>
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Teléfono</th><th>Dirección</th><th>Pedido</th><th>Vendedor</th><th>Estado</th><th>Productos</th><th>Envío</th><th>Total</th><th>Ganancia</th><th>Acciones</th></tr></thead>
            <tbody>
              {pedidosPagination.pageItems.map((pedido) => (
                <tr key={pedido.id}>
                  <td data-label="Fecha">{pedido.fechaStr}</td>
                  <td data-label="Cliente">{pedido.nombreCliente}</td>
                  <td data-label="Teléfono">
                    <div>{pedido.telefono}</div>
                    <WhatsappLink phone={pedido.telefono} compact />
                  </td>
                  <td data-label="Dirección">{pedido.direccion}</td>
                  <td data-label="Pedido">{pedido.pedidoTexto || `${pedido.items?.length || 0} ítems`}</td>
                  <td data-label="Vendedor">{pedido.vendedorNombre}</td>
                  <td data-label="Estado">
                    <select
                      className={`status-select status-${pedido.estado || "pendiente"}`}
                      value={pedido.estado || "pendiente"}
                      onChange={(event) => updatePedidoEstado(pedido, event.target.value)}
                      aria-label="Cambiar estado del pedido"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    {pedido.requiereRevision && <span className="badge badge-warning status-review-badge">Revisar</span>}
                  </td>
                  <td data-label="Productos">{formatCurrency(pedido.subtotalProductos || pedido.totalVentaProductos || 0)}</td>
                  <td data-label="Envío">{formatCurrency(pedido.envioCobrado || 0)}</td>
                  <td data-label="Total">{formatCurrency(pedido.totalCliente)}</td>
                  <td data-label="Ganancia">{pedido.calculoCompleto === false ? "—" : formatCurrency(pedido.totalGanancia)}</td>
                  <td data-label="Acciones">
                    <div className="row-actions stacked-actions">
                      <WhatsappLink phone={pedido.telefono} />
                      <button className="btn btn-secondary" type="button" onClick={() => editPedido(pedido)}>Editar</button>
                      <button className="btn btn-danger" type="button" onClick={() => handleDelete(pedido.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pedidosPagination} label="pedidos" className="pagination-bottom" />
      </section>
      )}
    </div>
  );
}
