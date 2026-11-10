import type { Metadata } from "next";
import { LoyaltyManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Sellos y premios",
};

export default function LoyaltyPage() {
  return (
    <ModuleGate module="sellos">
      <LoyaltyManager />
    </ModuleGate>
  );
}
