import { todayStr } from "./pricingCalculator";

export function inDateRange(fechaStr, desde = "", hasta = "") {
  const fecha = String(fechaStr || "");
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

export function getDefaultRange() {
  const today = todayStr();
  return { desde: today, hasta: today };
}
