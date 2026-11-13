import { businessConfig } from "@/config/business.config";
import { commercialStore } from "@/features/commercial";
import {
  createCustomer,
  customersStore,
  getCustomerDebt,
  setCustomerStamps,
  updateCustomerProfile,
} from "@/features/customers";
import { cleanCuit, logisticsStore, type IvaCondition, type UnitCode } from "@/features/logistics";
import {
  catalogStore,
  createCategory,
  createProduct,
  getFinalPrice,
  updateProduct,
} from "@/features/menu";
import { recordAuditEntry } from "./system-store";
import type { AuditEntry } from "../types";

export type TransferAreaId = (typeof businessConfig.system.transferAreas)[number]["id"];

export interface AreaExportResult {
  filename: string;
  csvContent: string;
  recordCount: number;
}

export interface AreaImportPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface AreaImportResult {
  created: number;
  updated: number;
  skipped: number;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(",");
  const bodyLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  // UTF-8 BOM para compatibilidad directa con Microsoft Excel en Windows/Mac
  return "\uFEFF" + [headerLine, ...bodyLines].join("\r\n");
}

function detectDelimiter(headerLine: string): "," | ";" {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function parseCsvText(raw: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return { headers: [], rows: [] };

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeHeader);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) record[h] = values[idx] ?? "";
    });
    rows.push(record);
  }
  return { headers, rows };
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportAreaToCsv(
  area: TransferAreaId,
  auditLog: AuditEntry[],
): AreaExportResult {
  const catalog = catalogStore.getSnapshot();
  const logistics = logisticsStore.getSnapshot();
  const customers = customersStore.getSnapshot();
  const commercial = commercialStore.getSnapshot();
  const dateStr = todayStamp();

  switch (area) {
    case "stock": {
      const catById = new Map(catalog.categories.map((c) => [c.id, c.name]));
      const headers = [
        "nombre",
        "categoria",
        "unidad",
        "stock",
        "costo",
        "precio",
        "codigo_barras",
        "presentacion",
        "grupo",
        "controla_stock",
      ];
      const rows = catalog.products.map((p) => {
        const meta = logistics.productMeta[p.id];
        return [
          p.name,
          catById.get(p.categoryId) ?? "General",
          meta?.unit ?? "u",
          meta?.stock ?? 0,
          meta?.cost ?? 0,
          p.price,
          meta?.barcode ?? "",
          meta?.presentation ?? "",
          meta?.group ?? "",
          meta?.needStock ?? true ? "SI" : "NO",
        ];
      });
      return {
        filename: `stock-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "productos": {
      const catById = new Map(catalog.categories.map((c) => [c.id, c.name]));
      const headers = [
        "nombre",
        "categoria",
        "precio",
        "descuento_pct",
        "precio_final",
        "disponible",
        "destacado",
        "etiqueta",
        "descripcion",
      ];
      const rows = catalog.products.map((p) => [
        p.name,
        catById.get(p.categoryId) ?? "General",
        p.price,
        p.discountPercent ?? 0,
        getFinalPrice(p),
        p.available ? "SI" : "NO",
        p.featured ? "SI" : "NO",
        p.badge ?? "",
        p.description,
      ]);
      return {
        filename: `menu-productos-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "clientes": {
      const headers = [
        "nombre",
        "telefono",
        "email",
        "cumpleanos",
        "sellos",
        "pedidos_totales",
        "gasto_total",
        "limite_fiado",
        "deuda_actual",
        "notas",
      ];
      const rows = customers.map((c) => [
        c.name,
        c.phone,
        c.email,
        c.birthday,
        c.stamps,
        c.totalOrders,
        c.totalSpent,
        c.creditLimit ?? 0,
        getCustomerDebt(c.id),
        c.notes,
      ]);
      return {
        filename: `clientes-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "proveedores": {
      const headers = [
        "razon_social",
        "cuit",
        "condicion_iva",
        "telefono",
        "email",
        "direccion",
        "saldo_cta_cte",
        "activo",
      ];
      const rows = logistics.suppliers.map((s) => [
        s.businessName,
        s.cuit,
        s.ivaCondition,
        s.phone,
        s.email,
        s.address,
        s.balance,
        s.active ? "SI" : "NO",
      ]);
      return {
        filename: `proveedores-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "mermas": {
      const headers = ["fecha", "producto", "tipo", "cantidad", "costo_unitario", "valor_total", "motivo", "usuario"];
      const rows = logistics.shrinkages.map((m) => [
        m.createdAt,
        m.productName,
        m.type,
        m.quantity,
        m.unitCost,
        m.totalValue,
        m.reason,
        m.user,
      ]);
      return {
        filename: `mermas-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "presupuestos": {
      const headers = ["numero", "fecha", "vence", "cliente", "telefono", "estado", "total", "notas"];
      const rows = logistics.quotes.map((q) => [
        q.number,
        q.createdAt,
        q.expiresAt,
        q.customerName,
        q.customerPhone ?? "",
        q.status,
        q.total,
        q.notes,
      ]);
      return {
        filename: `presupuestos-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "ventas": {
      const headers = ["ticket", "fecha", "cliente", "cajero", "medio_pago", "subtotal", "descuento", "total", "estado"];
      const rows = commercial.sales.map((s) => [
        s.ticketNumber,
        s.createdAt,
        s.customerName,
        s.cashier,
        s.payments.map((p) => `${p.method}:${p.amount}`).join(" | "),
        s.subtotal,
        s.discountAmount,
        s.total,
        s.status,
      ]);
      return {
        filename: `ventas-pos-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "caja": {
      const headers = ["fecha", "sesion_id", "tipo", "rubro", "monto", "concepto", "usuario"];
      const rows = commercial.movements.map((m) => [
        m.createdAt,
        m.sessionId,
        m.kind,
        m.rubroLabel,
        m.amount,
        m.concept,
        m.user,
      ]);
      return {
        filename: `movimientos-caja-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }

    case "auditoria": {
      const headers = ["fecha", "categoria", "accion", "detalle", "usuario", "severidad"];
      const rows = auditLog.map((a) => [
        a.createdAt,
        a.category,
        a.action,
        a.detail,
        a.actor,
        a.severity,
      ]);
      return {
        filename: `auditoria-burger-vb-${dateStr}.csv`,
        csvContent: buildCsvContent(headers, rows),
        recordCount: rows.length,
      };
    }
  }
}

export function getAreaTemplateCsv(area: TransferAreaId): {
  filename: string;
  csvContent: string;
} {
  switch (area) {
    case "stock":
      return {
        filename: "plantilla-stock-burger-vb.csv",
        csvContent: buildCsvContent(
          [
            "nombre",
            "categoria",
            "unidad",
            "stock",
            "costo",
            "precio",
            "codigo_barras",
            "presentacion",
            "grupo",
            "controla_stock",
          ],
          [
            [
              "Smash Doble Bacon",
              "Hamburguesas",
              "u",
              40,
              4200,
              11500,
              "7790001000999",
              "Doble medallón",
              "Línea Smash",
              "SI",
            ],
          ],
        ),
      };
    case "productos":
      return {
        filename: "plantilla-productos-burger-vb.csv",
        csvContent: buildCsvContent(
          ["nombre", "categoria", "precio", "descuento_pct", "disponible", "destacado", "etiqueta", "descripcion"],
          [
            [
              "Crispy Onion Burger",
              "Hamburguesas",
              12200,
              10,
              "SI",
              "NO",
              "Nueva",
              "Doble carne smash, cheddar, aros de cebolla crocantes y salsa barbacoa.",
            ],
          ],
        ),
      };
    case "clientes":
      return {
        filename: "plantilla-clientes-burger-vb.csv",
        csvContent: buildCsvContent(
          ["nombre", "telefono", "email", "cumpleanos", "sellos", "limite_fiado", "notas"],
          [["Lucía Fernández", "5493875123456", "lucia@mail.com", "1996-05-14", 3, 25000, "Cliente frecuente"]],
        ),
      };
    case "proveedores":
      return {
        filename: "plantilla-proveedores-burger-vb.csv",
        csvContent: buildCsvContent(
          ["razon_social", "cuit", "condicion_iva", "telefono", "email", "direccion"],
          [["Frigorífico del Norte SRL", "30712345678", "Responsable Inscripto", "3874221100", "ventas@frigonorte.com", "Av. Tavella 1420"]],
        ),
      };
    default:
      return {
        filename: `plantilla-${area}-burger-vb.csv`,
        csvContent: buildCsvContent(["info"], [["Esta área es solo de exportación"]]),
      };
  }
}

export function previewAreaCsvImport(
  area: TransferAreaId,
  csvText: string,
): { ok: true; preview: AreaImportPreview } | { ok: false; error: string } {
  const areaMeta = businessConfig.system.transferAreas.find((a) => a.id === area);
  if (!areaMeta?.supportsImport) {
    return { ok: false, error: "El área seleccionada solo admite exportación en Excel/CSV." };
  }
  const parsed = parseCsvText(csvText);
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return { ok: false, error: "El archivo no contiene encabezados o filas de datos válidas." };
  }
  return {
    ok: true,
    preview: {
      headers: parsed.headers,
      rows: parsed.rows.slice(0, 6),
      totalRows: parsed.rows.length,
    },
  };
}

function parseBool(val: string | undefined, fallback: boolean): boolean {
  if (!val) return fallback;
  const v = val.trim().toLowerCase();
  if (["si", "sí", "true", "1", "yes", "activo", "disponible"].includes(v)) return true;
  if (["no", "false", "0", "inactivo"].includes(v)) return false;
  return fallback;
}

function parseNumber(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/\$/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function parseUnit(val: string | undefined): UnitCode {
  const v = (val ?? "").trim().toLowerCase();
  if (v === "kg" || v === "kilo" || v === "kilos") return "kg";
  if (v === "l" || v === "lt" || v === "litro" || v === "litros") return "l";
  return "u";
}

function parseIva(val: string | undefined): IvaCondition {
  const v = (val ?? "").trim().toLowerCase();
  if (v.includes("mono")) return "Monotributista";
  if (v.includes("exento")) return "Exento";
  return "Responsable Inscripto";
}

function ensureCategoryId(categoryName: string): string {
  const trimmed = categoryName.trim();
  const catalog = catalogStore.getSnapshot();
  const existing = catalog.categories.find(
    (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing.id;
  if (!trimmed && catalog.categories[0]) return catalog.categories[0].id;
  const created = createCategory(trimmed || "General");
  if (created.ok) return created.category.id;
  return catalog.categories[0]?.id ?? "general";
}

export async function commitAreaCsvImport(
  area: TransferAreaId,
  csvText: string,
): Promise<{ ok: true; result: AreaImportResult } | { ok: false; error: string }> {
  const areaMeta = businessConfig.system.transferAreas.find((a) => a.id === area);
  if (!areaMeta?.supportsImport) {
    return { ok: false, error: "El área seleccionada solo admite exportación." };
  }

  const { rows } = parseCsvText(csvText);
  if (rows.length === 0) {
    return { ok: false, error: "No se encontraron filas válidas para importar." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  if (area === "stock") {
    for (const row of rows) {
      const name = (row.nombre || row.producto || "").trim();
      if (!name) {
        skipped++;
        continue;
      }
      const catalog = catalogStore.getSnapshot();
      const existing = catalog.products.find(
        (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
      );
      const categoryId = ensureCategoryId(row.categoria || "General");
      const price = parseNumber(row.precio, existing?.price ?? 0);
      const cost = parseNumber(row.costo, 0);
      const stock = parseNumber(row.stock, 0);
      const unit = parseUnit(row.unidad);
      const needStock = parseBool(row.controla_stock, true);

      let productId = existing?.id;
      if (existing) {
        updateProduct(existing.id, {
          name,
          categoryId,
          price: price > 0 ? price : existing.price,
        });
        updated++;
      } else {
        const createdProd = createProduct({
          name,
          description: row.presentacion || "",
          price: Math.max(0, price),
          categoryId,
          image: "",
          available: true,
          featured: false,
        });
        productId = createdProd.id;
        created++;
      }

      if (productId) {
        logisticsStore.set((prev) => ({
          ...prev,
          productMeta: {
            ...prev.productMeta,
            [productId]: {
              productId,
              cost: Math.max(0, cost),
              stock,
              unit,
              barcode: row.codigo_barras || prev.productMeta[productId]?.barcode || "",
              plu: prev.productMeta[productId]?.plu || "",
              presentation: row.presentacion || prev.productMeta[productId]?.presentation || "",
              group: row.grupo || prev.productMeta[productId]?.group || "",
              needStock,
              archived: false,
              hasHistory: prev.productMeta[productId]?.hasHistory ?? false,
              kit: prev.productMeta[productId]?.kit ?? [],
            },
          },
        }));
      }
    }
  } else if (area === "productos") {
    for (const row of rows) {
      const name = (row.nombre || row.producto || "").trim();
      if (!name) {
        skipped++;
        continue;
      }
      const catalog = catalogStore.getSnapshot();
      const existing = catalog.products.find(
        (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
      );
      const categoryId = ensureCategoryId(row.categoria || "Hamburguesas");
      const price = Math.max(0, parseNumber(row.precio, existing?.price ?? 0));
      const discountPercent = Math.min(90, Math.max(0, parseNumber(row.descuento_pct, 0)));
      const available = parseBool(row.disponible, true);
      const featured = parseBool(row.destacado, false);
      const badge = (row.etiqueta || "").trim() || undefined;
      const description = (row.descripcion || existing?.description || "").trim();

      if (existing) {
        updateProduct(existing.id, {
          name,
          categoryId,
          price,
          discountPercent: discountPercent > 0 ? discountPercent : undefined,
          available,
          featured,
          badge,
          description,
        });
        updated++;
      } else {
        createProduct({
          name,
          categoryId,
          price,
          discountPercent: discountPercent > 0 ? discountPercent : undefined,
          image: "",
          available,
          featured,
          badge,
          description,
        });
        created++;
      }
    }
  } else if (area === "clientes") {
    for (const row of rows) {
      const name = (row.nombre || "").trim();
      const phone = (row.telefono || "").trim();
      if (!name || !phone) {
        skipped++;
        continue;
      }
      const cleanPhone = phone.replace(/\D/g, "");
      const existing = customersStore
        .getSnapshot()
        .find((c) => c.phone.replace(/\D/g, "") === cleanPhone && cleanPhone.length > 0);

      const stamps = Math.max(0, Math.round(parseNumber(row.sellos, 0)));
      const creditLimit = Math.max(0, parseNumber(row.limite_fiado, 0));

      if (existing) {
        updateCustomerProfile(existing.id, {
          name,
          phone,
          email: row.email || existing.email,
          birthday: row.cumpleanos || existing.birthday,
          notes: row.notas || existing.notes,
          creditLimit: creditLimit > 0 ? creditLimit : existing.creditLimit,
        });
        if (row.sellos !== undefined && row.sellos !== "") {
          setCustomerStamps(existing.id, stamps);
        }
        updated++;
      } else {
        const createdCustomer = await createCustomer({
          name,
          phone,
          email: row.email || "",
          birthday: row.cumpleanos || "",
          notes: row.notas || "",
          creditLimit: creditLimit > 0 ? creditLimit : undefined,
        });
        if (stamps > 0) {
          setCustomerStamps(createdCustomer.id, stamps);
        }
        created++;
      }
    }
  } else if (area === "proveedores") {
    for (const row of rows) {
      const businessName = (row.razon_social || row.nombre || "").trim();
      if (!businessName) {
        skipped++;
        continue;
      }
      const cuit = cleanCuit(row.cuit || "");
      const state = logisticsStore.getSnapshot();
      const existing = state.suppliers.find(
        (s) =>
          (cuit && s.cuit === cuit) ||
          s.businessName.trim().toLowerCase() === businessName.toLowerCase(),
      );

      if (existing) {
        logisticsStore.set((prev) => ({
          ...prev,
          suppliers: prev.suppliers.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  businessName,
                  cuit: cuit || s.cuit,
                  ivaCondition: row.condicion_iva ? parseIva(row.condicion_iva) : s.ivaCondition,
                  phone: row.telefono || s.phone,
                  email: row.email || s.email,
                  address: row.direccion || s.address,
                }
              : s,
          ),
        }));
        updated++;
      } else {
        logisticsStore.set((prev) => ({
          ...prev,
          suppliers: [
            {
              id: `sup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              businessName,
              cuit: cuit || "30000000000",
              ivaCondition: parseIva(row.condicion_iva),
              phone: row.telefono || "",
              email: row.email || "",
              address: row.direccion || "",
              balance: 0,
              active: true,
              createdAt: new Date().toISOString(),
            },
            ...prev.suppliers,
          ],
        }));
        created++;
      }
    }
  }

  recordAuditEntry({
    category: "SISTEMA_CONFIG",
    action: `Importación masiva (${areaMeta.label})`,
    detail: `${created} creados · ${updated} actualizados · ${skipped} omitidos`,
    actor: "Administrador / Encargado",
    severity: "info",
  });

  return { ok: true, result: { created, updated, skipped } };
}
