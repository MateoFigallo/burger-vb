import type { Metadata } from "next";
import { WalletCouponsManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Monedero y cupones",
};

export default function MonederoPage() {
  return (
    <ModuleGate module="monedero">
      <WalletCouponsManager />
    </ModuleGate>
  );
}
