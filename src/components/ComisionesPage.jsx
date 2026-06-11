import { useEffect, useMemo, useState } from "react";
import { deleteLiquidacionComision, listLiquidacionesComisiones, saveLiquidacionComision } from "../services/comisionesService";
import { formatCurrency, formatNumber, todayStr } from "../utils/pricingCalculator";
import { inDateRange } from "../utils/dateUtils";
import SummaryCard from "./SummaryCard";
import PaginationControls, { usePagination } from "./PaginationControls";

export default function ComisionesPage({ pedidos, setError, setSuccess }) {
  const [desde, setDesde] = useState(todayStr());
  const [hasta, setHasta] = useState(todayStr());
  const [soloEntregados, setSoloEntregados] = useState(true);
  const [liquidaciones, setLiquidaciones] = useState([]);

  async function loadLiquidaciones() {
    try { setLiquidaciones(await listLiquidacionesComisiones()); } catch { setLiquidaciones([]); }
  }
  useEffect(() => { loadLiquidaciones(); }, []);

  const stats = useMemo(() => {
    const porVendedor = {};
    for (const pedido of pedidos) {
      if (!inDateRange(pedido.fechaStr, desde, hasta)) continue;
      if (soloEntregados && pedido.estado !== "entregado") continue;
      const key = pedido.vendedorNombre || "Sin vendedor";
      if (!porVendedor[key]) porVendedor[key] = { vendedorNombre: key, pedidos: 0, totalCliente: 0, comision: 0, ganancia: 0 };
      porVendedor[key].pedidos += 1;
      porVendedor[key].totalCliente += Number(pedido.totalCliente || 0);
      porVendedor[key].comision += Number(pedido.totalComision || 0);
      porVendedor[key].ganancia += Number(pedido.totalGanancia || 0);
    }
    const rows = Object.values(porVendedor).sort((a, b) => b.comision - a.comision);
    const total = rows.reduce((acc, row) => ({ pedidos: acc.pedidos + row.pedidos, totalCliente: acc.totalCliente + row.totalCliente, comision: acc.comision + row.comision, ganancia: acc.ganancia + row.ganancia }), { pedidos: 0, totalCliente: 0, comision: 0, ganancia: 0 });
    return { rows, total };
  }, [pedidos, desde, hasta, soloEntregados]);

  const comisionesPagination = usePagination(stats.rows, { initialPageSize: 10, resetKey: `${desde}-${hasta}-${soloEntregados}-${stats.rows.length}` });
  const liquidacionesPagination = usePagination(liquidaciones, { initialPageSize: 10, resetKey: liquidaciones.length });

  async function liquidar(row) {
    if (!window.confirm(`¿Registrar liquidación de ${formatCurrency(row.comision)} para ${row.vendedorNombre}?`)) return;
    setError(""); setSuccess("");
    try {
      await saveLiquidacionComision({ fechaStr: todayStr(), desde, hasta, vendedorNombre: row.vendedorNombre, pedidos: row.pedidos, monto: row.comision, observaciones: `Período ${desde} a ${hasta}` });
      await loadLiquidaciones();
      setSuccess("Liquidación registrada.");
    } catch (error) {
      setError(error.message || "No se pudo registrar liquidación.");
    }
  }

  async function eliminarLiquidacion(id) {
    if (!window.confirm("¿Eliminar liquidación?")) return;
    try {
      await deleteLiquidacionComision(id);
      await loadLiquidaciones();
      setSuccess("Liquidación eliminada.");
    } catch (error) {
      setError(error.message || "No se pudo eliminar liquidación.");
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Comisiones</p><h2>Liquidación por vendedor</h2></div></div>
        <div className="grid calc-grid">
          <label>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label>Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
          <label>Solo entregados<select value={soloEntregados ? "SI" : "NO"} onChange={(e) => setSoloEntregados(e.target.value === "SI")}><option value="SI">SI</option><option value="NO">NO</option></select></label>
        </div>
      </section>
      <div className="summary-grid"><SummaryCard label="Pedidos" value={formatNumber(stats.total.pedidos)} /><SummaryCard label="Ventas" value={formatCurrency(stats.total.totalCliente)} /><SummaryCard label="Comisiones" value={formatCurrency(stats.total.comision)} tone="warning" /><SummaryCard label="Ganancia productos" value={formatCurrency(stats.total.ganancia)} tone="success" /></div>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Resultado</p><h2>Comisiones a pagar</h2></div><PaginationControls pagination={comisionesPagination} label="vendedores" /></div>
        <div className="table-wrap responsive-table"><table><thead><tr><th>Vendedor</th><th>Pedidos</th><th>Ventas</th><th>Comisión</th><th>Ganancia</th><th>Acciones</th></tr></thead><tbody>{comisionesPagination.pageItems.map((row) => <tr key={row.vendedorNombre}><td data-label="Vendedor">{row.vendedorNombre}</td><td data-label="Pedidos">{formatNumber(row.pedidos)}</td><td data-label="Ventas">{formatCurrency(row.totalCliente)}</td><td data-label="Comisión">{formatCurrency(row.comision)}</td><td data-label="Ganancia">{formatCurrency(row.ganancia)}</td><td data-label="Acciones"><button className="btn btn-primary" type="button" onClick={() => liquidar(row)}>Marcar liquidada</button></td></tr>)}</tbody></table></div>
        <PaginationControls pagination={comisionesPagination} label="vendedores" className="pagination-bottom" />
      </section>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Historial</p><h2>Liquidaciones registradas</h2></div><PaginationControls pagination={liquidacionesPagination} label="liquidaciones" /></div>
        <div className="table-wrap responsive-table"><table><thead><tr><th>Fecha</th><th>Vendedor</th><th>Período</th><th>Pedidos</th><th>Monto</th><th>Obs.</th><th>Acciones</th></tr></thead><tbody>{liquidacionesPagination.pageItems.map((liq) => <tr key={liq.id}><td data-label="Fecha">{liq.fechaStr}</td><td data-label="Vendedor">{liq.vendedorNombre}</td><td data-label="Período">{liq.desde} a {liq.hasta}</td><td data-label="Pedidos">{formatNumber(liq.pedidos)}</td><td data-label="Monto">{formatCurrency(liq.monto)}</td><td data-label="Obs.">{liq.observaciones}</td><td data-label="Acciones"><button className="btn btn-danger" type="button" onClick={() => eliminarLiquidacion(liq.id)}>Eliminar</button></td></tr>)}</tbody></table></div>
        <PaginationControls pagination={liquidacionesPagination} label="liquidaciones" className="pagination-bottom" />
      </section>
    </div>
  );
}
