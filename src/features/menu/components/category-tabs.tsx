"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { CategoryFilter, CategoryOption } from "../types";

type CategoryTabsProps = {
  options: CategoryOption[];
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
};

export function CategoryTabs({ options, value, onChange }: CategoryTabsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar por categoría"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              "focus-visible:ring-ring/50 relative min-h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3",
              active
                ? "border-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="active-category"
                aria-hidden="true"
                className="bg-primary absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
