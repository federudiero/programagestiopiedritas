import { normalizeText } from "./orderParser";

export const DEFAULT_ZONAS = [
  {
    id: "cordoba-capital",
    nombre: "Córdoba Capital",
    tipo: "ciudad",
    centro: { lat: -31.4167, lng: -64.1833 },
    envioReferencia: 0,
    aliases: [
      "cordoba", "cordoba capital", "capital", "nueva cordoba", "centro", "alto alberdi", "alberdi",
      "alta cordoba", "villa cabrera", "cerro de las rosas", "arguello", "los boulevares", "san salvador",
      "marques de sobremonte", "poeta lugones", "nuevo poeta lugones", "bajo palermo", "general paz",
      "cofico", "jardin", "barrio jardin", "crisol", "crisol sur", "mosconi", "villa allende parque"
    ],
  },
  {
    id: "docta",
    nombre: "Docta Urbanización",
    tipo: "zona",
    centro: { lat: -31.4742, lng: -64.3068 },
    envioReferencia: 0,
    aliases: ["docta", "docta urbanizacion", "urbanizacion docta", "mza", "mz", "lote"],
  },
  {
    id: "manantiales",
    nombre: "Manantiales",
    tipo: "zona",
    centro: { lat: -31.4799, lng: -64.2476 },
    envioReferencia: 0,
    aliases: ["manantiales", "altos de manantiales", "siete soles", "7 soles"],
  },
  {
    id: "villa-allende",
    nombre: "Villa Allende",
    tipo: "ciudad",
    centro: { lat: -31.2946, lng: -64.2954 },
    envioReferencia: 0,
    aliases: ["villa allende"],
  },
  {
    id: "mendiolaza",
    nombre: "Mendiolaza",
    tipo: "ciudad",
    centro: { lat: -31.2674, lng: -64.3009 },
    envioReferencia: 0,
    aliases: ["mendiolaza"],
  },
  {
    id: "unquillo",
    nombre: "Unquillo",
    tipo: "ciudad",
    centro: { lat: -31.2307, lng: -64.3168 },
    envioReferencia: 0,
    aliases: ["unquillo"],
  },
  {
    id: "rio-ceballos",
    nombre: "Río Ceballos",
    tipo: "ciudad",
    centro: { lat: -31.1649, lng: -64.3227 },
    envioReferencia: 0,
    aliases: ["rio ceballos", "río ceballos"],
  },
  {
    id: "carlos-paz",
    nombre: "Villa Carlos Paz",
    tipo: "ciudad",
    centro: { lat: -31.4241, lng: -64.4978 },
    envioReferencia: 0,
    aliases: ["carlos paz", "villa carlos paz"],
  },
  {
    id: "alta-gracia",
    nombre: "Alta Gracia",
    tipo: "ciudad",
    centro: { lat: -31.6541, lng: -64.4283 },
    envioReferencia: 0,
    aliases: ["alta gracia"],
  },
  {
    id: "malagueno",
    nombre: "Malagueño",
    tipo: "ciudad",
    centro: { lat: -31.4647, lng: -64.3596 },
    envioReferencia: 0,
    aliases: ["malagueno", "malagueño"],
  },
  {
    id: "monte-cristo",
    nombre: "Monte Cristo",
    tipo: "ciudad",
    centro: { lat: -31.3437, lng: -63.9443 },
    envioReferencia: 0,
    aliases: ["monte cristo"],
  },
  {
    id: "rio-segundo",
    nombre: "Río Segundo / Pilar",
    tipo: "ciudad",
    centro: { lat: -31.6525, lng: -63.9097 },
    envioReferencia: 0,
    aliases: ["rio segundo", "río segundo", "pilar"],
  },
  {
    id: "oncativo",
    nombre: "Oncativo",
    tipo: "ciudad",
    centro: { lat: -31.9147, lng: -63.6824 },
    envioReferencia: 0,
    aliases: ["oncativo"],
  },
  {
    id: "oliva",
    nombre: "Oliva",
    tipo: "ciudad",
    centro: { lat: -32.0419, lng: -63.5693 },
    envioReferencia: 0,
    aliases: ["oliva"],
  },
  {
    id: "villa-maria",
    nombre: "Villa María / Villa Nueva",
    tipo: "ciudad",
    centro: { lat: -32.4075, lng: -63.2402 },
    envioReferencia: 0,
    aliases: ["villa maria", "villa maría", "villa nueva"],
  },
];

export function normalizeAddress(value) {
  return normalizeText(value || "");
}

export function detectZonaFromText(text, zonas = DEFAULT_ZONAS) {
  const normalized = normalizeAddress(text);
  if (!normalized) return null;

  let best = null;
  for (const zona of zonas) {
    const aliases = Array.isArray(zona.aliases) ? zona.aliases : [];
    for (const alias of aliases) {
      const cleanAlias = normalizeAddress(alias);
      if (!cleanAlias) continue;
      if (normalized.includes(cleanAlias)) {
        const score = cleanAlias.length;
        if (!best || score > best.score) {
          best = { ...zona, score, aliasDetectado: alias };
        }
      }
    }
  }

  if (!best && normalized.includes("https://maps")) {
    return {
      id: "link-maps",
      nombre: "Link de ubicación",
      tipo: "link",
      centro: null,
      envioReferencia: 0,
      aliasDetectado: "link",
      score: 1,
    };
  }

  return best;
}

export function buildOsmSearchUrl(address) {
  const query = String(address || "").trim();
  if (!query) return "";
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export function buildOsmDirectionsUrl(address) {
  const query = String(address || "").trim();
  if (!query) return "";
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${encodeURIComponent(query)}`;
}

export function buildExternalMapUrl(address) {
  const value = String(address || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  return buildOsmSearchUrl(`${value}, Córdoba, Argentina`);
}
