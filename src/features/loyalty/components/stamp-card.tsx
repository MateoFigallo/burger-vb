"use client";

import { motion } from "motion/react";
import { Check, Hamburger } from "lucide-react";
import { cn } from "@/lib/utils";

type StampCardProps = {
  stamps: number;
  stampsRequired: number;
  size?: "sm" | "lg";
};

/** Tarjeta de sellos: un círculo por sello, los ganados se marcan. */
export function StampCard({ stamps, stampsRequired, size = "lg" }: StampCardProps) {
  const filled = Math.min(stamps, stampsRequired);

  return (
    <ol
      aria-label={`${filled} de ${stampsRequired} sellos`}
      className={cn("grid max-w-sm grid-cols-5 gap-2", size === "lg" && "max-w-md gap-3")}
    >
      {Array.from({ length: stampsRequired }, (_, index) => {
        const earned = index < filled;
        const isLast = index === stampsRequired - 1;
        return (
          <motion.li
            key={index}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "grid aspect-square place-items-center rounded-full border-2 border-dashed",
              earned
                ? "bg-primary text-primary-foreground shadow-primary/30 border-transparent shadow-md"
                : "border-primary/30 text-primary/40",
            )}
          >
            <span className="sr-only">
              Sello {index + 1}: {earned ? "ganado" : "pendiente"}
            </span>
            {earned ? (
              <Check aria-hidden="true" className={size === "lg" ? "size-6" : "size-4"} />
            ) : isLast ? (
              <Hamburger aria-hidden="true" className={size === "lg" ? "size-6" : "size-4"} />
            ) : (
              <span aria-hidden="true" className="text-xs font-bold">
                {index + 1}
              </span>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
