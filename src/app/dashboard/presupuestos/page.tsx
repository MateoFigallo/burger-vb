import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { QuotesManager } from "@/features/logistics";

export const instant = false;

export const metadata: Metadata = {
  title: "Presupuestos",
};

export default function QuotesPage() {
  return (
    <ModuleGate module="presupuestos">
      <QuotesManager />
    </ModuleGate>
  );
}
