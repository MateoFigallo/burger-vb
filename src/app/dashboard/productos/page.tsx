import type { Metadata } from "next";
import { ProductsManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Productos",
};

export default function ProductsPage() {
  return (
    <ModuleGate module="productos">
      <ProductsManager />
    </ModuleGate>
  );
}
