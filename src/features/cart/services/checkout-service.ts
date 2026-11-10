import { siteConfig } from "@/config/site";
import { DELIVERY_LABELS, PAYMENT_LABELS } from "@/features/orders";
import { formatPrice } from "@/lib/format";
import { normalizePhone } from "@/lib/ids";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { CartItem, CheckoutDetails, CheckoutErrors } from "../types";

export function validateCheckout(details: CheckoutDetails): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (details.customerName.trim().length < 2) {
    errors.customerName = "Ingresá tu nombre para que sepamos de quién es el pedido.";
  }
  if (normalizePhone(details.customerPhone).length < 8) {
    errors.customerPhone = "Ingresá tu WhatsApp con código de área.";
  }
  if (details.deliveryMethod === "delivery" && details.address.trim().length < 5) {
    errors.address = "Ingresá la dirección de entrega.";
  }
  return errors;
}

export function buildOrderMessage(
  items: CartItem[],
  total: number,
  details: CheckoutDetails,
): string {
  const lines = [
    `¡Hola ${siteConfig.name}! 🍔 Quiero hacer este pedido:`,
    "",
    ...items.map(
      (item) => `• ${item.quantity}x ${item.name} — ${formatPrice(item.price * item.quantity)}`,
    ),
    "",
    `*Total: ${formatPrice(total)}*`,
    "",
    `*Nombre:* ${details.customerName.trim()}`,
    `*WhatsApp:* ${details.customerPhone.trim()}`,
    `*Entrega:* ${DELIVERY_LABELS[details.deliveryMethod]}`,
  ];

  if (details.deliveryMethod === "delivery") {
    lines.push(`*Dirección:* ${details.address.trim()}`);
  }
  lines.push(`*Pago:* ${PAYMENT_LABELS[details.paymentMethod]}`);
  if (details.notes.trim()) {
    lines.push(`*Notas:* ${details.notes.trim()}`);
  }

  return lines.join("\n");
}

export function getOrderWhatsAppUrl(
  items: CartItem[],
  total: number,
  details: CheckoutDetails,
): string {
  return getWhatsAppUrl(siteConfig.whatsappNumber, buildOrderMessage(items, total, details));
}
