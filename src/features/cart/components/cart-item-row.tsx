"use client";

import { ProductImage } from "@/components/product-image";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  MAX_QUANTITY,
  changeQuantity,
  removeFromCart,
  restoreCartItem,
} from "../services/cart-store";
import type { CartItem } from "../types";

type CartItemRowProps = {
  item: CartItem;
};

export function CartItemRow({ item }: CartItemRowProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      className="bg-card flex gap-3 rounded-2xl border p-3"
    >
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-xl">
        <ProductImage src={item.image} alt="" sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.name}</p>
            <p className="text-muted-foreground text-xs">{formatPrice(item.price)} c/u</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive -mt-1 -mr-1 size-11 shrink-0"
            onClick={() => {
              const snapshot = { ...item };
              removeFromCart(item.productId);
              toast(`Quitaste ${item.name} del pedido`, {
                action: {
                  label: "Deshacer",
                  onClick: () => restoreCartItem(snapshot),
                },
              });
            }}
            aria-label={`Quitar ${item.name} del carrito`}
          >
            <Trash className="size-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex items-center rounded-xl border"
            role="group"
            aria-label={`Cantidad de ${item.name}`}
          >
            <motion.div whileTap={{ scale: 0.85 }}>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-xl"
                onClick={() => changeQuantity(item.productId, -1)}
                aria-label={`Quitar una unidad de ${item.name}`}
              >
                <Minus className="size-4" />
              </Button>
            </motion.div>
            <div className="relative flex h-6 w-8 items-center justify-center overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={item.quantity}
                  initial={{ y: -12, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 12, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 450, damping: 24 }}
                  className="text-center text-sm font-bold tabular-nums"
                  aria-live="polite"
                >
                  {item.quantity}
                </motion.span>
              </AnimatePresence>
            </div>
            <motion.div whileTap={{ scale: 0.85 }}>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-xl"
                onClick={() => changeQuantity(item.productId, 1)}
                disabled={item.quantity >= MAX_QUANTITY}
                aria-label={`Sumar una unidad de ${item.name}`}
              >
                <Plus className="size-4" />
              </Button>
            </motion.div>
          </div>
          <p className="font-heading font-bold tabular-nums">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>
      </div>
    </motion.li>
  );
}
