import { useMemo, useState } from "react";
import { DEFAULT_ZONAS, buildExternalMapUrl, detectZonaFromText } from "../utils/zonificacion";
import { formatCurrency, formatNumber } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";
import PaginationControls, { usePagination } from "./PaginationControls";

export default function ZonasPage({ pedidos }) {
  const [texto, setTexto] = useState("");
  const zonaDetectada = detectZonaFromText(texto);

  const porZona = useMemo(() => {
    const groups = {};
    for (const pedido of pedidos) {
      const zona = pedido.zonaNombre || detectZonaFromText(`${pedido.direccion || ""} ${pedido.observaciones || ""}`)?.nombre || "Sin zona";
      if (!groups[zona]) groups[zona] = { nombre: zona, pedidos: 0, total: 0, pendientes: 0 };
      groups[zona].pedidos += 1;
      groups[zona].total += Number(pedido.totalCliente || 0);
      if (pedido.estado === "pendiente") groups[zona].pendientes += 1;
    }
    return Object.values(groups).sort((a, b) => b.pedidos - a.pedidos);
  }, [pedidos]);

  const zonasPagination = usePagination(DEFAULT_ZONAS, { initialPageSize: 10, resetKey: DEFAULT_ZONAS.length });
  const actividadPagination = usePagination(porZona, { initialPageSize: 10, resetKey: porZona.length });

  return <div className="stack">
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Mapa sin Google API</p><h2>Zonas de reparto</h2><p className="muted">El sistema detecta zonas por palabras clave y abre OpenStreetMap/link externo. No usa API paga de Google Maps ni geocodifica automáticamente.</p></div></div><div className="grid form-grid"><label className="wide-field">Probar dirección / barrio / localidad<input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: Hugo Miatello 4723 Nuevo Poeta Lugones" /></label><label>Zona detectada<input disabled value={zonaDetectada?.nombre || "Sin detectar"} /></label><label>Alias detectado<input disabled value={zonaDetectada?.aliasDetectado || ""} /></label><a className="btn btn-secondary align-end" href={buildExternalMapUrl(`${texto}, Córdoba, Argentina`)} target="_blank" rel="noreferrer">Abrir mapa OSM</a></div></section>
    <div className="summary-grid"><SummaryCard label="Zonas predefinidas" value={formatNumber(DEFAULT_ZONAS.length)} /><SummaryCard label="Zonas con pedidos" value={formatNumber(porZona.length)} /></div>

    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Base local</p><h2>Zonas cargadas</h2></div><PaginationControls pagination={zonasPagination} label="zonas" /></div><div className="table-wrap responsive-table"><table><thead><tr><th>Zona</th><th>Tipo</th><th>Alias</th><th>Mapa</th></tr></thead><tbody>{zonasPagination.pageItems.map((zona) => <tr key={zona.id}><td data-label="Zona">{zona.nombre}</td><td data-label="Tipo">{zona.tipo}</td><td data-label="Alias">{zona.aliases.slice(0, 12).join(", ")}{zona.aliases.length > 12 ? "..." : ""}</td><td data-label="Mapa"><a className="btn btn-secondary" href={buildExternalMapUrl(`${zona.nombre}, Córdoba, Argentina`)} target="_blank" rel="noreferrer">Ver mapa</a></td></tr>)}</tbody></table></div><PaginationControls pagination={zonasPagination} label="zonas" className="pagination-bottom" /></section>

    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Actividad</p><h2>Pedidos por zona</h2></div><PaginationControls pagination={actividadPagination} label="zonas" /></div><div className="table-wrap responsive-table"><table><thead><tr><th>Zona</th><th>Pedidos</th><th>Pendientes</th><th>Total cliente</th></tr></thead><tbody>{actividadPagination.pageItems.map((row) => <tr key={row.nombre}><td data-label="Zona">{row.nombre}</td><td data-label="Pedidos">{formatNumber(row.pedidos)}</td><td data-label="Pendientes">{formatNumber(row.pendientes)}</td><td data-label="Total">{formatCurrency(row.total)}</td></tr>)}</tbody></table></div><PaginationControls pagination={actividadPagination} label="zonas" className="pagination-bottom" /></section>
  </div>;
}
