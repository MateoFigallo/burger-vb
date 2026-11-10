import type { Metadata } from "next";
import { AccountPage } from "@/features/account";
import { CustomerGuard } from "@/features/auth";

/** Depende de la sesión del navegador, así que no se valida como navegación instantánea. */
export const instant = false;

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default function MyAccountPage() {
  return (
    <CustomerGuard>
      <AccountPage />
    </CustomerGuard>
  );
}
