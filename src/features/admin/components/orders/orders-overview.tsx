"use client";

import { motion } from "motion/react";
import { useOrders } from "@/features/orders";
import { OrdersPanel } from "./orders-panel";
import { StatsGrid } from "./stats-grid";
import { StoreStatusCard } from "./store-status-card";

export function OrdersOverview() {
  const orders = useOrders();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground mt-1">
          Seguí los pedidos y controlá si el local recibe pedidos.
        </p>
      </motion.div>

      <StoreStatusCard />
      <StatsGrid orders={orders} />

      <section aria-labelledby="orders-title" className="space-y-4">
        <h2 id="orders-title" className="text-lg font-bold">
          Últimos pedidos
        </h2>
        <OrdersPanel orders={orders} />
      </section>
    </div>
  );
}
