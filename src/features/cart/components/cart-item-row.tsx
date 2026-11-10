"use client";

import { ProductImage } from "@/components/product-image";
import { motion } from "motion/react";
import { Minus, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { MAX_QUANTITY, changeQuantity, removeFromCart } from "../services/cart-store";
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
            onClick={() => removeFromCart(item.productId)}
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
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-xl"
              onClick={() => changeQuantity(item.productId, -1)}
              aria-label={`Quitar una unidad de ${item.name}`}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
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
          </div>
          <p className="font-heading font-bold tabular-nums">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>
      </div>
    </motion.li>
  );
}
