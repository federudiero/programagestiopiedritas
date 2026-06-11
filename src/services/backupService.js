import { COLLECTIONS } from "./paths";
import { importDocs, listDocs, saveDoc } from "./crudService";

export async function exportAllData() {
  const [productos, pedidos, clientes, vendedores, cajaMovimientos, stockMovimientos, comisionesLiquidaciones, auditoria] = await Promise.all([
    listDocs(COLLECTIONS.productos, "nombre"),
    listDocs(COLLECTIONS.pedidos, "fechaStr"),
    listDocs(COLLECTIONS.clientes, "nombre"),
    listDocs(COLLECTIONS.vendedores, "nombre"),
    listDocs(COLLECTIONS.cajaMovimientos, "fechaStr"),
    listDocs(COLLECTIONS.stockMovimientos, "fechaStr"),
    listDocs(COLLECTIONS.comisionesLiquidaciones, "fechaStr"),
    listDocs(COLLECTIONS.auditoria, "createdAtIso"),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: {
      productosCalculadora: productos,
      pedidos,
      clientes,
      vendedores,
      cajaMovimientos,
      stockMovimientos,
      comisionesLiquidaciones,
      auditoria,
    },
  };
}

export async function saveBackupRecord(metadata) {
  return saveDoc(COLLECTIONS.backups, {
    ...metadata,
    createdAtIso: new Date().toISOString(),
  });
}

export async function importBackupData(backup) {
  const collections = backup?.collections || {};

  const counts = {
    productos: 0,
    pedidos: 0,
    clientes: 0,
    vendedores: 0,
    cajaMovimientos: 0,
    stockMovimientos: 0,
    comisionesLiquidaciones: 0,
    auditoria: 0,
  };

  if (Array.isArray(collections.productosCalculadora)) {
    counts.productos = await importDocs(COLLECTIONS.productos, collections.productosCalculadora);
  }
  if (Array.isArray(collections.pedidos)) {
    counts.pedidos = await importDocs(COLLECTIONS.pedidos, collections.pedidos);
  }
  if (Array.isArray(collections.clientes)) {
    counts.clientes = await importDocs(COLLECTIONS.clientes, collections.clientes);
  }
  if (Array.isArray(collections.vendedores)) {
    counts.vendedores = await importDocs(COLLECTIONS.vendedores, collections.vendedores);
  }
  if (Array.isArray(collections.cajaMovimientos)) {
    counts.cajaMovimientos = await importDocs(COLLECTIONS.cajaMovimientos, collections.cajaMovimientos);
  }
  if (Array.isArray(collections.stockMovimientos)) {
    counts.stockMovimientos = await importDocs(COLLECTIONS.stockMovimientos, collections.stockMovimientos);
  }
  if (Array.isArray(collections.comisionesLiquidaciones)) {
    counts.comisionesLiquidaciones = await importDocs(COLLECTIONS.comisionesLiquidaciones, collections.comisionesLiquidaciones);
  }
  if (Array.isArray(collections.auditoria)) {
    counts.auditoria = await importDocs(COLLECTIONS.auditoria, collections.auditoria);
  }

  return counts;
}
