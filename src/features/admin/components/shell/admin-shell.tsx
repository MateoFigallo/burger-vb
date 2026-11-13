"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  ChevronDown,
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
import { Logo } from "@/components/layout/logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { AdminTopbar } from "./admin-topbar";

type ModuleVisual = {
  icon: LucideIcon;
  tone: string;
};

const MODULE_VISUALS: Record<ModuleId, ModuleVisual> = {
  vender: { icon: ShoppingBag, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  resumen: { icon: BarChart3, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  pedidos: { icon: ClipboardList, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  caja: { icon: Calculator, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  inventario: { icon: Boxes, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  mermas: { icon: PackageX, tone: "bg-red-500/15 text-red-600 dark:text-red-400" },
  presupuestos: { icon: FileSpreadsheet, tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
  proveedores: { icon: Truck, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  clientes: { icon: Users, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  sellos: { icon: Gift, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  monedero: { icon: Wallet, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  campanas: { icon: Megaphone, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  equipo: { icon: UserCog, tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
  productos: { icon: Package, tone: "bg-lime-600/15 text-lime-700 dark:text-lime-400" },
  web: { icon: Globe, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  sistema: { icon: Settings, tone: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Todos los apartados comienzan desplegados y pueden contraerse/desplegarse individualmente.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  }

  function renderDrawerContent(onNavigate?: () => void) {
    return (
      <div className="flex flex-col gap-3">
        {canSellPos && (
          <Link
            href={venderModule.href}
            onClick={onNavigate}
            aria-current={isVenderActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-12 items-center gap-3 rounded-2xl border px-3.5 text-sm font-extrabold outline-none focus-visible:ring-3",
              isVenderActive
                ? "bg-primary text-primary-foreground border-primary shadow-primary/25 shadow-md"
                : "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl",
                isVenderActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground",
              )}
            >
              <ShoppingBag aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">{venderModule.label}</span>
            <kbd
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold",
                isVenderActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/15 text-primary",
              )}
            >
              F1
            </kbd>
          </Link>
        )}

        <div className="space-y-1.5">
          {groups.map((group) => {
            const hasActiveModule = group.modules.some(
              (module) => PANEL_MODULES[module].href === pathname,
            );
            // Si el usuario contrajo el grupo manualmente, respetamos su elección salvo que no haya sido tocado
            const isCollapsed = collapsedGroups[group.label] ?? false;

            return (
              <section
                key={group.label}
                aria-label={group.label}
                className="bg-card/60 rounded-2xl border p-1.5"
              >
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleGroup(group.label)}
                  className="hover:bg-muted/70 focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold tracking-wider uppercase outline-none focus-visible:ring-3"
                >
                  <span className={cn("truncate", hasActiveModule ? "text-primary" : "text-muted-foreground")}>
                    {group.label}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>

                {!isCollapsed && (
                  <ul className="mt-1 space-y-1">
                    {group.modules.map((module) => {
                      const { href, label } = PANEL_MODULES[module];
                      const visual = MODULE_VISUALS[module];
                      const Icon = visual.icon;
                      const active = pathname === href;

                      return (
                        <li key={module}>
                          <Link
                            href={href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "focus-visible:ring-ring/50 flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold outline-none focus-visible:ring-3",
                              active
                                ? "bg-primary text-primary-foreground shadow-primary/20 shadow-sm"
                                : "text-foreground/85 hover:bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-xl",
                                active ? "bg-primary-foreground/20 text-primary-foreground" : visual.tone,
                              )}
                            >
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{label}</span>

                            {module === "pedidos" && activeOrders > 0 && (
                              <span
                                className={cn(
                                  "grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                                  active
                                    ? "bg-primary-foreground text-primary"
                                    : "bg-primary text-primary-foreground",
                                )}
                              >
                                {activeOrders}
                              </span>
                            )}

                            {module === "caja" && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
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
                                  "grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
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
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-svh">
      <AdminTopbar
        onOpenDrawer={() => setDrawerOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Navigation Drawer móvil */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-xs gap-0 p-0">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center">
              <Logo href="/dashboard" />
            </SheetTitle>
            <SheetDescription className="sr-only">
              Menú de navegación de módulos del panel
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            {renderDrawerContent(() => setDrawerOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn(PAGE_CONTAINER, "flex flex-col gap-5 py-5 lg:flex-row lg:gap-6 lg:py-6")}>
        {/* Navigation Drawer persistente en escritorio (plegable para ganar espacio) */}
        {!sidebarCollapsed && (
          <aside aria-label="Secciones del panel" className="hidden lg:block lg:w-72 lg:shrink-0">
            <div className="bg-background/90 sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto rounded-3xl border p-3 shadow-xs backdrop-blur">
              {renderDrawerContent()}
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
