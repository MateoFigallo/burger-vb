import { recordDeliveredOrder } from "@/features/customers";
import { createLocalStore } from "@/lib/local-store";
import type { NewOrder, Order, OrderStatus } from "../types";

/**
 * Los pedidos se guardan en este navegador. Para compartirlos entre dispositivos,
 * reemplazá este servicio por una API o base de datos sin tocar la UI.
 */
export const ordersStore = createLocalStore<Order[]>("burger-vb:orders", []);

function createOrderId(): string {
  return `VB-${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

export function createOrder(newOrder: NewOrder): Order {
  const order: Order = {
    ...newOrder,
    id: createOrderId(),
    createdAt: new Date().toISOString(),
    status: "pendiente",
  };
  ordersStore.set((orders) => [order, ...orders]);
  return order;
}

export type StatusChangeResult = { stampAwardedTo: string | null };

/**
 * Cambia el estado de un pedido. La primera vez que se marca como entregado,
 * suma un sello al cliente (y lo crea si todavía no existe).
 */
export function updateOrderStatus(orderId: string, status: OrderStatus): StatusChangeResult {
  const order = ordersStore.getSnapshot().find((item) => item.id === orderId);
  if (!order) return { stampAwardedTo: null };

  let customerId = order.customerId ?? null;
  let stampAwarded = order.stampAwarded ?? false;
  let stampAwardedTo: string | null = null;

  if (status === "entregado" && !stampAwarded) {
    customerId = recordDeliveredOrder({
      customerId,
      name: order.customerName,
      phone: order.customerPhone ?? "",
      total: order.total,
      deliveredAt: new Date().toISOString(),
    });
    stampAwarded = true;
    stampAwardedTo = order.customerName;
  }

  ordersStore.set((orders) =>
    orders.map((item) =>
      item.id === orderId ? { ...item, status, customerId, stampAwarded } : item,
    ),
  );
  return { stampAwardedTo };
}
