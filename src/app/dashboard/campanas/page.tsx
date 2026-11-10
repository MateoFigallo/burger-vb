import type { Metadata } from "next";
import { CampaignsManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Campañas por WhatsApp",
};

export default function CampaignsPage() {
  return (
    <ModuleGate module="campanas">
      <CampaignsManager />
    </ModuleGate>
  );
}
