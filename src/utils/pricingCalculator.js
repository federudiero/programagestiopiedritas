export function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/\s/g, "").replace(/\$/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function formatPercent(decimal) {
  return `${(Number(decimal || 0) * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizePrecios(precios = []) {
  return [...precios]
    .map((precio) => ({
      desde: Math.max(1, Math.trunc(toNumber(precio.desde))),
      precioUnitario: toNumber(precio.precioUnitario),
    }))
    .filter((precio) => precio.desde > 0 && precio.precioUnitario >= 0)
    .sort((a, b) => a.desde - b.desde);
}

export function getTramoPrecio(producto, cantidad) {
  const cantidadNum = Math.max(0, Math.trunc(toNumber(cantidad)));
  const precios = normalizePrecios(producto?.precios || []);

  if (!precios.length || cantidadNum <= 0) return null;

  return [...precios]
    .sort((a, b) => b.desde - a.desde)
    .find((precio) => cantidadNum >= precio.desde) || precios[0];
}

export function getPrecioListaUnitario(producto, cantidad, precioManualUnitario = "") {
  if (precioManualUnitario !== null && precioManualUnitario !== undefined && precioManualUnitario !== "") {
    return toNumber(precioManualUnitario);
  }

  const tramo = getTramoPrecio(producto, cantidad);
  return tramo?.precioUnitario || 0;
}

export function calcularDescuentoUnitario(producto, precioListaUnitario, pagoEfectivo) {
  const aplica = Boolean(producto?.descuentoEfectivo?.aplica);
  const porcentaje = toNumber(producto?.descuentoEfectivo?.porcentaje);

  if (!pagoEfectivo || !aplica || porcentaje <= 0) return 0;
  return precioListaUnitario * (porcentaje / 100);
}

export function calcularComisionUnitaria(producto, precioClienteUnitario) {
  const tipo = producto?.comision?.tipo || "sin_comision";
  const valor = toNumber(producto?.comision?.valor);

  if (tipo === "porcentaje") return precioClienteUnitario * (valor / 100);
  if (tipo === "fija") return valor;
  return 0;
}

export function calcularPrecioObjetivo(producto, porcentajeGanancia) {
  const costoMaterial = toNumber(producto?.costoMaterialUnitario);
  const gananciaDecimal = toNumber(porcentajeGanancia) / 100;
  const tipoComision = producto?.comision?.tipo || "sin_comision";
  const valorComision = toNumber(producto?.comision?.valor);

  if (gananciaDecimal < 0) return null;

  if (tipoComision === "porcentaje") {
    const comisionDecimal = valorComision / 100;
    const divisor = 1 - comisionDecimal * (1 + gananciaDecimal);
    if (divisor <= 0) return null;
    return (costoMaterial * (1 + gananciaDecimal)) / divisor;
  }

  const comisionFija = tipoComision === "fija" ? valorComision : 0;
  const costoTotalUnitario = costoMaterial + comisionFija;
  return costoTotalUnitario * (1 + gananciaDecimal);
}

export function calcularVenta({
  producto,
  cantidad,
  pagoEfectivo = false,
  precioManualUnitario = "",
  gananciaObjetivoPorcentaje = 100,
}) {
  const cantidadNum = Math.max(0, Math.trunc(toNumber(cantidad)));

  if (!producto || cantidadNum <= 0) return null;

  const precioListaUnitario = getPrecioListaUnitario(producto, cantidadNum, precioManualUnitario);
  const descuentoUnitario = calcularDescuentoUnitario(producto, precioListaUnitario, pagoEfectivo);
  const precioClienteUnitario = Math.max(0, precioListaUnitario - descuentoUnitario);
  const costoMaterialUnitario = toNumber(producto.costoMaterialUnitario);
  const comisionUnitaria = calcularComisionUnitaria(producto, precioClienteUnitario);
  const costoTotalUnitario = costoMaterialUnitario + comisionUnitaria;
  const ventaTotal = precioClienteUnitario * cantidadNum;
  const costoMaterialTotal = costoMaterialUnitario * cantidadNum;
  const comisionTotal = comisionUnitaria * cantidadNum;
  const costoTotal = costoTotalUnitario * cantidadNum;
  const gananciaUnitaria = precioClienteUnitario - costoTotalUnitario;
  const gananciaTotal = gananciaUnitaria * cantidadNum;
  const margenSobreCosto = costoTotalUnitario > 0 ? gananciaUnitaria / costoTotalUnitario : 0;

  const precioObjetivo100 = calcularPrecioObjetivo(producto, 100);
  const precioObjetivo150 = calcularPrecioObjetivo(producto, 150);
  const precioObjetivoPersonalizado = calcularPrecioObjetivo(producto, gananciaObjetivoPorcentaje);

  return {
    cantidad: cantidadNum,
    precioListaUnitario,
    descuentoUnitario,
    precioClienteUnitario,
    ventaTotal,
    costoMaterialUnitario,
    costoMaterialTotal,
    comisionUnitaria,
    comisionTotal,
    costoTotalUnitario,
    costoTotal,
    gananciaUnitaria,
    gananciaTotal,
    margenSobreCosto,
    precioObjetivo100,
    precioObjetivo150,
    precioObjetivoPersonalizado,
  };
}

export function buildOrderItem(producto, cantidad, pagoEfectivo = false, precioManualUnitario = "") {
  const calculo = calcularVenta({ producto, cantidad, pagoEfectivo, precioManualUnitario });
  if (!calculo) return null;

  return {
    productoId: producto.id || "",
    codigo: producto.codigo || "",
    nombre: producto.nombre || "Producto",
    familia: producto.familia || "General",
    unidad: producto.unidad || "unidad",
    cantidad: calculo.cantidad,
    pagoEfectivo: Boolean(pagoEfectivo),
    precioManualUnitario: precioManualUnitario === "" ? null : toNumber(precioManualUnitario),
    precioClienteUnitario: calculo.precioClienteUnitario,
    ventaTotal: calculo.ventaTotal,
    costoMaterialUnitario: calculo.costoMaterialUnitario,
    costoMaterialTotal: calculo.costoMaterialTotal,
    comisionUnitaria: calculo.comisionUnitaria,
    comisionTotal: calculo.comisionTotal,
    costoTotalUnitario: calculo.costoTotalUnitario,
    costoTotal: calculo.costoTotal,
    gananciaUnitaria: calculo.gananciaUnitaria,
    gananciaTotal: calculo.gananciaTotal,
    margenSobreCosto: calculo.margenSobreCosto,
  };
}

export function summarizeItems(items = []) {
  return items.reduce(
    (acc, item) => {
      acc.totalCliente += toNumber(item.ventaTotal);
      acc.totalCostoMaterial += toNumber(item.costoMaterialTotal);
      acc.totalComision += toNumber(item.comisionTotal);
      acc.totalCosto += toNumber(item.costoTotal);
      acc.totalGanancia += toNumber(item.gananciaTotal);
      acc.cantidadItems += toNumber(item.cantidad);
      return acc;
    },
    {
      totalCliente: 0,
      totalCostoMaterial: 0,
      totalComision: 0,
      totalCosto: 0,
      totalGanancia: 0,
      cantidadItems: 0,
    }
  );
}
