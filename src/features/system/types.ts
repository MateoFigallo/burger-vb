export type AuditCategory =
  | "CAJA_CIERRE_Z"
  | "VENTA_POS"
  | "STOCK_AJUSTE"
  | "CLUB_MONEDERO"
  | "RRHH_FICHAJE"
  | "SISTEMA_CONFIG";

export type AuditEntry = {
  id: string;
  category: AuditCategory;
  action: string;
  detail: string;
  actor: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
};

export type RegretRequest = {
  id: string;
  customerName: string;
  phone: string;
  orderCode: string;
  reason: string;
  status: "pendiente" | "resuelto" | "reintegrado";
  createdAt: string;
};

export type WebMenuConfig = {
  storeName: string;
  tagline: string;
  promoBanner: string;
  promoBannerActive: boolean;
  whatsappNumber: string;
  instagramHandle: string;
  facebookUrl: string;
  tiktokHandle: string;
  googleReviewUrl: string;
  address: string;
  hours: string;
  deliveryInfo: string;
  wifiSsid: string;
  wifiPassword: string;
  showWifiOnMenu: boolean;
  termsAndConditions: string;
  privacyPolicy: string;
  regretButtonInfo: string;
  legalConfirmedBy: string;
  legalConfirmedAt?: string;
};

export type SystemFiscalConfig = {
  businessLegalName: string;
  cuit: string;
  ivaCondition: "Responsable Inscripto" | "Monotributista" | "Exento";
  arcaPointOfSale: string;
  ticketFooter: string;
  printQrOnTicket: boolean;
  cashDiscountPct: number;
  transferDiscountPct: number;
  creditSurchargePct: number;
  lowStockThreshold: number;
  fiadoDefaultDays: number;
  allowNegativeStock: boolean;
};

export type SystemState = {
  web: WebMenuConfig;
  fiscal: SystemFiscalConfig;
  auditLog: AuditEntry[];
  regretRequests: RegretRequest[];
};
