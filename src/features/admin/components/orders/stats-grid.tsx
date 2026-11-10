"use client";

import { ClipboardList, Clock, Receipt, Wallet } from "lucide-react";
import { ACTIVE_STATUSES, type Order } from "@/features/orders";
import { formatPrice } from "@/lib/format";
import { StatCards, type Stat } from "../shared/stat-cards";

function computeStats(orders: Order[]): Stat[] {
  const valid = orders.filter((order) => order.status !== "cancelado");
  const revenue = valid.reduce((sum, order) => sum + order.total, 0);
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;

  return [
    {
      label: "Pedidos",
      value: String(orders.length),
      hint: "Recibidos en total",
      icon: ClipboardList,
    },
    { label: "En curso", value: String(active), hint: "Pendientes o en camino", icon: Clock },
    { label: "Facturación", value: formatPrice(revenue), hint: "Sin cancelados", icon: Wallet },
    {
      label: "Ticket promedio",
      value: formatPrice(valid.length ? Math.round(revenue / valid.length) : 0),
      hint: "Por pedido",
      icon: Receipt,
    },
  ];
}

type StatsGridProps = {
  orders: Order[];
};

export function StatsGrid({ orders }: StatsGridProps) {
  return <StatCards stats={computeStats(orders)} />;
}
