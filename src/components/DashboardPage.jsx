import PaginationControls, { usePagination } from "./PaginationControls";
import { formatCurrency, formatNumber, todayStr } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";

export default function DashboardPage({ pedidos, productos, clientes, vendedores }) {
  const hoy = todayStr();
  const pedidosHoy = pedidos.filter((pedido) => pedido.fechaStr === hoy);
  const pendientes = pedidos.filter((pedido) => pedido.estado === "pendiente");
  const recientesPagination = usePagination(pedidosHoy, { initialPageSize: 10, resetKey: pedidosHoy.length });
  const resumenHoy = pedidosHoy.reduce(
    (acc, pedido) => {
      acc.venta += Number(pedido.totalCliente || 0);
      acc.productos += Number(pedido.subtotalProductos || pedido.totalVentaProductos || 0);
      acc.envio += Number(pedido.envioCobrado || 0);
      acc.costo += Number(pedido.totalCosto || 0);
      acc.comision += Number(pedido.totalComision || 0);
      acc.ganancia += Number(pedido.totalGanancia || 0);
      return acc;
    },
    { venta: 0, productos: 0, envio: 0, costo: 0, comision: 0, ganancia: 0 }
  );

  return (
    <div className="stack">
      <div className="summary-grid">
        <SummaryCard label="Pedidos hoy" value={formatNumber(pedidosHoy.length)} />
        <SummaryCard label="Total cliente hoy" value={formatCurrency(resumenHoy.venta)} tone="success" />
        <SummaryCard label="Venta productos hoy" value={formatCurrency(resumenHoy.productos)} tone="success" />
        <SummaryCard label="Envíos hoy" value={formatCurrency(resumenHoy.envio)} />
        <SummaryCard label="Ganancia hoy" value={formatCurrency(resumenHoy.ganancia)} tone="success" />
        <SummaryCard label="Comisiones hoy" value={formatCurrency(resumenHoy.comision)} />
        <SummaryCard label="Pendientes" value={formatNumber(pendientes.length)} tone={pendientes.length ? "warning" : "default"} />
        <SummaryCard label="Productos" value={formatNumber(productos.length)} />
        <SummaryCard label="Clientes" value={formatNumber(clientes.length)} />
        <SummaryCard label="Vendedores" value={formatNumber(vendedores.length)} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div><p className="eyebrow">Hoy</p><h2>Pedidos recientes</h2></div>
          <PaginationControls pagination={recientesPagination} label="pedidos" />
        </div>
        {pedidosHoy.length === 0 ? (
          <div className="empty-state">Todavía no hay pedidos cargados para hoy.</div>
        ) : (
          <>
            <div className="table-wrap responsive-table">
              <table>
                <thead><tr><th>Cliente</th><th>Dirección</th><th>Pedido</th><th>Vendedor</th><th>Estado</th><th>Productos</th><th>Envío</th><th>Total</th><th>Ganancia</th></tr></thead>
                <tbody>{recientesPagination.pageItems.map((pedido) => <tr key={pedido.id}><td data-label="Cliente">{pedido.nombreCliente}</td><td data-label="Dirección">{pedido.direccion}</td><td data-label="Pedido">{pedido.pedidoTexto}</td><td data-label="Vendedor">{pedido.vendedorNombre}</td><td data-label="Estado"><span className={`badge badge-${pedido.estado}`}>{pedido.estado}</span></td><td data-label="Productos">{formatCurrency(pedido.subtotalProductos || pedido.totalVentaProductos || 0)}</td><td data-label="Envío">{formatCurrency(pedido.envioCobrado || 0)}</td><td data-label="Total">{formatCurrency(pedido.totalCliente)}</td><td data-label="Ganancia">{pedido.calculoCompleto === false ? "—" : formatCurrency(pedido.totalGanancia)}</td></tr>)}</tbody>
              </table>
            </div>
            <PaginationControls pagination={recientesPagination} label="pedidos" className="pagination-bottom" />
          </>
        )}
      </section>
    </div>
  );
}
