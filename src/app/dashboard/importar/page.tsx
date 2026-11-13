import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { DataTransferManager } from "@/features/system";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Importar / Exportar",
};

export default function DashboardImportarPage() {
  return (
    <ModuleGate module="importar">
      <DataTransferManager />
    </ModuleGate>
  );
}
