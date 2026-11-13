"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getPanelHome } from "@/config/panel";
import { signOut, useSession } from "@/features/auth";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";

type AdminTopbarProps = {
  onOpenDrawer?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function AdminTopbar({
  onOpenDrawer,
  sidebarCollapsed = false,
  onToggleSidebar,
}: AdminTopbarProps) {
  const router = useRouter();
  const { viewer } = useSession();
  const staff = viewer && viewer.kind !== "customer" ? viewer : null;

  function handleSignOut() {
    signOut();
    toast.success("Cerraste sesión");
    router.push("/");
  }

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className={cn(PAGE_CONTAINER, "flex h-16 items-center justify-between gap-2 sm:gap-3")}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onOpenDrawer && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenDrawer}
              aria-label="Abrir menú de módulos"
              className="size-10 shrink-0 rounded-xl lg:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          )}
          {onToggleSidebar && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleSidebar}
              aria-label={sidebarCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
              title={sidebarCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
              className="hidden size-10 shrink-0 rounded-xl lg:inline-flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen aria-hidden="true" className="size-5" />
              ) : (
                <PanelLeftClose aria-hidden="true" className="size-5" />
              )}
            </Button>
          )}
          <Logo href={staff ? (getPanelHome(staff.modules) ?? "/dashboard") : "/dashboard"} />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {staff && (
            <div className="mr-2 hidden text-right leading-tight md:block">
              <p className="text-sm font-semibold">{staff.name}</p>
              <p className="text-muted-foreground text-xs">{staff.roleName}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="h-10 rounded-full px-2.5 sm:h-11 sm:px-3"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Ver sitio</span>
            <span className="sr-only sm:hidden">Ver sitio</span>
          </Button>
          <ThemeToggle />
          <Button
            variant="outline"
            className="h-10 rounded-full px-3 sm:h-11 sm:px-4"
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
