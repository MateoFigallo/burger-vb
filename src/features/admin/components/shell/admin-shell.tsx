"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Gift,
  Megaphone,
  Package,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PANEL_GROUPS, PANEL_MODULES, type ModuleId } from "@/config/panel";
import { canUseModule, useSession } from "@/features/auth";
import { ACTIVE_STATUSES, useOrders } from "@/features/orders";
import { cn } from "@/lib/utils";
import { AdminTopbar } from "./admin-topbar";

const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  pedidos: ClipboardList,
  productos: Package,
  clientes: Users,
  campanas: Megaphone,
  sellos: Gift,
  equipo: UserCog,
};

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const { viewer } = useSession();
  const orders = useOrders();
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;

  const groups = PANEL_GROUPS.map((group) => ({
    ...group,
    modules: group.modules.filter((module) => canUseModule(viewer, module)),
  })).filter((group) => group.modules.length > 0);

  return (
    <div className="bg-muted/30 min-h-svh">
      <AdminTopbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8">
        <nav aria-label="Secciones del panel" className="lg:w-60 lg:shrink-0">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-6 lg:overflow-visible lg:px-0">
            {groups.map((group) => (
              <div key={group.label} className="flex shrink-0 gap-2 lg:flex-col lg:gap-1">
                <p className="text-muted-foreground hidden px-4 pb-1 text-xs font-semibold tracking-wider uppercase lg:block">
                  {group.label}
                </p>
                <ul className="flex gap-2 lg:flex-col lg:gap-1">
                  {group.modules.map((module) => {
                    const { href, label } = PANEL_MODULES[module];
                    const Icon = MODULE_ICONS[module];
                    const active = pathname === href;
                    return (
                      <li key={module} className="shrink-0">
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "focus-visible:ring-ring/50 flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                            active
                              ? "bg-primary text-primary-foreground shadow-primary/20 shadow-md"
                              : "text-muted-foreground hover:bg-background hover:text-foreground",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-5" />
                          {label}
                          {module === "pedidos" && activeOrders > 0 && (
                            <span
                              className={cn(
                                "ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]",
                                active
                                  ? "bg-primary-foreground text-primary"
                                  : "bg-primary text-primary-foreground",
                              )}
                            >
                              <span className="sr-only">Pedidos en curso: </span>
                              {activeOrders}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
