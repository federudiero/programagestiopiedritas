import { useState } from "react";
import { exportAllData, importBackupData, saveBackupRecord } from "../services/backupService";
import { downloadCsv, downloadJson, readJsonFile } from "../utils/exporters";

export default function BackupsPage({ pedidos, onRefresh, setError, setSuccess }) {
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setError("");
    setSuccess("");
    try {
      const data = await exportAllData();
      const filename = `backup-gestion-productos-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(filename, data);
      await saveBackupRecord({ tipo: "export_json", filename, collections: Object.keys(data.collections) });
      setSuccess("Backup exportado correctamente.");
    } catch (error) {
      setError(error.message || "No se pudo exportar el backup.");
    }
  }

  function handleExportPedidosCsv() {
    const rows = pedidos.map((pedido) => ({
      fecha: pedido.fechaStr,
      cliente: pedido.nombreCliente,
      telefono: pedido.telefono,
      direccion: pedido.direccion,
      pedido: pedido.pedidoTexto,
      vendedor: pedido.vendedorNombre,
      estado: pedido.estado,
      metodoPago: pedido.metodoPago,
      subtotalProductos: pedido.subtotalProductos || pedido.totalVentaProductos || 0,
      envioCobrado: pedido.envioCobrado || 0,
      totalCliente: pedido.totalCliente,
      totalCosto: pedido.totalCosto,
      totalComision: pedido.totalComision,
      totalGanancia: pedido.totalGanancia,
    }));

    downloadCsv(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      { key: "fecha", label: "Fecha" },
      { key: "cliente", label: "Cliente" },
      { key: "telefono", label: "Telefono" },
      { key: "direccion", label: "Direccion" },
      { key: "pedido", label: "Pedido" },
      { key: "vendedor", label: "Vendedor" },
      { key: "estado", label: "Estado" },
      { key: "metodoPago", label: "Metodo pago" },
      { key: "subtotalProductos", label: "Subtotal productos" },
      { key: "envioCobrado", label: "Envio cobrado" },
      { key: "totalCliente", label: "Total cliente" },
      { key: "totalCosto", label: "Total costo" },
      { key: "totalComision", label: "Total comision" },
      { key: "totalGanancia", label: "Total ganancia" },
    ]);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm("Esto importará documentos del backup y actualizará coincidencias por ID. ¿Continuar?");
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const json = await readJsonFile(file);
      const counts = await importBackupData(json);
      await onRefresh();
      setSuccess(`Backup importado. Productos: ${counts.productos}, pedidos: ${counts.pedidos}, clientes: ${counts.clientes}, vendedores: ${counts.vendedores}, caja: ${counts.cajaMovimientos || 0}, stock: ${counts.stockMovimientos || 0}, liquidaciones: ${counts.comisionesLiquidaciones || 0}, auditoría: ${counts.auditoria || 0}.`);
    } catch (error) {
      setError(error.message || "No se pudo importar el backup.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Backups</p><h2>Exportar e importar datos</h2></div></div>
        <p className="muted">El backup descarga un JSON con productos, pedidos, clientes, vendedores, caja, stock, liquidaciones de comisiones y auditoría. Guardalo fuera de la computadora, por ejemplo en Drive.</p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={handleExport}>Descargar backup JSON</button>
          <button type="button" className="btn btn-secondary" onClick={handleExportPedidosCsv}>Descargar pedidos CSV</button>
          <label className="btn btn-secondary file-button">
            {importing ? "Importando..." : "Importar backup JSON"}
            <input type="file" accept="application/json,.json" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h3>Qué queda incluido</h3>
        <ul className="info-list">
          <li>Productos y costos.</li>
          <li>Pedidos con detalle, totales, costos, comisiones y ganancias.</li>
          <li>Clientes generados por teléfono.</li>
          <li>Vendedores.</li>
          <li>Caja diaria y movimientos manuales.</li>
          <li>Stock y movimientos.</li>
          <li>Liquidaciones de comisiones.</li>
          <li>Auditoría de cambios.</li>
        </ul>
      </section>
    </div>
  );
}
