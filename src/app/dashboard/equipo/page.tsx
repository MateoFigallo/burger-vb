import type { Metadata } from "next";
import { TeamManager } from "@/features/admin";
import { ModuleGate } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Empleados",
};

export default function TeamPage() {
  return (
    <ModuleGate module="equipo">
      <TeamManager />
    </ModuleGate>
  );
}
