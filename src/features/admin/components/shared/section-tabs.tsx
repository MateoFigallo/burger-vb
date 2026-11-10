"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type SectionTab<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
};

type SectionTabsProps<T extends string> = {
  /** Identificador único para la animación del indicador. */
  id: string;
  label: string;
  tabs: SectionTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Botones para cambiar entre vistas de una sección del panel. */
export function SectionTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
}: SectionTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="bg-muted inline-flex w-full gap-1 rounded-2xl p-1 sm:w-auto"
    >
      {tabs.map(({ value: tabValue, label: tabLabel, icon: Icon, count }) => {
        const active = tabValue === value;
        return (
          <button
            key={tabValue}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tabValue)}
            className={cn(
              "focus-visible:ring-ring/50 relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 sm:flex-none",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`section-tab-${id}`}
                aria-hidden="true"
                className="bg-background absolute inset-0 rounded-xl shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {Icon && <Icon aria-hidden="true" className="size-4" />}
              {tabLabel}
              {count !== undefined && (
                <span className="bg-foreground/10 rounded-full px-2 py-0.5 text-xs tabular-nums">
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
