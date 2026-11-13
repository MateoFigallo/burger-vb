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

/** Botones para cambiar entre vistas de una sección del panel, con scroll horizontal limpio en móvil. */
export function SectionTabs<T extends string>({
  id,
  label,
  tabs,
  value,
  onChange,
}: SectionTabsProps<T>) {
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
      <div
        role="tablist"
        aria-label={label}
        className="bg-muted inline-flex min-w-full gap-1 rounded-2xl p-1 sm:min-w-0 sm:w-auto"
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
                "focus-visible:ring-ring/50 relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap outline-none focus-visible:ring-3 sm:px-4 sm:text-sm",
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
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                <span>{tabLabel}</span>
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
    </div>
  );
}
