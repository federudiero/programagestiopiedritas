import { useMemo, useState } from "react";
import { updatePedidoFieldsOnly } from "../services/pedidosService";
import { formatCurrency, formatNumber } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";
import { WhatsAppAnchor } from "../utils/links.jsx";
import PaginationControls, { usePagination } from "./PaginationControls";

function ClienteCuentaCard({ row, onMarcarPagado }) {
  const pagination = usePagination(row.pedidos, { initialPageSize: 10, resetKey: `${row.cliente}-${row.telefono}-${row.pedidos.length}` });

  return (
    <section className="panel" key={`${row.cliente}-${row.telefono}`}>
      <div className="panel-header">
        <div><p className="eyebrow">Cliente</p><h2>{row.cliente}</h2><p className="muted">{row.telefono} · <WhatsAppAnchor phone={row.telefono} /></p></div>
        <div className="row-actions"><SummaryCard label="Saldo" value={formatCurrency(row.saldo)} tone={row.saldo > 0 ? "warning" : "success"} /><PaginationControls pagination={pagination} label="pedidos" /></div>
      </div>
      <div className="table-wrap responsive-table"><table><thead><tr><th>Fecha</th><th>Pedido</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>{pagination.pageItems.map((pedido) => <tr key={pedido.id}><td data-label="Fecha">{pedido.fechaStr}</td><td data-label="Pedido">{pedido.pedidoTexto}</td><td data-label="Estado">{pedido.metodoPago === "pagado" || pedido.cuentaCorrientePagada ? "Pagado" : "Pendiente"}</td><td data-label="Total">{formatCurrency(pedido.totalCliente)}</td><td data-label="Acciones">{!(pedido.metodoPago === "pagado" || pedido.cuentaCorrientePagada) && <button className="btn btn-primary" type="button" onClick={() => onMarcarPagado(pedido)}>Marcar pagado</button>}</td></tr>)}</tbody></table></div>
      <PaginationControls pagination={pagination} label="pedidos" className="pagination-bottom" />
    </section>
  );
}

export default function CuentaCorrientePage({ pedidos, onRefresh, setError, setSuccess }) {
  const [soloPendientes, setSoloPendientes] = useState(true);

  const rows = useMemo(() => {
    const groups = {};
    for (const pedido of pedidos) {
      const esCuenta = pedido.metodoPago === "cuentaCorriente" || pedido.metodoPago === "pendiente";
      const pagada = pedido.cuentaCorrientePagada || pedido.metodoPago === "pagado";
      if (!esCuenta && !pagada) continue;
      if (soloPendientes && pagada) continue;
      const key = pedido.telefonoNormalized || pedido.telefono || pedido.nombreCliente || pedido.id;
      if (!groups[key]) groups[key] = { cliente: pedido.nombreCliente || "Sin nombre", telefono: pedido.telefono || "", saldo: 0, pedidos: [] };
      const saldo = pagada ? 0 : Number(pedido.totalCliente || 0);
      groups[key].saldo += saldo;
      groups[key].pedidos.push(pedido);
    }
    return Object.values(groups).sort((a, b) => b.saldo - a.saldo);
  }, [pedidos, soloPendientes]);

  const pagination = usePagination(rows, { initialPageSize: 10, resetKey: `${soloPendientes}-${rows.length}` });
  const totalSaldo = rows.reduce((acc, row) => acc + row.saldo, 0);
  const totalPedidos = rows.reduce((acc, row) => acc + row.pedidos.length, 0);

  async function marcarPagado(pedido) {
    setError(""); setSuccess("");
    try {
      await updatePedidoFieldsOnly(pedido.id, { metodoPago: "pagado", cuentaCorrientePagada: true, cuentaCorrienteSaldo: 0, fechaPagoCuentaCorriente: new Date().toISOString().slice(0, 10) });
      await onRefresh();
      setSuccess("Pedido marcado como pagado.");
    } catch (error) {
      setError(error.message || "No se pudo marcar como pagado.");
    }
  }

  return <div className="stack">
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Cuenta corriente</p><h2>Deudas por cliente</h2></div><div className="row-actions"><label className="small-select">Vista<select value={soloPendientes ? "pendientes" : "todos"} onChange={(e) => setSoloPendientes(e.target.value === "pendientes")}><option value="pendientes">Solo pendientes</option><option value="todos">Todos</option></select></label><PaginationControls pagination={pagination} label="clientes" /></div></div></section>
    <div className="summary-grid"><SummaryCard label="Clientes con saldo" value={formatNumber(rows.length)} /><SummaryCard label="Pedidos" value={formatNumber(totalPedidos)} /><SummaryCard label="Saldo pendiente" value={formatCurrency(totalSaldo)} tone="warning" /></div>
    {pagination.pageItems.map((row) => <ClienteCuentaCard key={`${row.cliente}-${row.telefono}`} row={row} onMarcarPagado={marcarPagado} />)}
    <PaginationControls pagination={pagination} label="clientes" className="pagination-bottom" />
  </div>;
}
