import type { InventoryItem } from "../types";

/**
 * Normaliza un texto para búsquedas insensibles a mayúsculas y tildes (`foldTxt` de `raveV2`).
 */
export function foldText(value: string | number | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Calcula el precio sugerido según costo y porcentaje de recargo o margen bruto (`sugPrice` de `raveV2`).
 */
export function calculateSuggestedPrice(
  cost: number,
  mode: "recargo" | "margen",
  percent: number,
): number | null {
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(percent) || percent < 0) {
    return null;
  }
  if (mode === "margen") {
    if (percent >= 100) return null;
    return Math.round(cost / (1 - percent / 100));
  }
  return Math.round(cost * (1 + percent / 100));
}

export type ParsedInventoryQuery = {
  words: string[];
  minPrice: number | null;
  maxPrice: number | null;
  numericTokens: { raw: string; value: number | null }[];
};

function parseSearchNumber(raw: string): number {
  const clean = raw.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : -1;
}

/**
 * Analiza la consulta de búsqueda inteligente de inventario (`invQueryParse` de `raveV2`):
 * - Palabras sueltas en cualquier orden: `"cheddar doble"`
 * - Rangos de precio: `">10000"`, `"<6000"`, `"5000-15000"`, `"$12500"`
 * - Números por código, PLU o coincidencia de precio: `"12500"`, `"779"`
 */
export function parseInventoryQuery(query: string): ParsedInventoryQuery {
  const out: ParsedInventoryQuery = {
    words: [],
    minPrice: null,
    maxPrice: null,
    numericTokens: [],
  };

  const tokens = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const compMatch = token.match(/^(>=?|<=?)\$?([\d.,]+)$/);
    if (compMatch) {
      const val = parseSearchNumber(compMatch[2]);
      if (val >= 0) {
        if (compMatch[1].startsWith(">")) {
          out.minPrice = out.minPrice === null ? val : Math.max(out.minPrice, val);
        } else {
          out.maxPrice = out.maxPrice === null ? val : Math.min(out.maxPrice, val);
        }
      }
      continue;
    }

    const rangeMatch = token.match(/^\$?([\d.,]+)(?:-|\.\.)\$?([\d.,]+)$/);
    if (rangeMatch) {
      const a = parseSearchNumber(rangeMatch[1]);
      const b = parseSearchNumber(rangeMatch[2]);
      if (a >= 0 && b >= 0) {
        out.minPrice = Math.min(a, b);
        out.maxPrice = Math.max(a, b);
        continue;
      }
    }

    const exactPriceMatch = token.match(/^\$([\d.,]+)$/);
    if (exactPriceMatch) {
      const val = parseSearchNumber(exactPriceMatch[1]);
      if (val >= 0) {
        out.minPrice = val;
        out.maxPrice = val;
        continue;
      }
    }

    if (/^[\d.,]+$/.test(token)) {
      const val = parseSearchNumber(token);
      out.numericTokens.push({ raw: foldText(token), value: val >= 0 ? val : null });
      continue;
    }

    out.words.push(foldText(token));
  }

  return out;
}

/**
 * Evalúa si un artículo de inventario coincide con la búsqueda inteligente y los filtros de precio (`prodMatch` de `raveV2`).
 */
export function matchesInventoryQuery(
  item: InventoryItem,
  parsed: ParsedInventoryQuery,
  explicitMinPrice: number | null,
  explicitMaxPrice: number | null,
): boolean {
  const minPrice =
    explicitMinPrice !== null && explicitMinPrice >= 0
      ? parsed.minPrice === null
        ? explicitMinPrice
        : Math.max(parsed.minPrice, explicitMinPrice)
      : parsed.minPrice;

  const maxPrice =
    explicitMaxPrice !== null && explicitMaxPrice >= 0
      ? parsed.maxPrice === null
        ? explicitMaxPrice
        : Math.min(parsed.maxPrice, explicitMaxPrice)
      : parsed.maxPrice;

  if (minPrice !== null && item.price < minPrice - 0.001) return false;
  if (maxPrice !== null && item.price > maxPrice + 0.001) return false;

  const haystack = foldText(
    [
      item.name,
      item.description,
      item.presentation,
      item.group,
      item.barcode,
      item.plu,
      item.categoryName,
      item.badge,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (!parsed.words.every((word) => haystack.includes(word))) {
    return false;
  }

  if (parsed.numericTokens.length === 0) return true;

  const priceStr = String(Math.trunc(item.price));
  return parsed.numericTokens.every((token) => {
    if (haystack.includes(token.raw)) return true;
    if (token.value === null) return false;
    if (Math.abs(item.price - token.value) < 0.5) return true;
    const digitsOnly = /^\d+$/.test(token.raw) ? token.raw : "";
    if (!digitsOnly) return false;
    return digitsOnly.length <= priceStr.length && priceStr.startsWith(digitsOnly);
  });
}
