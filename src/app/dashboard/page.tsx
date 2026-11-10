import type { Metadata } from "next";
import { OrdersOverview } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Pedidos",
};

export default function OrdersPage() {
  return (
    <ModuleGate module="pedidos">
      <OrdersOverview />
    </ModuleGate>
  );
}
