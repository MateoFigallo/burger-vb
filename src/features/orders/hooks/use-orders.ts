"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { ordersStore } from "../services/orders-store";
import type { Order } from "../types";

export function useOrders(): Order[] {
  return useLocalStore(ordersStore);
}
