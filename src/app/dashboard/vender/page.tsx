import type { Metadata } from "next";
import { ModuleGate } from "@/features/auth";
import { PosManager } from "@/features/commercial";

export const instant = false;

export const metadata: Metadata = {
  title: "Vender POS",
};

export default function VenderPage() {
  return (
    <ModuleGate module="vender">
      <PosManager />
    </ModuleGate>
  );
}
