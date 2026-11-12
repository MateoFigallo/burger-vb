/**
 * Limpia cualquier carácter no numérico de un CUIT/CUIL.
 */
export function cleanCuit(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

/**
 * Valida un CUIT/CUIL argentino de 11 dígitos mediante el algoritmo Módulo 11 de ARCA (ex AFIP),
 * idéntico a `arcaCuitOk` en Sistema VB (`raveV2`).
 */
export function isValidCuit(raw: string): boolean {
  const digits = cleanCuit(raw);
  if (digits.length !== 11) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += weights[i] * Number(digits[i]);
  }

  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 11) checkDigit = 0;
  if (checkDigit === 10) return false;

  return checkDigit === Number(digits[10]);
}

/**
 * Formatea un CUIT de 11 dígitos como `XX-XXXXXXXX-X`.
 */
export function formatCuit(raw: string): string {
  const digits = cleanCuit(raw).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
}

export type ParsedInvoiceData = {
  source: string;
  cuit: string;
  businessName: string;
  documentType: "Factura" | "Remito" | "Nota de crédito" | "Nota de débito" | "Ticket";
  letter: "" | "A" | "B" | "C" | "M";
  pointOfSale: string;
  number: string;
  issueDate: string;
  netAmount: number;
  vatAmount: number;
  otherTaxes: number;
  totalAmount: number;
};

/**
 * Intenta extraer datos fiscales desde una URL de QR de ARCA/AFIP (`https://www.afip.gob.ar/fe/qr/?p=...`).
 */
export function parseArcaQrUrl(rawUrl: string): Partial<ParsedInvoiceData> | null {
  try {
    const url = new URL(String(rawUrl).trim());
    const payload = url.searchParams.get("p");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(decodeURIComponent(escape(atob(base64)))) as Record<string, unknown>;
    if (!json || !json.cuit) return null;

    const typeMap: Record<
      number,
      [ParsedInvoiceData["documentType"], ParsedInvoiceData["letter"]]
    > = {
      1: ["Factura", "A"],
      2: ["Nota de débito", "A"],
      3: ["Nota de crédito", "A"],
      6: ["Factura", "B"],
      7: ["Nota de débito", "B"],
      8: ["Nota de crédito", "B"],
      11: ["Factura", "C"],
      12: ["Nota de débito", "C"],
      13: ["Nota de crédito", "C"],
      51: ["Factura", "M"],
    };

    const [documentType, letter] = typeMap[Number(json.tipoCmp)] ?? ["Factura", ""];
    return {
      source: "QR fiscal ARCA",
      cuit: cleanCuit(String(json.cuit)),
      documentType,
      letter,
      pointOfSale: String(json.ptoVta ?? "").replace(/\D/g, ""),
      number: String(json.nroCmp ?? "").replace(/\D/g, ""),
      issueDate: String(json.fecha ?? "").slice(0, 10),
      totalAmount: Math.round(Number(json.importe ?? 0)),
    };
  } catch {
    return null;
  }
}

function parseArgentineNumber(raw: string): number {
  let clean = String(raw || "").replace(/[^\d.,-]/g, "");
  if (/,\d{1,2}$/.test(clean)) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    clean = clean.replace(/,/g, "");
  }
  const value = Number.parseFloat(clean);
  return Number.isNaN(value) ? 0 : Math.round(value);
}

/**
 * Extrae datos fiscales desde texto plano de una factura o PDF argentino (igual que `facParseText` en `raveV2`).
 */
export function parseInvoiceText(text: string): Partial<ParsedInvoiceData> | null {
  if (!text || text.trim().length < 15) return null;
  const normalized = text.replace(/\s+/g, " ");
  const result: Partial<ParsedInvoiceData> = { source: "Texto del documento" };

  const cuitMatches = [...normalized.matchAll(/(\d{2})[-\s.]?(\d{8})[-\s.]?(\d)\b/g)]
    .map((match) => `${match[1]}${match[2]}${match[3]}`)
    .filter(isValidCuit);

  if (cuitMatches.length > 0) {
    result.cuit = cuitMatches[0];
  }

  const docMatch = normalized.match(
    /\b(FACTURA|NOTA DE CR[EÉ]DITO|NOTA DE D[EÉ]BITO|REMITO)\b[^A-Z]{0,20}\b([ABCM])\b/i,
  );
  if (docMatch) {
    result.documentType = /CR/i.test(docMatch[1])
      ? "Nota de crédito"
      : /D[EÉ]B/i.test(docMatch[1])
        ? "Nota de débito"
        : /REM/i.test(docMatch[1])
          ? "Remito"
          : "Factura";
    result.letter = docMatch[2].toUpperCase() as ParsedInvoiceData["letter"];
  }

  const numMatch =
    normalized.match(/Punto de Venta:?\s*(\d{1,5})\s*Comp\.?\s*Nro:?\s*(\d{1,8})/i) ||
    normalized.match(/\b(\d{4,5})\s*-\s*(\d{8})\b/);
  if (numMatch) {
    result.pointOfSale = String(Number(numMatch[1]));
    result.number = String(Number(numMatch[2]));
  }

  const dateMatch =
    normalized.match(/Fecha de Emisi[oó]n:?\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    normalized.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (dateMatch) {
    result.issueDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  const totalMatch =
    normalized.match(/Importe Total:?\s*\$?\s*([\d.,]+)/i) ||
    normalized.match(/\bTOTAL:?\s*\$?\s*([\d.,]+)/i);
  if (totalMatch) {
    result.totalAmount = parseArgentineNumber(totalMatch[1]);
  }

  const netMatch = normalized.match(
    /(?:Importe Neto Gravado|Subtotal|Neto Gravado):?\s*\$?\s*([\d.,]+)/i,
  );
  if (netMatch) {
    result.netAmount = parseArgentineNumber(netMatch[1]);
  }

  const vatMatch = normalized.match(/IVA\s*(?:21|10[.,]5|27)\s*%:?\s*\$?\s*([\d.,]+)/i);
  if (vatMatch) {
    result.vatAmount = parseArgentineNumber(vatMatch[1]);
  }

  const businessMatch = normalized.match(
    /Raz[oó]n Social:?\s*([^:]{3,60}?)\s+(?:Domicilio|Fecha|CUIT|Condici)/i,
  );
  if (businessMatch) {
    result.businessName = businessMatch[1].trim();
  }

  return result.cuit || result.totalAmount || result.number ? result : null;
}
