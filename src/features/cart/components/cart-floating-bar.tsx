"use client";

import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart, useCartOpen } from "../hooks/use-cart";
import { setCartOpen } from "../services/cart-store";

/** Acceso rápido al carrito en celulares. */
export function CartFloatingBar() {
  const { count, total } = useCart();
  const open = useCartOpen();
  const visible = count > 0 && !open;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-4 bottom-4 z-40 md:hidden"
        >
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="bg-primary text-primary-foreground shadow-primary/30 focus-visible:ring-ring/50 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-5 shadow-xl outline-none focus-visible:ring-4"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag aria-hidden="true" className="size-5" />
              Ver mi pedido ({count})
            </span>
            <span className="font-heading text-lg font-bold">{formatPrice(total)}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
