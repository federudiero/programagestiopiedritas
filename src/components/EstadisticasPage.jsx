import { useMemo, useState } from "react";
import { formatCurrency, formatNumber, todayStr } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";
import PaginationControls, { usePagination } from "./PaginationControls";

function addGroup(groups, key, values) {
  const cleanKey = key || "Sin dato";
  if (!groups[cleanKey]) {
    groups[cleanKey] = {
      nombre: cleanKey,
      cantidad: 0,
      pedidos: 0,
      venta: 0,
      productos: 0,
      envio: 0,
      costo: 0,
      comision: 0,
      ganancia: 0,
    };
  }
  groups[cleanKey].cantidad += Number(values.cantidad || 0);
  groups[cleanKey].pedidos += Number(values.pedidos || 0);
  groups[cleanKey].venta += Number(values.venta || 0);
  groups[cleanKey].productos += Number(values.productos || 0);
  groups[cleanKey].envio += Number(values.envio || 0);
  groups[cleanKey].costo += Number(values.costo || 0);
  groups[cleanKey].comision += Number(values.comision || 0);
  groups[cleanKey].ganancia += Number(values.ganancia || 0);
}

function StatTable({ title, rows, showCantidad = false, resetKey }) {
  const pagination = usePagination(rows, { initialPageSize: 10, resetKey });

  return (
    <section className="panel">
      <div className="panel-header"><div><p className="eyebrow">Reporte</p><h2>{title}</h2></div><PaginationControls pagination={pagination} label="filas" /></div>
      <div className="table-wrap responsive-table">
        <table>
          <thead><tr><th>Nombre</th>{showCantidad && <th>Cantidad</th>}<th>Pedidos</th><th>Total cliente</th><th>Productos</th><th>Envío</th><th>Costo</th><th>Comisión</th><th>Ganancia productos</th></tr></thead>
          <tbody>{pagination.pageItems.map((row) => <tr key={row.nombre}><td data-label="Nombre">{row.nombre}</td>{showCantidad && <td data-label="Cantidad">{formatNumber(row.cantidad)}</td>}<td data-label="Pedidos">{formatNumber(row.pedidos)}</td><td data-label="Total cliente">{formatCurrency(row.venta)}</td><td data-label="Productos">{formatCurrency(row.productos)}</td><td data-label="Envío">{formatCurrency(row.envio)}</td><td data-label="Costo">{formatCurrency(row.costo)}</td><td data-label="Comisión">{formatCurrency(row.comision)}</td><td data-label="Ganancia productos">{formatCurrency(row.ganancia)}</td></tr>)}</tbody>
        </table>
      </div>
      <PaginationControls pagination={pagination} label="filas" className="pagination-bottom" />
    </section>
  );
}

export default function EstadisticasPage({ pedidos }) {
  const [desde, setDesde] = useState(todayStr());
  const [hasta, setHasta] = useState(todayStr());
  const [soloEntregados, setSoloEntregados] = useState(false);

  const stats = useMemo(() => {
    const filtrados = pedidos.filter((pedido) => {
      const fecha = pedido.fechaStr || "";
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      if (soloEntregados && pedido.estado !== "entregado") return false;
      return true;
    });

    const resumen = filtrados.reduce(
      (acc, pedido) => {
        acc.pedidos += 1;
        acc.venta += Number(pedido.totalCliente || 0);
        acc.productos += Number(pedido.subtotalProductos || pedido.totalVentaProductos || 0);
        acc.envio += Number(pedido.envioCobrado || 0);
        acc.costo += Number(pedido.totalCosto || 0);
        acc.comision += Number(pedido.totalComision || 0);
        acc.ganancia += Number(pedido.totalGanancia || 0);
        return acc;
      },
      { pedidos: 0, venta: 0, productos: 0, envio: 0, costo: 0, comision: 0, ganancia: 0 }
    );

    const porProducto = {};
    const porVendedor = {};
    const porDia = {};

    for (const pedido of filtrados) {
      const productosTotal = Number(pedido.subtotalProductos || pedido.totalVentaProductos || 0);
      const envio = Number(pedido.envioCobrado || 0);

      addGroup(porVendedor, pedido.vendedorNombre || "Sin vendedor", {
        pedidos: 1,
        venta: pedido.totalCliente,
        productos: productosTotal,
        envio,
        costo: pedido.totalCosto,
        comision: pedido.totalComision,
        ganancia: pedido.totalGanancia,
      });

      addGroup(porDia, pedido.fechaStr || "Sin fecha", {
        pedidos: 1,
        venta: pedido.totalCliente,
        productos: productosTotal,
        envio,
        costo: pedido.totalCosto,
        comision: pedido.totalComision,
        ganancia: pedido.totalGanancia,
      });

      for (const item of pedido.items || []) {
        addGroup(porProducto, item.nombre, {
          cantidad: item.cantidad,
          venta: item.ventaTotal,
          productos: item.ventaTotal,
          envio: 0,
          costo: item.costoTotal,
          comision: item.comisionTotal,
          ganancia: item.gananciaTotal,
        });
      }
    }

    return {
      filtrados,
      resumen,
      porProducto: Object.values(porProducto).sort((a, b) => b.venta - a.venta),
      porVendedor: Object.values(porVendedor).sort((a, b) => b.venta - a.venta),
      porDia: Object.values(porDia).sort((a, b) => String(b.nombre).localeCompare(String(a.nombre))),
    };
  }, [pedidos, desde, hasta, soloEntregados]);

  const resetKey = `${desde}-${hasta}-${soloEntregados}`;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Estadísticas</p><h2>Ventas por período</h2></div></div>
        <div className="grid calc-grid">
          <label>Desde<input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
          <label>Hasta<input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
          <label>Solo entregados<select value={soloEntregados ? "SI" : "NO"} onChange={(event) => setSoloEntregados(event.target.value === "SI")}><option value="NO">NO</option><option value="SI">SI</option></select></label>
        </div>
      </section>

      <div className="summary-grid">
        <SummaryCard label="Pedidos" value={formatNumber(stats.resumen.pedidos)} />
        <SummaryCard label="Total cliente" value={formatCurrency(stats.resumen.venta)} tone="success" />
        <SummaryCard label="Venta productos" value={formatCurrency(stats.resumen.productos)} tone="success" />
        <SummaryCard label="Envíos cobrados" value={formatCurrency(stats.resumen.envio)} />
        <SummaryCard label="Costo productos" value={formatCurrency(stats.resumen.costo)} />
        <SummaryCard label="Comisiones" value={formatCurrency(stats.resumen.comision)} />
        <SummaryCard label="Ganancia productos" value={formatCurrency(stats.resumen.ganancia)} tone="success" />
      </div>

      <StatTable title="Por producto" rows={stats.porProducto} showCantidad resetKey={`${resetKey}-producto-${stats.porProducto.length}`} />
      <StatTable title="Por vendedor" rows={stats.porVendedor} resetKey={`${resetKey}-vendedor-${stats.porVendedor.length}`} />
      <StatTable title="Por día" rows={stats.porDia} resetKey={`${resetKey}-dia-${stats.porDia.length}`} />
    </div>
  );
}
