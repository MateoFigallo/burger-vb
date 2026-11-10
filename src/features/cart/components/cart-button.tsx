"use client";

import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../hooks/use-cart";
import { setCartOpen } from "../services/cart-store";

export function CartButton() {
  const { count } = useCart();

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative size-11 rounded-full"
      onClick={() => setCartOpen(true)}
      aria-label={count > 0 ? `Abrir carrito, ${count} productos` : "Abrir carrito"}
    >
      <ShoppingBag className="size-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            aria-hidden="true"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ring-2"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
