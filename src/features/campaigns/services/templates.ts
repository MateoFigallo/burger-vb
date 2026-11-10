import type { Customer } from "@/features/customers";
import type { CampaignTemplate } from "../types";

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "cumpleanos",
    name: "Feliz cumpleaños",
    description: "Saludo con regalo para quienes cumplen este mes.",
    segment: "cumpleanos",
    message:
      "¡Feliz cumple, {nombre}! 🎂 En {local} queremos festejarlo con vos: en tu próximo pedido de este mes te regalamos unas papas fritas. ¡Te esperamos!",
  },
  {
    id: "te-extranamos",
    name: "Te extrañamos",
    description: "Para que vuelvan los clientes que hace tiempo no piden.",
    segment: "inactivos",
    message:
      "¡Hola {nombre}! Hace un tiempo que no te vemos por {local} 🍔 Volvé esta semana y tu pedido suma doble sello. Ya tenés {sellos} de {sellos_meta}.",
  },
  {
    id: "premio-listo",
    name: "Premio listo para canjear",
    description: "Aviso a quienes ya completaron la tarjeta de sellos.",
    segment: "canje",
    message:
      "{nombre}, ¡completaste tu tarjeta de sellos en {local}! 🎉 Tenés un premio esperándote. Avisanos en tu próximo pedido cuál elegís.",
  },
  {
    id: "promo",
    name: "Promo de la semana",
    description: "Mensaje general para todos los clientes.",
    segment: "todos",
    message:
      "¡Hola {nombre}! Esta semana en {local} tenemos combos con descuento 🔥 Pedí desde la web y confirmá por WhatsApp.",
  },
];

export const TEMPLATE_VARIABLES = [
  { token: "{nombre}", label: "Nombre" },
  { token: "{sellos}", label: "Sellos" },
  { token: "{faltan}", label: "Sellos que faltan" },
  { token: "{sellos_meta}", label: "Sellos de la tarjeta" },
  { token: "{local}", label: "Nombre del local" },
] as const;

type RenderContext = {
  storeName: string;
  stampsRequired: number;
};

/** Reemplaza las variables de la plantilla con los datos del cliente. */
export function renderTemplate(
  template: string,
  customer: Pick<Customer, "name" | "stamps">,
  context: RenderContext,
): string {
  const firstName = customer.name.trim().split(/\s+/)[0] ?? customer.name;
  const missing = Math.max(0, context.stampsRequired - customer.stamps);
  return template
    .replaceAll("{nombre}", firstName)
    .replaceAll("{sellos}", String(customer.stamps))
    .replaceAll("{faltan}", String(missing))
    .replaceAll("{sellos_meta}", String(context.stampsRequired))
    .replaceAll("{local}", context.storeName);
}
