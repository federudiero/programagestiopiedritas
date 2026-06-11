import PaginationControls, { usePagination } from "./PaginationControls";
import { formatCurrency } from "../utils/pricingCalculator";

export default function ProductTable({ productos, onEdit, onDelete }) {
  const pagination = usePagination(productos, { initialPageSize: 10, resetKey: productos.length });

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Listado editable</p>
          <h2>Productos</h2>
        </div>
        <PaginationControls pagination={pagination} label="productos" />
      </div>

      {!productos.length ? (
        <div className="empty-state">Todavía no hay productos cargados.</div>
      ) : (
        <>
          <div className="table-wrap responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Familia</th>
                  <th>Unidad</th>
                  <th>Costo</th>
                  <th>Comisión</th>
                  <th>Precios</th>
                  <th>Alias</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((producto) => (
                  <tr key={producto.id}>
                    <td data-label="Código">{producto.codigo || "—"}</td>
                    <td data-label="Producto">{producto.nombre}</td>
                    <td data-label="Familia">{producto.familia}</td>
                    <td data-label="Unidad">{producto.unidad}</td>
                    <td data-label="Costo">{formatCurrency(producto.costoMaterialUnitario)}</td>
                    <td data-label="Comisión">
                      {producto.comision?.tipo === "porcentaje"
                        ? `${producto.comision.valor}%`
                        : producto.comision?.tipo === "fija"
                          ? formatCurrency(producto.comision.valor)
                          : "Sin comisión"}
                    </td>
                    <td data-label="Precios">
                      <div className="tier-list">
                        {(producto.precios || []).map((precio) => (
                          <span key={`${producto.id}-${precio.desde}`}>Desde {precio.desde}: {formatCurrency(precio.precioUnitario)}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Alias">
                      <div className="tier-list">
                        {(producto.aliases || []).slice(0, 5).map((alias) => (
                          <span key={`${producto.id}-${alias}`}>{alias}</span>
                        ))}
                        {(producto.aliases || []).length > 5 && <span>+{producto.aliases.length - 5} más</span>}
                      </div>
                    </td>
                    <td data-label="Estado"><span className={`badge ${producto.activo !== false ? "badge-ok" : "badge-muted"}`}>{producto.activo !== false ? "Activo" : "Inactivo"}</span></td>
                    <td data-label="Acciones">
                      <div className="row-actions">
                        <button className="btn btn-secondary" type="button" onClick={() => onEdit(producto)}>Editar</button>
                        <button className="btn btn-danger" type="button" onClick={() => onDelete(producto.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={pagination} label="productos" className="pagination-bottom" />
        </>
      )}
    </section>
  );
}
