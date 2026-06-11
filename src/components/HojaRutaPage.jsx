import { useMemo, useState } from "react";
import { formatCurrency, todayStr } from "../utils/pricingCalculator";
import { detectZonaFromText } from "../utils/zonificacion";
import { MapAnchor, WhatsAppAnchor } from "../utils/links.jsx";
import { buildBasicPrintHtml, escapeHtml, openHtmlReport } from "../utils/reportPrinter";
import PaginationControls, { usePagination } from "./PaginationControls";

function getZona(pedido) {
  if (pedido.zonaNombre) return pedido.zonaNombre;
  return detectZonaFromText(`${pedido.direccion || ""} ${pedido.observaciones || ""}`)?.nombre || "Sin zona";
}

export default function HojaRutaPage({ pedidos, setError }) {
  const [fecha, setFecha] = useState(todayStr());
  const [estado, setEstado] = useState("pendiente");
  const [zona, setZona] = useState("todas");

  const pedidosBase = useMemo(() => pedidos
    .filter((pedido) => pedido.fechaStr === fecha)
    .filter((pedido) => estado === "todos" || pedido.estado === estado)
    .map((pedido) => ({ ...pedido, zonaNombreComputed: getZona(pedido) })), [pedidos, fecha, estado]);

  const zonas = [...new Set(pedidosBase.map((pedido) => pedido.zonaNombreComputed).filter(Boolean))].sort();
  const pedidosVisibles = zona === "todas" ? pedidosBase : pedidosBase.filter((pedido) => pedido.zonaNombreComputed === zona);
  const pagination = usePagination(pedidosVisibles, { initialPageSize: 10, resetKey: `${fecha}-${estado}-${zona}-${pedidosVisibles.length}` });

  function imprimir() {
    setError("");
    try {
      const rows = pedidosVisibles.map((pedido, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(pedido.nombreCliente)}</td>
        <td>${escapeHtml(pedido.telefono)}<br>${pedido.telefono ? `<a href="https://wa.me/${escapeHtml(String(pedido.telefono).replace(/\D/g, ""))}">WhatsApp</a>` : ""}</td>
        <td>${escapeHtml(pedido.direccion)}<br><a href="${escapeHtml(pedido.direccion?.startsWith("http") ? pedido.direccion : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${pedido.direccion || ""}, Córdoba, Argentina`)}`)}">Mapa</a></td>
        <td>${escapeHtml(pedido.zonaNombreComputed)}</td>
        <td>${escapeHtml(pedido.pedidoTexto)}</td>
        <td>${escapeHtml(pedido.fechaEntrega)}</td>
        <td>${escapeHtml(pedido.vendedorNombre)}</td>
        <td>${formatCurrency(pedido.totalCliente)}</td>
      </tr>`).join("");
      openHtmlReport(buildBasicPrintHtml({
        title: "Hoja de ruta",
        subtitle: `Fecha: ${fecha} · Estado: ${estado} · Zona: ${zona}`,
        tableHtml: `<table><thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th>Dirección</th><th>Zona</th><th>Pedido</th><th>Entrega</th><th>Vendedor</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`,
      }));
    } catch (error) {
      setError(error.message || "No se pudo imprimir la hoja de ruta.");
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Logística</p><h2>Hoja de ruta sin API paga</h2><p className="muted">Agrupa por fecha, estado y zona. Los links abren OpenStreetMap o el link original del cliente.</p></div></div>
        <div className="grid calc-grid">
          <label>Fecha<input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label>
          <label>Estado<select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="pendiente">Pendiente</option><option value="entregado">Entregado</option><option value="cancelado">Cancelado</option><option value="todos">Todos</option></select></label>
          <label>Zona<select value={zona} onChange={(event) => setZona(event.target.value)}><option value="todas">Todas</option>{zonas.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button type="button" className="btn btn-secondary align-end" onClick={imprimir}>Imprimir PDF</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Pedidos</p><h2>{pedidosVisibles.length} pedidos para ruta</h2></div><PaginationControls pagination={pagination} label="pedidos" /></div>
        <div className="table-wrap responsive-table"><table><thead><tr><th>Cliente</th><th>Teléfono</th><th>Dirección</th><th>Zona</th><th>Pedido</th><th>Vendedor</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
          {pagination.pageItems.map((pedido) => <tr key={pedido.id}><td data-label="Cliente">{pedido.nombreCliente}</td><td data-label="Teléfono"><div>{pedido.telefono}</div><WhatsAppAnchor phone={pedido.telefono} /></td><td data-label="Dirección">{pedido.direccion}</td><td data-label="Zona">{pedido.zonaNombreComputed}</td><td data-label="Pedido">{pedido.pedidoTexto}</td><td data-label="Vendedor">{pedido.vendedorNombre}</td><td data-label="Total">{formatCurrency(pedido.totalCliente)}</td><td data-label="Acciones"><div className="row-actions stacked-actions"><MapAnchor address={pedido.direccion} className="btn btn-secondary" /><WhatsAppAnchor phone={pedido.telefono} className="btn btn-whatsapp" /></div></td></tr>)}
        </tbody></table></div>
        <PaginationControls pagination={pagination} label="pedidos" className="pagination-bottom" />
      </section>
    </div>
  );
}
