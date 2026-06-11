import { useEffect, useState } from "react";

const emptyProduct = {
  codigo: "",
  nombre: "",
  familia: "General",
  unidad: "unidad",
  costoMaterialUnitario: "",
  comision: { tipo: "sin_comision", valor: "" },
  descuentoEfectivo: { aplica: false, porcentaje: "" },
  precios: [{ desde: 1, precioUnitario: "" }],
  aliases: "",
  stockActual: "",
  stockMinimo: "",
  activo: true,
};

export default function ProductForm({ selectedProduct, onSave, onCancel }) {
  const [form, setForm] = useState(emptyProduct);

  useEffect(() => {
    if (selectedProduct) {
      setForm({
        ...emptyProduct,
        ...selectedProduct,
        comision: { ...emptyProduct.comision, ...(selectedProduct.comision || {}) },
        descuentoEfectivo: { ...emptyProduct.descuentoEfectivo, ...(selectedProduct.descuentoEfectivo || {}) },
        precios: selectedProduct.precios?.length ? selectedProduct.precios : emptyProduct.precios,
        aliases: Array.isArray(selectedProduct.aliases) ? selectedProduct.aliases.join("\n") : selectedProduct.aliases || "",
      });
    } else {
      setForm(emptyProduct);
    }
  }, [selectedProduct]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCommission(field, value) {
    setForm((current) => ({ ...current, comision: { ...current.comision, [field]: value } }));
  }

  function updateCashDiscount(field, value) {
    setForm((current) => ({ ...current, descuentoEfectivo: { ...current.descuentoEfectivo, [field]: value } }));
  }

  function updatePriceTier(index, field, value) {
    setForm((current) => ({
      ...current,
      precios: current.precios.map((precio, itemIndex) => (itemIndex === index ? { ...precio, [field]: value } : precio)),
    }));
  }

  function addPriceTier() {
    setForm((current) => ({
      ...current,
      precios: [...current.precios, { desde: 1, precioUnitario: "" }],
    }));
  }

  function removePriceTier(index) {
    setForm((current) => ({
      ...current,
      precios: current.precios.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Base editable</p>
          <h2>{selectedProduct ? "Editar producto" : "Nuevo producto"}</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <div className="grid form-grid">
          <label>
            Código
            <input value={form.codigo} onChange={(event) => updateField("codigo", event.target.value)} />
          </label>
          <label>
            Nombre
            <input required value={form.nombre} onChange={(event) => updateField("nombre", event.target.value)} />
          </label>
          <label>
            Familia
            <input value={form.familia} onChange={(event) => updateField("familia", event.target.value)} />
          </label>
          <label>
            Unidad
            <input value={form.unidad} onChange={(event) => updateField("unidad", event.target.value)} />
          </label>
          <label>
            Costo material unitario
            <input type="number" min="0" step="0.01" value={form.costoMaterialUnitario} onChange={(event) => updateField("costoMaterialUnitario", event.target.value)} />
          </label>
          <label>
            Tipo comisión
            <select value={form.comision.tipo} onChange={(event) => updateCommission("tipo", event.target.value)}>
              <option value="sin_comision">Sin comisión</option>
              <option value="fija">Fija por unidad</option>
              <option value="porcentaje">Porcentaje sobre venta</option>
            </select>
          </label>
          <label>
            Comisión
            <input type="number" min="0" step="0.01" value={form.comision.valor} onChange={(event) => updateCommission("valor", event.target.value)} />
          </label>
          <label>
            Activo
            <select value={form.activo ? "SI" : "NO"} onChange={(event) => updateField("activo", event.target.value === "SI")}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </label>
          <label>
            Aplica descuento efectivo
            <select value={form.descuentoEfectivo.aplica ? "SI" : "NO"} onChange={(event) => updateCashDiscount("aplica", event.target.value === "SI")}>
              <option value="NO">NO</option>
              <option value="SI">SI</option>
            </select>
          </label>
          <label>
            % descuento efectivo
            <input type="number" min="0" step="0.01" value={form.descuentoEfectivo.porcentaje} onChange={(event) => updateCashDiscount("porcentaje", event.target.value)} />
          </label>
          <label className="wide-field">
            Alias / palabras clave para detectar pedidos
            <textarea rows="3" value={form.aliases} onChange={(event) => updateField("aliases", event.target.value)} placeholder="Una por línea o separadas por coma. Ej: blanca, blancas, bolsas blancas" />
          </label>
          <label>
            Stock actual opcional
            <input type="number" min="0" step="0.01" value={form.stockActual} onChange={(event) => updateField("stockActual", event.target.value)} />
          </label>
          <label>
            Stock mínimo opcional
            <input type="number" min="0" step="0.01" value={form.stockMinimo} onChange={(event) => updateField("stockMinimo", event.target.value)} />
          </label>
        </div>

        <div className="section-title-row">
          <h3>Precios por cantidad</h3>
          <button type="button" className="btn btn-secondary" onClick={addPriceTier}>Agregar tramo</button>
        </div>

        <div className="price-tiers">
          {form.precios.map((precio, index) => (
            <div className="price-tier-row" key={index}>
              <label>
                Desde cantidad
                <input type="number" min="1" value={precio.desde} onChange={(event) => updatePriceTier(index, "desde", event.target.value)} />
              </label>
              <label>
                Precio unitario
                <input type="number" min="0" step="0.01" value={precio.precioUnitario} onChange={(event) => updatePriceTier(index, "precioUnitario", event.target.value)} />
              </label>
              <button type="button" className="btn btn-danger" disabled={form.precios.length === 1} onClick={() => removePriceTier(index)}>Quitar</button>
            </div>
          ))}
        </div>

        <div className="actions">
          {selectedProduct && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>}
          <button type="submit" className="btn btn-primary">Guardar producto</button>
        </div>
      </form>
    </section>
  );
}
