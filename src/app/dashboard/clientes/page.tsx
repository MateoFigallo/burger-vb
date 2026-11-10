import type { Metadata } from "next";
import { CustomersManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Clientes",
};

export default function CustomersPage() {
  return (
    <ModuleGate module="clientes">
      <CustomersManager />
    </ModuleGate>
  );
}
