import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { SystemManager } from "@/features/system";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Sistema y auditoría",
};

export default function DashboardSistemaPage() {
  return (
    <ModuleGate module="sistema">
      <SystemManager />
    </ModuleGate>
  );
}
