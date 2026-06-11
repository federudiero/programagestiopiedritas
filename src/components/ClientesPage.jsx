import PaginationControls, { usePagination } from "./PaginationControls";
import { formatCurrency } from "../utils/pricingCalculator";
import { WhatsAppAnchor } from "../utils/links.jsx";

export default function ClientesPage({ clientes, pedidos }) {
  const statsPorTelefono = pedidos.reduce((acc, pedido) => {
    const key = pedido.telefonoNormalized || pedido.telefono || "sin-telefono";
    if (!acc[key]) acc[key] = { pedidos: 0, comprado: 0, ultima: "" };
    acc[key].pedidos += 1;
    acc[key].comprado += Number(pedido.totalCliente || 0);
    if (String(pedido.fechaStr || "") > acc[key].ultima) acc[key].ultima = pedido.fechaStr;
    return acc;
  }, {});

  const pagination = usePagination(clientes, { initialPageSize: 10, resetKey: clientes.length });

  return (
    <section className="panel">
      <div className="panel-header">
        <div><p className="eyebrow">Base automática</p><h2>Clientes</h2></div>
        <PaginationControls pagination={pagination} label="clientes" />
      </div>
      <p className="muted">Los clientes se crean o actualizan automáticamente cuando guardás pedidos con teléfono.</p>
      {!clientes.length ? (
        <div className="empty-state">Todavía no hay clientes cargados.</div>
      ) : (
        <>
          <div className="table-wrap responsive-table">
            <table>
              <thead><tr><th>Cliente</th><th>Teléfono</th><th>WhatsApp</th><th>Direcciones</th><th>Pedidos</th><th>Total comprado</th><th>Última compra</th></tr></thead>
              <tbody>{pagination.pageItems.map((cliente) => {
                const stats = statsPorTelefono[cliente.telefonoNormalized] || { pedidos: 0, comprado: 0, ultima: cliente.ultimaCompraFechaStr || "" };
                return (
                  <tr key={cliente.id}>
                    <td data-label="Cliente">{cliente.nombre}</td>
                    <td data-label="Teléfono">{cliente.telefono}</td>
                    <td data-label="WhatsApp"><WhatsAppAnchor phone={cliente.telefono} className="btn btn-whatsapp" /></td>
                    <td data-label="Direcciones">{(cliente.direcciones || []).join(" | ")}</td>
                    <td data-label="Pedidos">{stats.pedidos}</td>
                    <td data-label="Total comprado">{formatCurrency(stats.comprado)}</td>
                    <td data-label="Última compra">{stats.ultima}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <PaginationControls pagination={pagination} label="clientes" className="pagination-bottom" />
        </>
      )}
    </section>
  );
}
