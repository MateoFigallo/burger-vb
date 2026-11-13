import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { WebMenuManager } from "@/features/system";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Menú digital y legal",
};

export default function DashboardWebPage() {
  return (
    <ModuleGate module="web">
      <WebMenuManager />
    </ModuleGate>
  );
}
