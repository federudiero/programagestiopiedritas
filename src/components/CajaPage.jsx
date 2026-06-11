import { useEffect, useMemo, useState } from "react";
import { deleteCajaMovimiento, listCajaMovimientos, saveCajaMovimiento } from "../services/cajaService";
import { formatCurrency, formatNumber, todayStr } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";
import PaginationControls, { usePagination } from "./PaginationControls";

const emptyMov = { fechaStr: todayStr(), tipo: "egreso", concepto: "", monto: "", metodoPago: "efectivo", observaciones: "" };

export default function CajaPage({ pedidos, setError, setSuccess }) {
  const [fecha, setFecha] = useState(todayStr());
  const [movimientos, setMovimientos] = useState([]);
  const [mov, setMov] = useState(emptyMov);
  const [loading, setLoading] = useState(false);

  async function loadMovimientos() {
    setLoading(true);
    try {
      setMovimientos(await listCajaMovimientos());
    } catch (error) {
      setError(error.message || "No se pudo cargar la caja.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMovimientos(); }, []);

  const pedidosDia = pedidos.filter((pedido) => pedido.fechaStr === fecha && pedido.estado !== "cancelado");
  const movimientosDia = movimientos.filter((item) => item.fechaStr === fecha);
  const movimientosPagination = usePagination(movimientosDia, { initialPageSize: 10, resetKey: `${fecha}-${movimientosDia.length}` });

  const resumen = useMemo(() => {
    const base = pedidosDia.reduce((acc, pedido) => {
      acc.pedidos += 1;
      acc.totalCliente += Number(pedido.totalCliente || 0);
      acc.productos += Number(pedido.subtotalProductos || pedido.totalVentaProductos || 0);
      acc.envios += Number(pedido.envioCobrado || 0);
      acc.costo += Number(pedido.totalCosto || 0);
      acc.comision += Number(pedido.totalComision || 0);
      acc.ganancia += Number(pedido.totalGanancia || 0);
      if (pedido.metodoPago === "efectivo") acc.efectivo += Number(pedido.totalCliente || 0);
      if (pedido.metodoPago === "transferencia") acc.transferencia += Number(pedido.totalCliente || 0);
      if (pedido.metodoPago === "cuentaCorriente" || pedido.metodoPago === "pendiente") acc.pendiente += Number(pedido.totalCliente || 0);
      return acc;
    }, { pedidos: 0, totalCliente: 0, productos: 0, envios: 0, costo: 0, comision: 0, ganancia: 0, efectivo: 0, transferencia: 0, pendiente: 0, ingresosManual: 0, egresosManual: 0 });

    for (const item of movimientosDia) {
      if (item.tipo === "ingreso") base.ingresosManual += Number(item.monto || 0);
      if (item.tipo === "egreso") base.egresosManual += Number(item.monto || 0);
    }

    base.cajaReal = base.efectivo + base.transferencia + base.ingresosManual - base.egresosManual;
    return base;
  }, [pedidosDia, movimientosDia]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      await saveCajaMovimiento(mov);
      setMov({ ...emptyMov, fechaStr: fecha });
      await loadMovimientos();
      setSuccess("Movimiento de caja guardado.");
    } catch (error) {
      setError(error.message || "No se pudo guardar el movimiento.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar movimiento de caja?")) return;
    setError(""); setSuccess("");
    try {
      await deleteCajaMovimiento(id);
      await loadMovimientos();
      setSuccess("Movimiento eliminado.");
    } catch (error) {
      setError(error.message || "No se pudo eliminar el movimiento.");
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Caja diaria</p><h2>Resumen de caja</h2></div></div>
        <div className="grid calc-grid">
          <label>Fecha<input type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); setMov((current) => ({ ...current, fechaStr: event.target.value })); }} /></label>
        </div>
      </section>

      <div className="summary-grid">
        <SummaryCard label="Pedidos" value={formatNumber(resumen.pedidos)} />
        <SummaryCard label="Total vendido" value={formatCurrency(resumen.totalCliente)} tone="success" />
        <SummaryCard label="Efectivo" value={formatCurrency(resumen.efectivo)} />
        <SummaryCard label="Transferencia" value={formatCurrency(resumen.transferencia)} />
        <SummaryCard label="Pendiente / CC" value={formatCurrency(resumen.pendiente)} tone="warning" />
        <SummaryCard label="Comisiones" value={formatCurrency(resumen.comision)} />
        <SummaryCard label="Ganancia productos" value={formatCurrency(resumen.ganancia)} tone="success" />
        <SummaryCard label="Ingresos manuales" value={formatCurrency(resumen.ingresosManual)} />
        <SummaryCard label="Egresos manuales" value={formatCurrency(resumen.egresosManual)} tone="danger" />
        <SummaryCard label="Caja real estimada" value={formatCurrency(resumen.cajaReal)} tone="success" />
      </div>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Movimientos</p><h2>Ingreso / gasto manual</h2></div></div>
        <form className="grid form-grid" onSubmit={handleSubmit}>
          <label>Fecha<input type="date" value={mov.fechaStr} onChange={(e) => setMov((c) => ({ ...c, fechaStr: e.target.value }))} /></label>
          <label>Tipo<select value={mov.tipo} onChange={(e) => setMov((c) => ({ ...c, tipo: e.target.value }))}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></label>
          <label>Concepto<input value={mov.concepto} onChange={(e) => setMov((c) => ({ ...c, concepto: e.target.value }))} placeholder="Combustible, ayuda descarga, extra..." /></label>
          <label>Monto<input type="number" min="0" step="0.01" value={mov.monto} onChange={(e) => setMov((c) => ({ ...c, monto: e.target.value }))} /></label>
          <label>Método<input value={mov.metodoPago} onChange={(e) => setMov((c) => ({ ...c, metodoPago: e.target.value }))} /></label>
          <label className="wide-field">Observaciones<input value={mov.observaciones} onChange={(e) => setMov((c) => ({ ...c, observaciones: e.target.value }))} /></label>
          <button className="btn btn-primary align-end" type="submit">Guardar movimiento</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Detalle</p><h2>Movimientos de caja</h2></div><div className="row-actions">{loading && <span className="muted">Cargando...</span>}<PaginationControls pagination={movimientosPagination} label="movimientos" /></div></div>
        <div className="table-wrap responsive-table"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Método</th><th>Monto</th><th>Obs.</th><th>Acciones</th></tr></thead><tbody>
          {movimientosPagination.pageItems.map((item) => <tr key={item.id}><td data-label="Fecha">{item.fechaStr}</td><td data-label="Tipo"><span className={`badge ${item.tipo === "ingreso" ? "badge-entregado" : "badge-cancelado"}`}>{item.tipo}</span></td><td data-label="Concepto">{item.concepto}</td><td data-label="Método">{item.metodoPago}</td><td data-label="Monto">{formatCurrency(item.monto)}</td><td data-label="Obs.">{item.observaciones}</td><td data-label="Acciones"><button className="btn btn-danger" type="button" onClick={() => handleDelete(item.id)}>Eliminar</button></td></tr>)}
        </tbody></table></div>
        <PaginationControls pagination={movimientosPagination} label="movimientos" className="pagination-bottom" />
      </section>
    </div>
  );
}
