import type { Metadata } from "next";
import { SummaryDashboard } from "@/features/analytics";
import { ModuleGate } from "@/features/auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Resumen y análisis",
};

export default function ResumenPage() {
  return (
    <ModuleGate module="resumen">
      <SummaryDashboard />
    </ModuleGate>
  );
}
