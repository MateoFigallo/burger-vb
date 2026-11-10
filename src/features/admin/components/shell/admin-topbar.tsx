"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getPanelHome } from "@/config/panel";
import { signOut, useSession } from "@/features/auth";

export function AdminTopbar() {
  const router = useRouter();
  const { viewer } = useSession();
  const staff = viewer && viewer.kind !== "customer" ? viewer : null;

  function handleSignOut() {
    signOut();
    toast.success("Cerraste sesión");
    router.push("/");
  }

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href={staff ? (getPanelHome(staff.modules) ?? "/dashboard") : "/dashboard"} />
        <div className="flex items-center gap-1 sm:gap-2">
          {staff && (
            <div className="mr-2 hidden text-right leading-tight md:block">
              <p className="text-sm font-semibold">{staff.name}</p>
              <p className="text-muted-foreground text-xs">{staff.roleName}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="h-11 rounded-full px-3"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Ver sitio</span>
            <span className="sr-only sm:hidden">Ver sitio</span>
          </Button>
          <ThemeToggle />
          <Button variant="outline" className="h-11 rounded-full px-4" onClick={handleSignOut}>
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
