import type { DeliveryMethod, OrderStatus, PaymentMethod } from "./types";

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  delivery: "Delivery",
  retiro: "Retiro en el local",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  "mercado-pago": "Mercado Pago",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  preparando: "En preparación",
  enviado: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDER_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

/** Pedidos que todavía requieren atención del local. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = ["pendiente", "preparando", "enviado"];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && value in STATUS_LABELS;
}
