import { useEffect, useState } from "react";
import { listAuditoria } from "../services/auditoriaService";
import PaginationControls, { usePagination } from "./PaginationControls";

export default function AuditoriaPage({ setError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await listAuditoria()); } catch (error) { setError(error.message || "No se pudo cargar auditoría."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const pagination = usePagination(rows, { initialPageSize: 25, resetKey: rows.length });

  return <div className="stack">
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Auditoría</p><h2>Registro de cambios</h2><p className="muted">Muestra altas, ediciones, cambios de estado, stock, caja y liquidaciones. Carga solo al entrar a esta sección para evitar lecturas innecesarias.</p></div><div className="row-actions"><button className="btn btn-secondary" type="button" onClick={load}>Actualizar</button><PaginationControls pagination={pagination} label="registros" /></div></div>{loading && <div className="alert">Cargando auditoría...</div>}</section>
    <section className="panel"><div className="table-wrap responsive-table"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Detalle</th></tr></thead><tbody>{pagination.pageItems.map((row) => <tr key={row.id}><td data-label="Fecha">{row.createdAtIso || "—"}</td><td data-label="Acción">{row.action}</td><td data-label="Entidad">{row.entityType}</td><td data-label="ID">{row.entityId}</td><td data-label="Detalle"><pre className="json-preview">{JSON.stringify(row.details || {}, null, 2)}</pre></td></tr>)}</tbody></table></div><PaginationControls pagination={pagination} label="registros" className="pagination-bottom" /></section>
  </div>;
}
