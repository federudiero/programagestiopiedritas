import {
  buildOrderItem,
  normalizePhone,
  summarizeItems,
  toNumber,
  todayStr,
} from "./pricingCalculator";

const DAY_RE = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hoy|ma[ñn]ana)\b/i;
const PRODUCT_RE = /\b(bolsa|bolsas|barral|barrales|piedra|piedras|arena|tierra|triturado|compost|blanca|blancas|gris|grises|base|0\s*-\s*20|10\s*-\s*30|30\s*-\s*50|4\s*-\s*6|6\s*-\s*19)\b/i;
const VENDOR_RE = /\bvendedor(?:a|\/a)?\b/i;
const EXPLICIT_SEPARATOR_RE = /^\s*=+\s*pedido\s*=+\s*$/gim;
const PHONE_RE = /(\+?\s*54\s*9?[^\n]{6,28}|\b(?:351|353|354|357|358|11|341|342|343|344|345|346|347|348|349)\d{6,9}\b)/i;
const MONEY_RE = /\$\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/g;

function clean(value) {
  return String(value || "")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[‑–—]/g, "-")
    .replace(/[\t ]+/g, " ")
    .trim();
}

function cleanMoney(value) {
  return toNumber(String(value || "").replace(/[^0-9.,]/g, ""));
}

export function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bmetros?\b/g, "m")
    .replace(/,/g, ".")
    .replace(/[^a-z0-9.+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWhatsappPrefix(line) {
  return clean(String(line || "").replace(/^\[[^\]]+\]\s*[^:]{1,40}:\s*/i, ""));
}

function getLines(rawText) {
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map(stripWhatsappPrefix)
    .map(clean)
    .filter(Boolean);
}

function hasPhone(line) {
  if (/^\[[^\]]+\]/.test(line)) return false;
  const normalized = normalizePhone(line);
  return PHONE_RE.test(line) && normalized.length >= 10 && normalized.length <= 15;
}

function isDeliveryLine(line) {
  return DAY_RE.test(line) || /\b(retira|retiro|entrega|llevar)\b/i.test(line);
}

function isAddressLine(line) {
  return /(?:📌\s*)?direcci[oó]n\s*:?/i.test(line) || /maps\.app\.goo\.gl|google\.com\/maps|\b(mza|mz|lote|barrio|calle|avenida|av\.|altura|casa|dpto|departamento)\b/i.test(line);
}

function isNameLine(line) {
  if (!line || line.length > 45) return false;
  if (hasPhone(line) || isDeliveryLine(line) || isAddressLine(line) || PRODUCT_RE.test(line) || VENDOR_RE.test(line)) return false;
  if (/\$|=|total|env[ií]o|transferencia|abonar|abona|puerta|entrada|cementerio|roja|lote|mza/i.test(line)) return false;
  return /^[a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){0,3}$/i.test(line);
}

function removeLabel(line, labelRegex) {
  return clean(String(line || "").replace(labelRegex, ""));
}

function extractLine(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

function extractMoney(text) {
  const totalMatch = text.match(/(?:total|importe|monto)\s*[:=]?\s*\$?\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/i);
  if (totalMatch?.[1]) return cleanMoney(totalMatch[1]);

  const eqMatch = text.match(/[=]\s*\$?\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/i);
  if (eqMatch?.[1]) return cleanMoney(eqMatch[1]);

  const moneyMatches = [...text.matchAll(MONEY_RE)];
  if (!moneyMatches.length) return 0;

  const last = moneyMatches[moneyMatches.length - 1]?.[1];
  return cleanMoney(last);
}

function extractDeliveryFromLines(lines) {
  const labeled = lines.find((line) => /(?:🚚\s*)?entrega\s*:?/i.test(line));
  if (labeled) return removeLabel(labeled, /^(?:🚚\s*)?entrega\s*:?\s*/i);

  const deliveryLine = lines.find((line) => isDeliveryLine(line));
  return deliveryLine || "";
}

function extractPedidoFromLines(lines, text) {
  const labeledIndex = lines.findIndex((line) => /(?:📝\s*)?(?:pedido|detalle|producto|productos)\s*:?/i.test(line));

  if (labeledIndex >= 0) {
    const first = removeLabel(lines[labeledIndex], /^(?:📝\s*)?(?:pedido|detalle|producto|productos)\s*:?\s*/i);
    const pedidoLines = [];
    if (first) pedidoLines.push(first);

    for (let i = labeledIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (
        /^(?:💰\s*)?total\b/i.test(line) ||
        /^(?:🚚\s*)?entrega\b/i.test(line) ||
        /^(?:💳\s*)?pago\b/i.test(line) ||
        /^(?:👩‍💼\s*)?vendedor(?:a|\/a)?\b/i.test(line) ||
        /^(?:🗒\s*)?observaciones\b/i.test(line) ||
        /^abonar|^abona|transferencia/i.test(line) ||
        isDeliveryLine(line)
      ) {
        break;
      }

      if (/^\$?\s*[0-9][0-9.]*(?:,[0-9]{1,2})?\s*$/i.test(line)) continue;
      if (PRODUCT_RE.test(line) || /env[ií]o|gratis/i.test(line)) pedidoLines.push(line);
    }

    return clean(pedidoLines.join(" | "));
  }

  const productLines = lines.filter((line) => {
    if (/nombre|direcci[oó]n|tel[eé]fono|vendedor|vendedora|fecha|barrio|entre calles/i.test(line)) return false;
    return PRODUCT_RE.test(line) || /\d+\s+(blancas|gris|grises)/i.test(line);
  });

  if (productLines.length) return clean(productLines.join(" | "));

  const fallback = text.match(/([0-9]+\s+[^\n]*(?:bolsa|barral|piedra|arena|tierra|triturado|blanca|gris)[^\n]*)/i);
  return clean(fallback?.[1] || "");
}

function extractAddressFromLines(lines, text) {
  const labeledIndex = lines.findIndex((line) => /(?:📌\s*)?direcci[oó]n\s*:?/i.test(line));

  if (labeledIndex >= 0) {
    const first = removeLabel(lines[labeledIndex], /^(?:📌\s*)?direcci[oó]n\s*:?\s*/i);
    const addressLines = [];
    if (first) addressLines.push(first);

    for (let i = labeledIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (
        /tel[eé]fono|pedido|vendedor|vendedora|total|entrega|pago|observaciones/i.test(line) ||
        hasPhone(line) ||
        PRODUCT_RE.test(line) ||
        /^total\b/i.test(line) ||
        isDeliveryLine(line)
      ) {
        break;
      }
      addressLines.push(line);
    }

    return clean(addressLines.join(" "));
  }

  const mapLine = lines.find((line) => /maps\.app\.goo\.gl|google\.com\/maps/i.test(line));
  if (mapLine) return mapLine;

  const phoneIndex = lines.findIndex((line) => hasPhone(line));
  if (phoneIndex >= 0) {
    const addressLines = [];
    for (let i = phoneIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (PRODUCT_RE.test(line) || VENDOR_RE.test(line) || /^total\b/i.test(line) || isDeliveryLine(line) || hasPhone(line)) break;
      addressLines.push(line);
    }
    if (addressLines.length) return clean(addressLines.join(" "));
  }

  return extractLine(text, [/domicilio\s*:?\s*([^\n]+)/i, /ubicaci[oó]n\s*:?\s*([^\n]+)/i]);
}

function extractNameFromLines(lines) {
  const labeledIndex = lines.findIndex((line) => /(?:👤\s*)?nombre\s*:?/i.test(line) || /^cliente\s*:?/i.test(line));

  if (labeledIndex >= 0) {
    return removeLabel(lines[labeledIndex], /^(?:👤\s*)?(?:nombre|cliente)\s*:?\s*/i);
  }

  const deliveryIndex = lines.findIndex((line) => isDeliveryLine(line));
  if (deliveryIndex >= 0) {
    const afterDelivery = lines.slice(deliveryIndex + 1).find((line) => isNameLine(line));
    if (afterDelivery) return afterDelivery;
  }

  return lines.find((line) => isNameLine(line)) || "";
}

function extractPhoneFromLines(lines) {
  const labeledIndex = lines.findIndex((line) => /(?:📱\s*)?tel[eé]fono(?:\s+de\s+contacto)?\s*:?/i.test(line) || /^celular\s*:?/i.test(line) || /^whatsapp\s*:?/i.test(line));

  if (labeledIndex >= 0) {
    return removeLabel(lines[labeledIndex], /^(?:📱\s*)?(?:tel[eé]fono(?:\s+de\s+contacto)?|celular|whatsapp)\s*:?\s*/i);
  }

  const phoneLine = lines.find((line) => hasPhone(line));
  return phoneLine || "";
}

function extractSellerFromLines(lines) {
  const labeledIndex = lines.findIndex((line) => /vendedor(?:a|\/a)?\s*:?/i.test(line) || /^vende\s*:?/i.test(line));

  if (labeledIndex >= 0) {
    return removeLabel(lines[labeledIndex], /^(?:👩‍💼\s*)?(?:vendedor(?:a|\/a)?|vende)\s*:?\s*/i);
  }

  return "";
}

function extractPaymentFromLines(lines) {
  const labeled = lines.find((line) => /(?:💳\s*)?pago\s*:?/i.test(line));
  const pago = labeled ? removeLabel(labeled, /^(?:💳\s*)?pago\s*:?\s*/i) : "";
  if (/transferencia/i.test(pago)) return "transferencia";
  if (/efectivo/i.test(pago)) return "efectivo";
  if (/tarjeta/i.test(pago)) return "tarjeta";
  if (pago) return pago;

  const text = lines.join("\n");
  if (/transferencia/i.test(text)) return "transferencia";
  if (/efectivo/i.test(text)) return "efectivo";
  return "pendiente";
}

function makeObservaciones(lines, parsed) {
  const ignoredPieces = [
    parsed.nombreCliente,
    parsed.direccion,
    parsed.telefono,
    parsed.pedidoTexto,
    parsed.vendedorNombre,
    parsed.fechaEntrega,
  ]
    .filter(Boolean)
    .map((value) => clean(value).toLowerCase());

  return lines
    .filter((line) => {
      const normalized = clean(line).toLowerCase();
      if (!normalized) return false;
      if (/nombre|direcci[oó]n|tel[eé]fono|pedido|vendedor|vendedora|total|entrega|pago/i.test(line)) return false;
      return !ignoredPieces.some((piece) => piece && (piece.includes(normalized) || normalized.includes(piece)));
    })
    .join(" | ");
}

function blockLooksComplete(lines) {
  const text = lines.join("\n");
  const hasContact = lines.some((line) => hasPhone(line)) || /tel[eé]fono/i.test(text);
  const hasProduct = lines.some((line) => PRODUCT_RE.test(line)) || /pedido/i.test(text);
  const hasMoney = /\$|total\b|=\s*[0-9]/i.test(text);
  const hasAddress = lines.some((line) => isAddressLine(line));
  return (hasProduct && (hasMoney || hasContact || hasAddress)) || (hasContact && hasAddress && hasMoney);
}

function shouldStartNewBlock(line, currentLines, nextLine = "") {
  if (!currentLines.length) return false;
  const complete = blockLooksComplete(currentLines);
  if (!complete) return false;

  if (/(?:👤\s*)?nombre\s*:?/i.test(line)) return true;
  if (/(?:📌\s*)?direcci[oó]n\s*:?/i.test(line)) return true;

  if (isDeliveryLine(line) && (isNameLine(nextLine) || hasPhone(nextLine))) return true;
  if (isNameLine(line) && (hasPhone(nextLine) || isAddressLine(nextLine))) return true;

  return false;
}

function splitByExplicitSeparator(rawText) {
  const text = String(rawText || "").replace(/\r/g, "\n");
  EXPLICIT_SEPARATOR_RE.lastIndex = 0;
  if (!EXPLICIT_SEPARATOR_RE.test(text)) return null;

  EXPLICIT_SEPARATOR_RE.lastIndex = 0;

  return text
    .split(EXPLICIT_SEPARATOR_RE)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function splitPedidosText(rawText) {
  const explicitBlocks = splitByExplicitSeparator(rawText);

  if (explicitBlocks) {
    return explicitBlocks.filter((block) => /nombre|tel[eé]fono|direcci[oó]n|pedido|total|\$/i.test(block));
  }

  const lines = getLines(rawText);
  const blocks = [];
  let current = [];

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1] || "";

    if (shouldStartNewBlock(line, current, nextLine)) {
      blocks.push(current.join("\n"));
      current = [line];
      return;
    }

    current.push(line);

    if (VENDOR_RE.test(line) && blockLooksComplete(current)) {
      blocks.push(current.join("\n"));
      current = [];
    }
  });

  if (current.length) blocks.push(current.join("\n"));

  return blocks
    .map((block) => block.trim())
    .filter((block) => PRODUCT_RE.test(block) || /pedido|total|\$/i.test(block));
}

function getProductAliases(producto) {
  const aliases = [];
  const rawAliases = Array.isArray(producto?.aliases) ? producto.aliases : [];

  aliases.push(producto?.nombre || "");
  aliases.push(producto?.codigo || "");
  aliases.push(...rawAliases);

  const name = normalizeText(producto?.nombre || "");

  if (/piedra blanca/.test(name)) aliases.push("piedra blanca", "piedras blancas", "blanca", "blancas", "bolsas blancas");
  if (/gris claro/.test(name)) aliases.push("piedra gris claro", "piedras gris claro", "gris claro", "grises claras");
  if (/gris oscuro/.test(name)) aliases.push("piedra gris oscuro", "piedras gris oscuro", "gris oscuro", "grises oscuras");
  if (/arena gruesa/.test(name)) aliases.push("arena gruesa", "arena comun", "arena común", "gruesa");
  if (/arena fina/.test(name)) aliases.push("arena fina", "fina parana", "fina paraná", "arena fina parana", "arena fina paraná", "parana", "paraná");
  if (/tierra/.test(name)) aliases.push("tierra", "tierra negra");
  if (/compost/.test(name)) aliases.push("compost");
  if (/0\s*-\s*20|base/.test(name)) aliases.push("0-20", "0 20", "base", "base 0-20");
  if (/4\s*-\s*6/.test(name)) aliases.push("triturado 4-6", "4-6", "4 6");
  if (/10\s*-\s*30/.test(name)) aliases.push("triturado 10-30", "10-30", "10 30");
  if (/30\s*-\s*50/.test(name)) aliases.push("triturado 30-50", "30-50", "30 50");

  return [...new Set(aliases.map(normalizeText).filter(Boolean))].sort((a, b) => b.length - a.length);
}

function parseDecimal(value) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBarralSpecs(value) {
  const text = normalizeText(value);
  const mmMatch = text.match(/(?:^|\D)(22|32|34)\s*mm\b/);
  const mm = mmMatch ? Number(mmMatch[1]) : null;
  const lengthMatches = [...text.matchAll(/(?:^|\D)(1[.,.]?\d{1,2}|2[.,.]?\d{0,2})(?:\s*m\b|\s|$)/g)]
    .map((match) => parseDecimal(match[1]))
    .filter((number) => number !== null && number >= 1 && number <= 2.5);
  const length = lengthMatches.length ? lengthMatches[0] : null;
  return { mm, length };
}

function closeNumber(a, b) {
  if (a === null || b === null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.011;
}

function scoreProduct(producto, line) {
  const lineNorm = normalizeText(line);
  const productName = normalizeText(producto?.nombre || "");
  let score = 0;

  for (const alias of getProductAliases(producto)) {
    if (alias.length < 2) continue;
    if (lineNorm.includes(alias)) score = Math.max(score, 100 + alias.length);
  }

  if (/barral/.test(lineNorm) && /barral/.test(productName)) {
    const lineSpecs = extractBarralSpecs(line);
    const productSpecs = extractBarralSpecs(producto.nombre);

    if (lineSpecs.mm && productSpecs.mm && lineSpecs.mm === productSpecs.mm) score += 160;
    if (lineSpecs.length && productSpecs.length && closeNumber(lineSpecs.length, productSpecs.length)) score += 220;
    if (lineSpecs.mm && productSpecs.mm && lineSpecs.mm !== productSpecs.mm) score -= 250;
    if (lineSpecs.length && productSpecs.length && !closeNumber(lineSpecs.length, productSpecs.length)) score -= 250;
  }

  return score;
}

function findBestProduct(line, productos = []) {
  const candidates = productos
    .filter((producto) => producto?.activo !== false)
    .map((producto) => ({ producto, score: scoreProduct(producto, line) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) return { producto: null, confianza: 0, ambiguo: false };

  const best = candidates[0];
  const second = candidates[1];
  const ambiguo = Boolean(second && second.score >= best.score - 15);

  if (best.score < 80 || ambiguo) {
    return { producto: best.producto, confianza: best.score, ambiguo };
  }

  return { producto: best.producto, confianza: best.score, ambiguo: false };
}

function extractCantidad(line) {
  const direct = line.match(/(?:^|\D)(\d{1,4})\s*(?:bolsas?|barrales?|piedras?|unidades?|u\b|blancas?|grises?|arena|tierra|triturado|base|compost)/i);
  if (direct?.[1]) return Math.max(1, Math.trunc(toNumber(direct[1])));

  const start = line.match(/^\s*(\d{1,4})\b/);
  if (start?.[1]) return Math.max(1, Math.trunc(toNumber(start[1])));

  return 1;
}

function extractItemSubtotal(line) {
  if (/total/i.test(line)) return 0;
  if (/\+\s*env[ií]o\s*=/i.test(line)) return 0;
  if (/env[ií]o\s*incluido/i.test(line) && /=/.test(line)) return 0;

  const beforeEnvio = line.split(/\+\s*env[ií]o|env[ií]o/i)[0] || line;
  const matches = [...beforeEnvio.matchAll(MONEY_RE)];
  if (!matches.length) return 0;

  return cleanMoney(matches[0][1]);
}

function splitProductLines(pedidoTexto) {
  return String(pedidoTexto || "")
    .replace(/\r/g, "\n")
    .split(/\n|\|/)
    .map((line) => clean(line.replace(/^[-•]\s*/, "")))
    .filter(Boolean)
    .filter((line) => PRODUCT_RE.test(line) || /\d+\s+(blancas|grises|fina|gruesa)/i.test(line));
}

function detectOrderItems(pedidoTexto, productos = []) {
  const lines = splitProductLines(pedidoTexto);
  const items = [];
  const motivosRevision = [];
  const lineasNoIdentificadas = [];

  for (const line of lines) {
    if (/env[ií]o\s+gratis/i.test(line) && !PRODUCT_RE.test(line.replace(/env[ií]o\s+gratis/i, ""))) continue;

    const cantidad = extractCantidad(line);
    const match = findBestProduct(line, productos);

    if (!match.producto || match.ambiguo) {
      lineasNoIdentificadas.push(line);
      motivosRevision.push(match.ambiguo ? `Producto ambiguo: ${line}` : `Producto no identificado: ${line}`);
      continue;
    }

    const itemSubtotal = extractItemSubtotal(line);
    const precioManualUnitario = itemSubtotal > 0 && cantidad > 0 ? itemSubtotal / cantidad : "";
    const item = buildOrderItem(match.producto, cantidad, false, precioManualUnitario);

    if (!item) {
      lineasNoIdentificadas.push(line);
      motivosRevision.push(`No se pudo calcular el producto: ${line}`);
      continue;
    }

    items.push({
      ...item,
      textoOriginal: line,
      productoDetectadoPor: match.confianza >= 180 ? "alias/especificación" : "alias",
      subtotalTexto: itemSubtotal || null,
    });
  }

  return { items, motivosRevision, lineasNoIdentificadas };
}

function detectEnvio({ text, totalCliente, subtotalProductos, items }) {
  const textClean = clean(text);
  const hasItems = items.length > 0;

  if (/retira|retiro|env[ií]o\s+gratis|env[ií]o\s+sin\s+cargo/i.test(textClean)) {
    return { envioCobrado: 0, envioTexto: "0", detectadoPor: /retira|retiro/i.test(textClean) ? "retiro" : "envio_gratis" };
  }

  const explicitPatterns = [
    // Ejemplo: "+ envío $7500". No toma "+ envío = $60000" porque eso suele ser total final.
    /\+\s*env[ií]o\s+\$\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/i,
    // Ejemplo: "envío $7500" o "envío incluido $7500".
    /env[ií]o\s*(?:incluido|a\s+domicilio)?\s+\$\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/i,
    // Ejemplo: "envío: 7500".
    /env[ií]o\s*(?:incluido|a\s+domicilio)?\s*:\s*([0-9][0-9.]*(?:,[0-9]{1,2})?)/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = textClean.match(pattern);
    if (match?.[1]) {
      const envio = cleanMoney(match[1]);
      return { envioCobrado: envio, envioTexto: formatPlainMoney(envio), detectadoPor: "explicito" };
    }
  }

  const mentionsShipping = /env[ií]o|envi[oó]|llevar|domicilio/i.test(textClean);
  if (hasItems && mentionsShipping && totalCliente > subtotalProductos) {
    const envio = totalCliente - subtotalProductos;
    return { envioCobrado: envio, envioTexto: formatPlainMoney(envio), detectadoPor: "diferencia_total_menos_productos" };
  }

  return { envioCobrado: 0, envioTexto: "", detectadoPor: "sin_envio_detectado" };
}

function formatPlainMoney(value) {
  return Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function parsePedidoText(rawText, productos = []) {
  const lines = getLines(rawText).filter((line) => !/^=+\s*pedido\s*=+$/i.test(line));
  const text = lines.join("\n");
  const pedidoTexto = extractPedidoFromLines(lines, text);
  const totalManual = extractMoney(text);
  const deteccionItems = detectOrderItems(pedidoTexto, productos);
  const resumenItems = summarizeItems(deteccionItems.items);
  const envio = detectEnvio({
    text,
    totalCliente: totalManual,
    subtotalProductos: resumenItems.totalCliente,
    items: deteccionItems.items,
  });

  const motivosRevision = [...deteccionItems.motivosRevision];
  if (pedidoTexto && productos.length && deteccionItems.items.length === 0) {
    motivosRevision.push("No se detectaron ítems calculables en el detalle del pedido.");
  }
  if (totalManual > 0 && deteccionItems.items.length && totalManual < resumenItems.totalCliente) {
    motivosRevision.push("El total detectado es menor que el subtotal de productos.");
  }

  const base = {
    nombreCliente: extractNameFromLines(lines, text),
    direccion: extractAddressFromLines(lines, text),
    telefono: extractPhoneFromLines(lines, text),
    vendedorNombre: extractSellerFromLines(lines, text),
    pedidoTexto,
    totalManual: totalManual || (deteccionItems.items.length ? resumenItems.totalCliente + envio.envioCobrado : 0),
    subtotalProductos: resumenItems.totalCliente,
    envioCobrado: envio.envioCobrado,
    envioTexto: envio.envioTexto,
    envioDetectadoPor: envio.detectadoPor,
    fechaEntrega: extractDeliveryFromLines(lines),
    rawText: String(rawText || "").trim(),
    fechaStr: todayStr(),
    estado: "pendiente",
    metodoPago: extractPaymentFromLines(lines),
    items: deteccionItems.items,
    lineasNoIdentificadas: deteccionItems.lineasNoIdentificadas,
    motivosRevision,
    requiereRevision: motivosRevision.length > 0,
  };

  base.telefonoNormalized = normalizePhone(base.telefono);
  base.observaciones = makeObservaciones(lines, base);

  return base;
}

export function parsePedidosText(rawText, productos = []) {
  return splitPedidosText(rawText).map((block, index) => ({
    tempId: `preview-${Date.now()}-${index}`,
    ...parsePedidoText(block, productos),
  }));
}
