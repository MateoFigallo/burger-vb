import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { CashManager } from "@/features/commercial";

export const instant = false;

export const metadata: Metadata = {
  title: "Gestión de caja",
};

export default function CajaPage() {
  return (
    <ModuleGate module="caja">
      <CashManager />
    </ModuleGate>
  );
}
