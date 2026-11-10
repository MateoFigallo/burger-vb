"use client";

import { useMemo } from "react";
import { useLocalStore } from "@/lib/use-local-store";
import { cartOpenStore, cartStore } from "../services/cart-store";
import type { CartItem } from "../types";

type CartSummary = {
  items: CartItem[];
  count: number;
  total: number;
};

export function useCart(): CartSummary {
  const items = useLocalStore(cartStore);

  return useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [items],
  );
}

export function useCartOpen(): boolean {
  return useLocalStore(cartOpenStore);
}
