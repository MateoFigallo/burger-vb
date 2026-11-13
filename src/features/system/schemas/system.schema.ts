import { z } from "zod";

export const webMenuSchema = z.object({
  storeName: z.string().trim().min(2, "Ingresá el nombre visible del local."),
  tagline: z.string().trim().min(5, "Ingresá una descripción breve para la portada."),
  promoBanner: z.string().trim(),
  promoBannerActive: z.boolean(),
  whatsappNumber: z.string().trim().min(8, "Ingresá un número de WhatsApp válido."),
  instagramHandle: z.string().trim(),
  facebookUrl: z.union([z.literal(""), z.string().trim().url("Ingresá un link de Facebook válido.")]),
  tiktokHandle: z.string().trim(),
  googleReviewUrl: z.union([
    z.literal(""),
    z.string().trim().url("Ingresá un link de reseñas de Google válido."),
  ]),
  address: z.string().trim().min(3, "Ingresá la dirección del local."),
  hours: z.string().trim().min(3, "Ingresá los horarios de atención."),
  deliveryInfo: z.string().trim(),
  wifiSsid: z.string().trim(),
  wifiPassword: z.string().trim(),
  showWifiOnMenu: z.boolean(),
});

export const legalConfigSchema = z.object({
  termsAndConditions: z.string().trim().min(10, "Ingresá los términos y condiciones."),
  privacyPolicy: z.string().trim().min(10, "Ingresá la política de privacidad."),
  regretButtonInfo: z.string().trim().min(10, "Ingresá la leyenda del botón de arrepentimiento."),
  legalConfirmedBy: z.string().trim().min(2, "Indicá el nombre del titular o asesor que valida."),
});

export const systemFiscalSchema = z.object({
  businessLegalName: z.string().trim().min(2, "Ingresá la razón social o nombre comercial."),
  cuit: z.string().trim().min(8, "Ingresá un CUIT válido."),
  ivaCondition: z.enum(["Responsable Inscripto", "Monotributista", "Exento"]),
  arcaPointOfSale: z.string().trim().min(1, "Ingresá el punto de venta ARCA."),
  ticketFooter: z.string().trim(),
  printQrOnTicket: z.boolean(),
  cashDiscountPct: z.number().min(0).max(50),
  transferDiscountPct: z.number().min(0).max(50),
  creditSurchargePct: z.number().min(0).max(100),
  lowStockThreshold: z.number().min(1).max(500),
  fiadoDefaultDays: z.number().min(1).max(180),
  allowNegativeStock: z.boolean(),
});

export type WebMenuFormValues = z.infer<typeof webMenuSchema>;
export type LegalConfigFormValues = z.infer<typeof legalConfigSchema>;
export type SystemFiscalFormValues = z.infer<typeof systemFiscalSchema>;
