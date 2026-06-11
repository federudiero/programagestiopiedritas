import { useEffect, useState } from "react";
import { listStockMovimientos, saveStockManual } from "../services/stockService";
import { formatNumber, todayStr, toNumber } from "../utils/pricingCalculator";
import PaginationControls, { usePagination } from "./PaginationControls";

export default function StockPage({ productos, onRefresh, setError, setSuccess }) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [observaciones, setObservaciones] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const producto = productos.find((item) => item.id === productoId) || productos[0] || null;

  async function loadMovimientos() {
    try { setMovimientos(await listStockMovimientos()); } catch { setMovimientos([]); }
  }
  useEffect(() => { loadMovimientos(); }, []);
  useEffect(() => { if (!productoId && productos[0]?.id) setProductoId(productos[0].id); }, [productos, productoId]);

  const productosPagination = usePagination(productos, { initialPageSize: 10, resetKey: productos.length });
  const movimientosPagination = usePagination(movimientos, { initialPageSize: 10, resetKey: movimientos.length });

  async function handleAjuste(event) {
    event.preventDefault();
    if (!producto) return;
    setError(""); setSuccess("");
    try {
      await saveStockManual(producto, { tipo, cantidad: toNumber(cantidad), nuevoStock: toNumber(cantidad), fechaStr: todayStr(), observaciones });
      setCantidad(""); setObservaciones("");
      await Promise.all([onRefresh(), loadMovimientos()]);
      setSuccess("Stock actualizado.");
    } catch (error) {
      setError(error.message || "No se pudo actualizar stock.");
    }
  }

  const stockBajo = productos.filter((producto) => toNumber(producto.stockMinimo) > 0 && toNumber(producto.stockActual) <= toNumber(producto.stockMinimo));

  return <div className="stack">
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Stock</p><h2>Movimientos de stock</h2></div></div>
      <form className="grid form-grid" onSubmit={handleAjuste}>
        <label>Producto<select value={productoId} onChange={(e) => setProductoId(e.target.value)}>{productos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste exacto</option></select></label>
        <label>Cantidad<input type="number" min="0" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
        <label>Observaciones<input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></label>
        <button className="btn btn-primary align-end" type="submit">Guardar movimiento</button>
      </form>
    </section>
    {stockBajo.length > 0 && <div className="alert alert-warning">Stock bajo: {stockBajo.map((item) => item.nombre).join(", ")}</div>}

    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Productos</p><h2>Stock por producto</h2></div><PaginationControls pagination={productosPagination} label="productos" /></div><div className="table-wrap responsive-table"><table><thead><tr><th>Producto</th><th>Familia</th><th>Stock actual</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>
      {productosPagination.pageItems.map((item) => { const bajo = toNumber(item.stockMinimo) > 0 && toNumber(item.stockActual) <= toNumber(item.stockMinimo); return <tr key={item.id}><td data-label="Producto">{item.nombre}</td><td data-label="Familia">{item.familia}</td><td data-label="Stock actual">{formatNumber(item.stockActual)}</td><td data-label="Mínimo">{formatNumber(item.stockMinimo)}</td><td data-label="Estado"><span className={`badge ${bajo ? "badge-cancelado" : "badge-ok"}`}>{bajo ? "Bajo" : "OK"}</span></td></tr>; })}
    </tbody></table></div><PaginationControls pagination={productosPagination} label="productos" className="pagination-bottom" /></section>

    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Historial</p><h2>Últimos movimientos</h2></div><PaginationControls pagination={movimientosPagination} label="movimientos" /></div><div className="table-wrap responsive-table"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Antes</th><th>Después</th><th>Obs.</th></tr></thead><tbody>{movimientosPagination.pageItems.map((mov) => <tr key={mov.id}><td data-label="Fecha">{mov.fechaStr}</td><td data-label="Producto">{mov.productoNombre}</td><td data-label="Tipo">{mov.tipo}</td><td data-label="Cantidad">{formatNumber(mov.cantidad)}</td><td data-label="Antes">{formatNumber(mov.stockAnterior)}</td><td data-label="Después">{formatNumber(mov.stockNuevo)}</td><td data-label="Obs.">{mov.observaciones}</td></tr>)}</tbody></table></div><PaginationControls pagination={movimientosPagination} label="movimientos" className="pagination-bottom" /></section>
  </div>;
}
