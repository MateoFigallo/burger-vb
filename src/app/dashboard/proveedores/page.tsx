import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { SuppliersManager } from "@/features/logistics";

export const instant = false;

export const metadata: Metadata = {
  title: "Proveedores y compras",
};

export default function SuppliersPage() {
  return (
    <ModuleGate module="proveedores">
      <SuppliersManager />
    </ModuleGate>
  );
}
