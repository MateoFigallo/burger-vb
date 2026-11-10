import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/features/admin";
import { PanelGuard } from "@/features/auth";

/** El panel depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <PanelGuard>
      <AdminShell>{children}</AdminShell>
    </PanelGuard>
  );
}
