"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

export type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

type StatCardsProps = {
  stats: Stat[];
};

/** Cuadros de datos generales, con el mismo diseño en todas las secciones. */
export function StatCards({ stats }: StatCardsProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon }, index) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07, duration: 0.4 }}
          className="bg-card rounded-2xl border p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-xl">
              <Icon aria-hidden="true" className="size-5" />
            </span>
          </div>
          <p className="font-heading mt-3 text-3xl font-extrabold tabular-nums">{value}</p>
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        </motion.li>
      ))}
    </ul>
  );
}
