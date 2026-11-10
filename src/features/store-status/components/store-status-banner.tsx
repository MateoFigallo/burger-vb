"use client";

import { AnimatePresence, motion } from "motion/react";
import { Store } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useStoreStatus } from "../hooks/use-store-status";

export function StoreStatusBanner() {
  const { isOpen } = useStoreStatus();

  return (
    <AnimatePresence initial={false}>
      {!isOpen && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-primary text-primary-foreground overflow-hidden"
        >
          <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-medium sm:px-6">
            <Store aria-hidden="true" className="size-4 shrink-0" />
            Ahora estamos cerrados. Te esperamos {siteConfig.hours.toLowerCase()}.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
