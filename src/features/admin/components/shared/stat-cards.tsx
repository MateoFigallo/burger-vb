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

/** Cuadros de datos generales, responsivos y sin solapamiento de texto en móvil. */
export function StatCards({ stats }: StatCardsProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {stats.map(({ label, value, hint, icon: Icon }, index) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.25 }}
          className="bg-card min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-muted-foreground min-w-0 text-sm font-medium break-words">
              {label}
            </p>
            <span className="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-xl">
              <Icon aria-hidden="true" className="size-5" />
            </span>
          </div>
          <p className="font-heading mt-3 text-2xl font-extrabold break-words tabular-nums sm:text-3xl">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 text-xs break-words">{hint}</p>
        </motion.li>
      ))}
    </ul>
  );
}
