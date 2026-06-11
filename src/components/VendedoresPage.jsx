import { useEffect, useState } from "react";
import PaginationControls, { usePagination } from "./PaginationControls";
import { deleteVendedor, saveVendedor } from "../services/vendedoresService";

const emptyVendedor = { nombre: "", telefono: "", email: "", observaciones: "", activo: true };

export default function VendedoresPage({ vendedores, onRefresh, setError, setSuccess }) {
  const [form, setForm] = useState(emptyVendedor);
  const [editingId, setEditingId] = useState(null);
  const pagination = usePagination(vendedores, { initialPageSize: 10, resetKey: vendedores.length });

  useEffect(() => {
    if (!editingId) setForm(emptyVendedor);
  }, [editingId]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await saveVendedor({ ...form, id: editingId || undefined });
      setForm(emptyVendedor);
      setEditingId(null);
      await onRefresh();
      setSuccess("Vendedor guardado.");
    } catch (error) {
      setError(error.message || "No se pudo guardar el vendedor.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar vendedor?")) return;
    try {
      await deleteVendedor(id);
      await onRefresh();
      setSuccess("Vendedor eliminado.");
    } catch (error) {
      setError(error.message || "No se pudo eliminar el vendedor.");
    }
  }

  function edit(vendedor) {
    setEditingId(vendedor.id);
    setForm({ ...emptyVendedor, ...vendedor });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Equipo</p><h2>{editingId ? "Editar vendedor" : "Nuevo vendedor"}</h2></div></div>
        <form onSubmit={handleSubmit} className="stack">
          <div className="grid form-grid">
            <label>Nombre<input required value={form.nombre} onChange={(event) => update("nombre", event.target.value)} /></label>
            <label>Teléfono<input value={form.telefono} onChange={(event) => update("telefono", event.target.value)} /></label>
            <label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
            <label>Activo<select value={form.activo ? "SI" : "NO"} onChange={(event) => update("activo", event.target.value === "SI")}><option value="SI">SI</option><option value="NO">NO</option></select></label>
          </div>
          <label>Observaciones<textarea rows="2" value={form.observaciones} onChange={(event) => update("observaciones", event.target.value)} /></label>
          <div className="actions">{editingId && <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>}<button type="submit" className="btn btn-primary">Guardar vendedor</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Listado</p><h2>Vendedores</h2></div><PaginationControls pagination={pagination} label="vendedores" /></div>
        {!vendedores.length ? <div className="empty-state">Todavía no hay vendedores cargados.</div> : <>
          <div className="table-wrap responsive-table">
            <table>
              <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Estado</th><th>Observaciones</th><th>Acciones</th></tr></thead>
              <tbody>{pagination.pageItems.map((vendedor) => <tr key={vendedor.id}><td data-label="Nombre">{vendedor.nombre}</td><td data-label="Teléfono">{vendedor.telefono}</td><td data-label="Email">{vendedor.email}</td><td data-label="Estado"><span className={`badge ${vendedor.activo !== false ? "badge-ok" : "badge-muted"}`}>{vendedor.activo !== false ? "Activo" : "Inactivo"}</span></td><td data-label="Observaciones">{vendedor.observaciones}</td><td data-label="Acciones"><div className="row-actions"><button type="button" className="btn btn-secondary" onClick={() => edit(vendedor)}>Editar</button><button type="button" className="btn btn-danger" onClick={() => handleDelete(vendedor.id)}>Eliminar</button></div></td></tr>)}</tbody>
            </table>
          </div>
          <PaginationControls pagination={pagination} label="vendedores" className="pagination-bottom" />
        </>}
      </section>
    </div>
  );
}
