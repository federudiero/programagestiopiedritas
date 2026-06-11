import { useMemo, useState } from "react";
import { calcularVenta, formatCurrency, formatPercent } from "../utils/pricingCalculator";
import SummaryCard from "./SummaryCard";

export default function Calculator({ productos }) {
  const productosActivos = useMemo(() => productos.filter((producto) => producto.activo !== false), [productos]);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [pagoEfectivo, setPagoEfectivo] = useState(false);
  const [precioManualUnitario, setPrecioManualUnitario] = useState("");
  const [gananciaObjetivoPorcentaje, setGananciaObjetivoPorcentaje] = useState(100);

  const producto = productosActivos.find((item) => item.id === productoId) || productosActivos[0] || null;
  const resultado = calcularVenta({ producto, cantidad, pagoEfectivo, precioManualUnitario, gananciaObjetivoPorcentaje });

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Calculadora</p>
            <h2>Simular venta</h2>
          </div>
        </div>

        <div className="grid calc-grid">
          <label>
            Producto
            <select value={producto?.id || ""} onChange={(event) => setProductoId(event.target.value)}>
              {productosActivos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
          <label>
            Cantidad
            <input type="number" min="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
          </label>
          <label>
            Pago efectivo
            <select value={pagoEfectivo ? "SI" : "NO"} onChange={(event) => setPagoEfectivo(event.target.value === "SI")}>
              <option value="NO">NO</option>
              <option value="SI">SI</option>
            </select>
          </label>
          <label>
            Precio manual unitario opcional
            <input type="number" min="0" step="0.01" value={precioManualUnitario} onChange={(event) => setPrecioManualUnitario(event.target.value)} placeholder="Vacío usa precio por tramo" />
          </label>
          <label>
            Ganancia objetivo %
            <input type="number" min="0" step="1" value={gananciaObjetivoPorcentaje} onChange={(event) => setGananciaObjetivoPorcentaje(event.target.value)} />
          </label>
        </div>
      </section>

      {resultado ? (
        <>
          <div className="summary-grid">
            <SummaryCard label="Precio cliente unitario" value={formatCurrency(resultado.precioClienteUnitario)} />
            <SummaryCard label="Total que paga cliente" value={formatCurrency(resultado.ventaTotal)} tone="success" />
            <SummaryCard label="Costo total" value={formatCurrency(resultado.costoTotal)} />
            <SummaryCard label="Ganancia total" value={formatCurrency(resultado.gananciaTotal)} tone={resultado.gananciaTotal >= 0 ? "success" : "danger"} />
            <SummaryCard label="Margen sobre costo" value={formatPercent(resultado.margenSobreCosto)} />
            <SummaryCard label={`Precio para ganar ${gananciaObjetivoPorcentaje}%`} value={resultado.precioObjetivoPersonalizado === null ? "No viable" : formatCurrency(resultado.precioObjetivoPersonalizado)} />
          </div>

          <section className="panel">
            <h3>Detalle</h3>
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr><th>Precio lista unitario</th><td>{formatCurrency(resultado.precioListaUnitario)}</td></tr>
                  <tr><th>Descuento unitario</th><td>{formatCurrency(resultado.descuentoUnitario)}</td></tr>
                  <tr><th>Costo material unitario</th><td>{formatCurrency(resultado.costoMaterialUnitario)}</td></tr>
                  <tr><th>Comisión unitaria</th><td>{formatCurrency(resultado.comisionUnitaria)}</td></tr>
                  <tr><th>Costo total unitario</th><td>{formatCurrency(resultado.costoTotalUnitario)}</td></tr>
                  <tr><th>Ganancia unitaria</th><td>{formatCurrency(resultado.gananciaUnitaria)}</td></tr>
                  <tr><th>Precio para ganar 100%</th><td>{resultado.precioObjetivo100 === null ? "No viable" : formatCurrency(resultado.precioObjetivo100)}</td></tr>
                  <tr><th>Precio para ganar 150%</th><td>{resultado.precioObjetivo150 === null ? "No viable" : formatCurrency(resultado.precioObjetivo150)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : <section className="panel empty-state">Cargá productos para usar la calculadora.</section>}
    </div>
  );
}
