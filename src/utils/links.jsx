import { normalizePhone } from "./pricingCalculator";
import { buildExternalMapUrl } from "./zonificacion";

export function getWhatsappHref(phone) {
  let digits = normalizePhone(phone);
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54") && digits.length >= 9 && digits.length <= 11) {
    digits = `549${digits}`;
  }
  return `https://wa.me/${digits}`;
}

export function WhatsAppAnchor({ phone, className = "inline-link", children = "WhatsApp" }) {
  const href = getWhatsappHref(phone);
  if (!href) return <span className="muted">Sin WhatsApp</span>;
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function MapAnchor({ address, className = "inline-link", children = "Mapa" }) {
  const href = buildExternalMapUrl(address);
  if (!href) return <span className="muted">Sin mapa</span>;
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>;
}
