import { businessConfig } from "@/config/business.config";
import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type {
  AuditEntry,
  RegretRequest,
  SystemFiscalConfig,
  SystemState,
  WebMenuConfig,
} from "../types";

export const DEFAULT_SYSTEM_STATE: SystemState = {
  web: {
    storeName: businessConfig.site.name,
    tagline: businessConfig.site.description,
    promoBanner: businessConfig.webAndLegal.defaultPromoBanner,
    promoBannerActive: true,
    whatsappNumber: businessConfig.site.whatsappNumber,
    instagramHandle: businessConfig.webAndLegal.defaultInstagram,
    facebookUrl: businessConfig.webAndLegal.defaultFacebookUrl,
    tiktokHandle: businessConfig.webAndLegal.defaultTiktok,
    googleReviewUrl: businessConfig.webAndLegal.defaultGoogleReviewUrl,
    address: businessConfig.site.address,
    hours: businessConfig.site.hours,
    deliveryInfo: businessConfig.webAndLegal.defaultDeliveryZones,
    wifiSsid: businessConfig.webAndLegal.defaultWifiSsid,
    wifiPassword: businessConfig.webAndLegal.defaultWifiPass,
    showWifiOnMenu: true,
    termsAndConditions: businessConfig.webAndLegal.defaultTerms,
    privacyPolicy: businessConfig.webAndLegal.defaultPrivacyPolicy,
    regretButtonInfo: businessConfig.webAndLegal.defaultRegretInfo,
    legalConfirmedBy: "Titular Burger VB · Dr. Marcos Villalba (Mat. 4812)",
    legalConfirmedAt: "2026-10-15T14:30:00.000Z",
  },
  fiscal: {
    businessLegalName: "BURGER VB GASTRONOMÍA S.A.S.",
    cuit: businessConfig.system.defaultCuit,
    ivaCondition: businessConfig.system.defaultIvaCondition,
    arcaPointOfSale: businessConfig.system.defaultPtoVtaArca,
    ticketFooter: businessConfig.system.defaultTicketFooter,
    printQrOnTicket: true,
    cashDiscountPct: 10,
    transferDiscountPct: 5,
    creditSurchargePct: 10,
    lowStockThreshold: businessConfig.logistics.lowStockThreshold,
    fiadoDefaultDays: businessConfig.commercial.defaultFiadoDays,
    allowNegativeStock: businessConfig.logistics.allowNegativeStockByDefault,
  },
  auditLog: [
    {
      id: "aud-1",
      category: "CAJA_CIERRE_Z",
      action: "Cierre Z #0041 sellado con firma SHA-256",
      detail: "Caja 1 · Mostrador Principal · Diferencia de arqueo: $0 (Exacta)",
      actor: "Valentina Gómez (Cajero)",
      severity: "info",
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-2",
      category: "STOCK_AJUSTE",
      action: "Recepción de OC #OC-104 (Frigorífico San Jorge)",
      detail: "Ingreso de 120 medallones smash 110g + actualización de costo promedio ponderado",
      actor: "Tomás Sosa (Encargado)",
      severity: "info",
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-3",
      category: "VENTA_POS",
      action: "Descuento por cupón promocional aplicado en POS",
      detail: "Cupón SMASH20 (-20%) en Ticket #POS-884 · Cliente: Martín Acosta",
      actor: "Valentina Gómez (Cajero)",
      severity: "warning",
      createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-4",
      category: "RRHH_FICHAJE",
      action: "Autorización de adelanto de sueldo en efectivo",
      detail: "Vale de $15.000 para Agustín Pereyra (Cocina · Turno Noche)",
      actor: "Tomás Sosa (Encargado)",
      severity: "warning",
      createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-5",
      category: "SISTEMA_CONFIG",
      action: "Validación de textos legales y Botón de Arrepentimiento",
      detail: "Cumplimiento Ley 25.326 y Res. SCI 424/2020 verificado para tienda online",
      actor: "Titular Burger VB",
      severity: "info",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
  ],
  regretRequests: [
    {
      id: "reg-1",
      customerName: "Lucía Fernández",
      phone: "5493874123456",
      orderCode: "PED-1042",
      reason: "Solicito cambio de horario de entrega o reintegro a mi Monedero Club.",
      status: "resuelto",
      createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    },
    {
      id: "reg-2",
      customerName: "Federico Juárez",
      phone: "5493875987654",
      orderCode: "GC-8821",
      reason: "Arrepentimiento de compra de Gift Card dentro de los 10 días corridos.",
      status: "pendiente",
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
  ],
};

export const systemStore = createLocalStore<SystemState>(
  "burger-vb:system",
  DEFAULT_SYSTEM_STATE,
);

export function recordAuditEntry(input: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
  const entry: AuditEntry = {
    ...input,
    id: createId("aud"),
    createdAt: new Date().toISOString(),
  };
  systemStore.set((prev) => ({
    ...prev,
    auditLog: [entry, ...prev.auditLog],
  }));
  return entry;
}

export function updateWebMenuConfig(patch: Partial<WebMenuConfig>, actor = "Administrador") {
  systemStore.set((prev) => {
    const nextWeb = { ...prev.web, ...patch };
    const entry: AuditEntry = {
      id: createId("aud"),
      category: "SISTEMA_CONFIG",
      action: "Actualización de configuración de Menú Digital y Web",
      detail: `Local: ${nextWeb.storeName} · Banner promo: ${nextWeb.promoBannerActive ? "Activo" : "Oculto"} · Wi-Fi: ${nextWeb.wifiSsid}`,
      actor,
      severity: "info",
      createdAt: new Date().toISOString(),
    };
    return {
      ...prev,
      web: nextWeb,
      auditLog: [entry, ...prev.auditLog],
    };
  });
}

export function confirmLegalTexts(confirmedBy: string) {
  const cleanName = confirmedBy.trim() || "Titular del comercio";
  const now = new Date().toISOString();
  systemStore.set((prev) => {
    const entry: AuditEntry = {
      id: createId("aud"),
      category: "SISTEMA_CONFIG",
      action: "Firma de conformidad de Términos, Privacidad y Arrepentimiento",
      detail: `Confirmado por: ${cleanName}`,
      actor: cleanName,
      severity: "info",
      createdAt: now,
    };
    return {
      ...prev,
      web: {
        ...prev.web,
        legalConfirmedBy: cleanName,
        legalConfirmedAt: now,
      },
      auditLog: [entry, ...prev.auditLog],
    };
  });
}

export function createRegretRequest(
  input: Omit<RegretRequest, "id" | "status" | "createdAt">,
): RegretRequest {
  const item: RegretRequest = {
    ...input,
    id: createId("reg"),
    status: "pendiente",
    createdAt: new Date().toISOString(),
  };
  systemStore.set((prev) => ({
    ...prev,
    regretRequests: [item, ...prev.regretRequests],
  }));
  return item;
}

export function updateRegretRequestStatus(
  id: string,
  status: RegretRequest["status"],
  actor = "Encargado",
) {
  systemStore.set((prev) => {
    const target = prev.regretRequests.find((r) => r.id === id);
    const entry: AuditEntry = {
      id: createId("aud"),
      category: "SISTEMA_CONFIG",
      action: `Gestión de solicitud de arrepentimiento (${target?.orderCode ?? id})`,
      detail: `Nuevo estado: ${status.toUpperCase()} · Cliente: ${target?.customerName ?? "N/D"}`,
      actor,
      severity: "info",
      createdAt: new Date().toISOString(),
    };
    return {
      ...prev,
      regretRequests: prev.regretRequests.map((r) => (r.id === id ? { ...r, status } : r)),
      auditLog: [entry, ...prev.auditLog],
    };
  });
}

export function updateSystemFiscalConfig(
  patch: Partial<SystemFiscalConfig>,
  actor = "Administrador",
) {
  systemStore.set((prev) => {
    const nextFiscal = { ...prev.fiscal, ...patch };
    const entry: AuditEntry = {
      id: createId("aud"),
      category: "SISTEMA_CONFIG",
      action: "Cambio de parámetros comerciales y fiscales ARCA",
      detail: `CUIT ${nextFiscal.cuit} · Pto Vta ${nextFiscal.arcaPointOfSale} · Desc. Efectivo ${nextFiscal.cashDiscountPct}% · Rec. Crédito ${nextFiscal.creditSurchargePct}%`,
      actor,
      severity: "warning",
      createdAt: new Date().toISOString(),
    };
    return {
      ...prev,
      fiscal: nextFiscal,
      auditLog: [entry, ...prev.auditLog],
    };
  });
}

const STORAGE_PREFIX = "burger-vb:";

export function getLocalStorageModulesSummary(): { key: string; sizeBytes: number }[] {
  if (typeof window === "undefined") return [];
  const items: { key: string; sizeBytes: number }[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const val = window.localStorage.getItem(key) ?? "";
      items.push({ key, sizeBytes: new Blob([val]).size });
    }
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export function exportFullSystemBackup(): string {
  const data: Record<string, unknown> = {};
  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          try {
            data[key] = JSON.parse(raw);
          } catch {
            data[key] = raw;
          }
        }
      }
    }
  }
  recordAuditEntry({
    category: "SISTEMA_CONFIG",
    action: "Exportación de copia de seguridad completa (JSON)",
    detail: `${Object.keys(data).length} almacenes locales incluidos en el respaldo`,
    actor: "Administrador",
    severity: "info",
  });
  return JSON.stringify(
    {
      app: "Burger VB",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      stores: data,
    },
    null,
    2,
  );
}

export function importFullSystemBackup(
  rawJson: string,
): { ok: true; keysCount: number } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as { stores?: Record<string, unknown> };
    const stores = parsed.stores ?? (parsed as Record<string, unknown>);
    const validEntries = Object.entries(stores).filter(([key]) =>
      key.startsWith(STORAGE_PREFIX),
    );
    if (validEntries.length === 0) {
      return {
        ok: false,
        error: "El archivo no contiene datos válidos de Burger VB (prefijo burger-vb:*).",
      };
    }
    if (typeof window !== "undefined") {
      for (const [key, value] of validEntries) {
        window.localStorage.setItem(
          key,
          typeof value === "string" ? value : JSON.stringify(value),
        );
      }
    }
    recordAuditEntry({
      category: "SISTEMA_CONFIG",
      action: "Restauración de copia de seguridad desde archivo JSON",
      detail: `${validEntries.length} módulos restaurados exitosamente`,
      actor: "Administrador",
      severity: "critical",
    });
    return { ok: true, keysCount: validEntries.length };
  } catch {
    return { ok: false, error: "El archivo seleccionado no es un JSON válido." };
  }
}

export function resetAllDemoData() {
  if (typeof window !== "undefined") {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && key !== "burger-vb:session") {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  }
  systemStore.set(() => DEFAULT_SYSTEM_STATE);
}
