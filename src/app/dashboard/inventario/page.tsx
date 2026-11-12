import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { StockManager } from "@/features/logistics";

export const instant = false;

export const metadata: Metadata = {
  title: "Stock e inventario",
};

export default function InventoryPage() {
  return (
    <ModuleGate module="inventario">
      <StockManager />
    </ModuleGate>
  );
}
