/** Arma un enlace de WhatsApp. El número va con código de país, solo dígitos. */
export function getWhatsAppUrl(phoneNumber: string, message?: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
