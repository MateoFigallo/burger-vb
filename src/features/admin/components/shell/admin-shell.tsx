"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  Gift,
  Globe,
  Megaphone,
  Package,
  PackageX,
  Settings,
  ShoppingBag,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  PANEL_GROUPS,
  PANEL_MODULES,
  type LogisticsSectionId,
  type ModuleId,
} from "@/config/panel";
import { canUseModule, useSession } from "@/features/auth";
import { useCommercial } from "@/features/commercial";
import { useLogisticsBadges } from "@/features/logistics";
import { ACTIVE_STATUSES, useOrders } from "@/features/orders";
import { cn } from "@/lib/utils";
import { AdminTopbar } from "./admin-topbar";

const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  vender: ShoppingBag,
  resumen: BarChart3,
  pedidos: ClipboardList,
  caja: Calculator,
  productos: Package,
  web: Globe,
  inventario: Boxes,
  mermas: PackageX,
  presupuestos: FileSpreadsheet,
  proveedores: Truck,
  clientes: Users,
  sellos: Gift,
  monedero: Wallet,
  campanas: Megaphone,
  equipo: UserCog,
  sistema: Settings,
};

function isLogisticsModule(module: ModuleId): module is LogisticsSectionId {
  return (
    module === "inventario" ||
    module === "mermas" ||
    module === "presupuestos" ||
    module === "proveedores"
  );
}

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { viewer } = useSession();
  const orders = useOrders();
  const { openSession } = useCommercial();
  const logisticsBadges = useLogisticsBadges();
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;
  const canSellPos = canUseModule(viewer, "vender");

  useEffect(() => {
    function handleGlobalF1(e: KeyboardEvent) {
      if (e.key === "F1" && canSellPos && pathname !== "/dashboard/vender") {
        e.preventDefault();
        router.push("/dashboard/vender");
      }
    }
    window.addEventListener("keydown", handleGlobalF1);
    return () => window.removeEventListener("keydown", handleGlobalF1);
  }, [canSellPos, pathname, router]);

  function getLogisticsModuleCount(module: LogisticsSectionId): number {
    if (module === "inventario") return logisticsBadges.lowStockCount;
    if (module === "mermas") return logisticsBadges.recentShrinkagesCount;
    if (module === "presupuestos") return logisticsBadges.activeQuotesCount;
    return logisticsBadges.pendingPurchaseOrdersCount;
  }

  const groups = PANEL_GROUPS.map((group) => ({
    ...group,
    modules: group.modules.filter((module) => canUseModule(viewer, module)),
  })).filter((group) => group.modules.length > 0);

  const venderModule = PANEL_MODULES.vender;
  const isVenderActive = pathname === venderModule.href;

  return (
    <div className="bg-muted/30 min-h-svh">
      <AdminTopbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:py-8">
        <nav aria-label="Secciones del panel" className="lg:w-64 lg:shrink-0">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-5 lg:overflow-visible lg:px-0">
            {/* Botón destacado superior: Vender POS (F1) al estilo raveV2 */}
            {canSellPos && (
              <div className="shrink-0">
                <Link
                  href={venderModule.href}
                  aria-current={isVenderActive ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring/50 flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-extrabold whitespace-nowrap transition-all outline-none focus-visible:ring-3",
                    isVenderActive
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/25 shadow-lg"
                      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-xs",
                  )}
                >
                  <ShoppingBag aria-hidden="true" className="size-5 shrink-0" />
                  <span>{venderModule.label}</span>
                  <kbd
                    className={cn(
                      "ml-auto rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold",
                      isVenderActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/20 text-primary",
                    )}
                  >
                    F1
                  </kbd>
                </Link>
              </div>
            )}

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
                          <Icon aria-hidden="true" className="size-5 shrink-0" />
                          <span className="truncate">{label}</span>
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
                          {module === "caja" && (
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                                active
                                  ? "bg-primary-foreground text-primary"
                                  : openSession
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                              )}
                            >
                              {openSession ? "Abierta" : "Cerrada"}
                            </span>
                          )}
                          {isLogisticsModule(module) && getLogisticsModuleCount(module) > 0 && (
                            <span
                              className={cn(
                                "ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]",
                                active
                                  ? "bg-primary-foreground text-primary"
                                  : "bg-foreground/10 text-foreground",
                              )}
                            >
                              {getLogisticsModuleCount(module)}
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
