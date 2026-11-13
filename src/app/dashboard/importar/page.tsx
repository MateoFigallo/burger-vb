import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { DataTransferManager } from "@/features/system";

export const metadata: Metadata = {
  title: "Importar, exportar y copias",
};

export default function DashboardImportarPage() {
  return (
    <ModuleGate module="importar">
      <DataTransferManager />
    </ModuleGate>
  );
}
