"use client";

import Link from "next/link";
import { Banknote, BarChart3, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useCommercial } from "@/features/commercial";
import { useOrders } from "@/features/orders";
import { formatCurrency } from "@/lib/format";
import { OrdersPanel } from "./orders-panel";
import { StatsGrid } from "./stats-grid";
import { StoreStatusCard } from "./store-status-card";

export function OrdersOverview() {
  const orders = useOrders();
  const { openSession, openSessionSummary } = useCommercial();

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Pedidos y comandas</h1>
          <p className="text-muted-foreground mt-1">
            Seguí las comandas web/WhatsApp, controlá si el local recibe pedidos y conectá con caja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl font-semibold"
            nativeButton={false}
            render={<Link href="/dashboard/resumen" />}
          >
            <BarChart3 className="size-4" />
            Resumen y análisis
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl font-semibold"
            nativeButton={false}
            render={<Link href="/dashboard/caja" />}
          >
            <Banknote className="size-4" />
            {openSession && openSessionSummary
              ? `Caja: ${formatCurrency(openSessionSummary.expectedCash)}`
              : "Abrir Caja"}
          </Button>
          <Button
            className="h-10 rounded-xl font-bold"
            nativeButton={false}
            render={<Link href="/dashboard/vender" />}
          >
            <ShoppingBag className="size-4" />
            Vender POS (F1)
          </Button>
        </div>
      </motion.div>

      <StoreStatusCard />
      <StatsGrid orders={orders} />

      <section aria-labelledby="orders-title" className="space-y-4">
        <h2 id="orders-title" className="text-lg font-bold">
          Últimos pedidos online y WhatsApp
        </h2>
        <OrdersPanel orders={orders} />
      </section>
    </div>
  );
}
