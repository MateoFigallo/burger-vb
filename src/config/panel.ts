import {
  businessConfig,
  type LogisticsSectionId,
  type ModuleId,
  type PanelGroup,
  type PanelModule,
} from "./business.config";

export type { LogisticsSectionId, ModuleId, PanelGroup, PanelModule };

export const PANEL_MODULES: Record<ModuleId, PanelModule> = businessConfig.panel.modules;

export const ALL_MODULES = Object.keys(PANEL_MODULES) as ModuleId[];

export const PANEL_GROUPS: PanelGroup[] = businessConfig.panel.groups;

export const LOGISTICS_MODULES: LogisticsSectionId[] = [
  "inventario",
  "mermas",
  "presupuestos",
  "proveedores",
];

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && value in PANEL_MODULES;
}

/** Primera pantalla del panel a la que puede entrar alguien con estos módulos. */
export function getPanelHome(modules: readonly ModuleId[]): string | null {
  const first = ALL_MODULES.find((module) => modules.includes(module));
  return first ? PANEL_MODULES[first].href : null;
}
