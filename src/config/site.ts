export type SiteConfig = {
  name: string;
  description: string;
  /** Número que recibe los pedidos. Se configura en NEXT_PUBLIC_WHATSAPP_NUMBER. */
  whatsappNumber: string;
  address: string;
  hours: string;
};

export const siteConfig: SiteConfig = {
  name: "Burger VB",
  description:
    "Hamburguesas artesanales hechas a la parrilla. Armá tu pedido online y confirmalo por WhatsApp.",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000",
  address: "Av. Principal 1234, Ciudad",
  hours: "Martes a domingo, de 19:00 a 00:00",
};
