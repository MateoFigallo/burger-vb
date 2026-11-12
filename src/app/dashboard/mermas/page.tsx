import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { ShrinkageManager } from "@/features/logistics";

export const instant = false;

export const metadata: Metadata = {
  title: "Mermas y devoluciones",
};

export default function ShrinkagePage() {
  return (
    <ModuleGate module="mermas">
      <ShrinkageManager />
    </ModuleGate>
  );
}
