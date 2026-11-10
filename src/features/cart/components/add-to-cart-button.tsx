"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCart, setCartOpen } from "../services/cart-store";
import type { CartProductInput } from "../types";

type AddToCartButtonProps = {
  product: CartProductInput;
  disabled?: boolean;
};

export function AddToCartButton({ product, disabled = false }: AddToCartButtonProps) {
  const [justAdded, setJustAdded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  function handleClick() {
    addToCart(product);
    setJustAdded(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setJustAdded(false), 1400);

    toast.success(`Sumaste ${product.name} a tu pedido`, {
      action: { label: "Ver carrito", onClick: () => setCartOpen(true) },
    });
  }

  if (disabled) {
    return (
      <Button size="lg" variant="secondary" className="h-11 w-full rounded-xl" disabled>
        Agotado
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="h-11 w-full overflow-hidden rounded-xl text-sm font-semibold"
      onClick={handleClick}
      aria-label={`Agregar ${product.name} al carrito`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={justAdded ? "added" : "add"}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex items-center gap-2"
        >
          {justAdded ? (
            <>
              <Check aria-hidden="true" className="size-4" /> Agregado
            </>
          ) : (
            <>
              <Plus aria-hidden="true" className="size-4" /> Agregar
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
