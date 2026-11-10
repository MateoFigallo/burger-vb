/** Módulos del panel. Cada empleado puede tener acceso a algunos de ellos. */
export type ModuleId = "pedidos" | "productos" | "clientes" | "campanas" | "sellos" | "equipo";

export type PanelModule = {
  id: ModuleId;
  label: string;
  description: string;
  href: string;
};

export type PanelGroup = {
  label: string;
  modules: ModuleId[];
};

export const PANEL_MODULES: Record<ModuleId, PanelModule> = {
  pedidos: {
    id: "pedidos",
    label: "Pedidos",
    description: "Ver pedidos, cambiar su estado y abrir o cerrar el local.",
    href: "/dashboard",
  },
  productos: {
    id: "productos",
    label: "Productos",
    description: "Crear productos y categorías, precios, descuentos y promos.",
    href: "/dashboard/productos",
  },
  clientes: {
    id: "clientes",
    label: "Clientes",
    description: "Ver y cargar clientes, y crear su acceso a la app.",
    href: "/dashboard/clientes",
  },
  campanas: {
    id: "campanas",
    label: "Campañas WhatsApp",
    description: "Armar y enviar campañas a grupos de clientes.",
    href: "/dashboard/campanas",
  },
  sellos: {
    id: "sellos",
    label: "Sellos y premios",
    description: "Configurar la tarjeta de sellos y canjear premios.",
    href: "/dashboard/sellos",
  },
  equipo: {
    id: "equipo",
    label: "Empleados",
    description: "Crear cuentas de empleados, roles y permisos.",
    href: "/dashboard/equipo",
  },
};

export const ALL_MODULES = Object.keys(PANEL_MODULES) as ModuleId[];

export const PANEL_GROUPS: PanelGroup[] = [
  { label: "Tienda", modules: ["pedidos", "productos"] },
  { label: "Clientes y fidelización", modules: ["clientes", "campanas", "sellos"] },
  { label: "Equipo", modules: ["equipo"] },
];

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && value in PANEL_MODULES;
}

/** Primera pantalla del panel a la que puede entrar alguien con estos módulos. */
export function getPanelHome(modules: readonly ModuleId[]): string | null {
  const first = ALL_MODULES.find((module) => modules.includes(module));
  return first ? PANEL_MODULES[first].href : null;
}
