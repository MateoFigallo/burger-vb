"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  PackageX,
  RefreshCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LOGISTICS_MODULES, PANEL_MODULES, type LogisticsSectionId } from "@/config/panel";
import { canUseModule, useSession } from "@/features/auth";
import { cn } from "@/lib/utils";
import { useLogisticsBadges } from "../hooks/use-logistics";

const SECTION_ICONS: Record<LogisticsSectionId, LucideIcon> = {
  inventario: Boxes,
  mermas: PackageX,
  presupuestos: FileSpreadsheet,
  proveedores: Truck,
};

export function LogisticsNav() {
  const pathname = usePathname();
  const { viewer } = useSession();
  const badges = useLogisticsBadges();

  const visibleModules = LOGISTICS_MODULES.filter((id) => canUseModule(viewer, id));
  if (visibleModules.length <= 1) return null;

  function getBadgeInfo(id: LogisticsSectionId): {
    count: number;
    tone: "danger" | "warning" | "neutral";
    label: string;
  } | null {
    if (id === "inventario" && badges.lowStockCount > 0) {
      return {
        count: badges.lowStockCount,
        tone: badges.negativeStockCount > 0 ? "danger" : "warning",
        label: `${badges.lowStockCount} artículo(s) con stock bajo`,
      };
    }
    if (id === "mermas" && badges.recentShrinkagesCount > 0) {
      return {
        count: badges.recentShrinkagesCount,
        tone: "neutral",
        label: `${badges.recentShrinkagesCount} merma(s) en los últimos 30 días`,
      };
    }
    if (id === "presupuestos" && badges.activeQuotesCount > 0) {
      return {
        count: badges.activeQuotesCount,
        tone: badges.expiringQuotesCount > 0 ? "warning" : "neutral",
        label: `${badges.activeQuotesCount} presupuesto(s) vigente(s)`,
      };
    }
    if (id === "proveedores" && badges.pendingPurchaseOrdersCount > 0) {
      return {
        count: badges.pendingPurchaseOrdersCount,
        tone: "warning",
        label: `${badges.pendingPurchaseOrdersCount} orden(es) de compra pendiente(s)`,
      };
    }
    return null;
  }

  return (
    <nav
      aria-label="Apartados de Logística e inventario"
      className="bg-card/80 flex gap-1.5 overflow-x-auto rounded-2xl border p-1.5 shadow-xs backdrop-blur-sm"
    >
      {visibleModules.map((id) => {
        const mod = PANEL_MODULES[id];
        const Icon = SECTION_ICONS[id];
        const active = pathname === mod.href;
        const badge = getBadgeInfo(id);

        return (
          <Link
            key={id}
            href={mod.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 relative flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="logistics-subnav-pill"
                aria-hidden="true"
                className="bg-accent/80 border-primary/20 absolute inset-0 rounded-xl border shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon
                aria-hidden="true"
                className={cn("size-4", active ? "text-primary" : "text-muted-foreground")}
              />
              <span>{mod.label}</span>
              {badge && (
                <span
                  title={badge.label}
                  aria-label={badge.label}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    badge.tone === "danger" &&
                      "bg-red-500/15 text-red-600 dark:bg-red-500/25 dark:text-red-300",
                    badge.tone === "warning" &&
                      "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300",
                    badge.tone === "neutral" && "bg-foreground/10 text-foreground/80",
                  )}
                >
                  {badge.count}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LogisticsLoadingSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando módulo de logística">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="bg-card space-y-4 rounded-2xl border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-11 w-48" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

type LogisticsErrorStateProps = {
  title?: string;
  description: string;
  onRetry: () => void;
};

export function LogisticsErrorState({
  title = "No se pudo completar la operación",
  description,
  onRetry,
}: LogisticsErrorStateProps) {
  return (
    <div
      role="alert"
      className="bg-card flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 px-6 py-12 text-center shadow-xs"
    >
      <span className="grid size-12 place-items-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-base font-bold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button variant="outline" className="mt-1 h-11 rounded-xl" onClick={onRetry}>
        <RefreshCcw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
