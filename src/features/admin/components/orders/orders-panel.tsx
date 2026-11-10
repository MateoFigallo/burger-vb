"use client";

import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DELIVERY_LABELS,
  ORDER_STATUSES,
  PAYMENT_LABELS,
  STATUS_LABELS,
  isOrderStatus,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/features/orders";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pendiente: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  preparando: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  enviado: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  entregado: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  cancelado: "bg-muted text-muted-foreground line-through",
};

type OrdersPanelProps = {
  orders: Order[];
};

export function OrdersPanel({ orders }: OrdersPanelProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
        <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
          <ClipboardList aria-hidden="true" className="size-7" />
        </span>
        <p className="text-lg font-bold">Todavía no hay pedidos</p>
        <p className="text-muted-foreground max-w-md text-sm">
          Cuando un cliente envíe un pedido por WhatsApp desde la tienda, va a aparecer acá para que
          puedas seguir su estado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="pr-5">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="pl-5 align-top">
                <p className="font-semibold">{order.id}</p>
                <p className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</p>
              </TableCell>
              <TableCell className="align-top">
                <p className="font-medium">{order.customerName}</p>
                {order.customerPhone && (
                  <p className="text-muted-foreground text-xs">{order.customerPhone}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {DELIVERY_LABELS[order.deliveryMethod]} · {PAYMENT_LABELS[order.paymentMethod]}
                </p>
                {order.address && (
                  <p className="text-muted-foreground max-w-56 truncate text-xs">{order.address}</p>
                )}
              </TableCell>
              <TableCell className="align-top">
                <ul className="space-y-0.5 text-sm">
                  {order.items.map((item) => (
                    <li key={item.productId}>
                      {item.quantity}x {item.name}
                    </li>
                  ))}
                </ul>
                {order.notes && (
                  <p className="text-muted-foreground mt-1 max-w-64 text-xs whitespace-normal italic">
                    “{order.notes}”
                  </p>
                )}
              </TableCell>
              <TableCell className="font-heading text-right align-top font-bold tabular-nums">
                {formatPrice(order.total)}
              </TableCell>
              <TableCell className="pr-5 align-top">
                <div className="flex flex-col items-start gap-2">
                  <Badge className={cn("h-6", STATUS_STYLES[order.status])}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  <Select
                    items={STATUS_LABELS}
                    value={order.status}
                    onValueChange={(value) => {
                      if (!isOrderStatus(value)) return;
                      const { stampAwardedTo } = updateOrderStatus(order.id, value);
                      if (stampAwardedTo) {
                        toast.success(`Sumaste un sello a ${stampAwardedTo}`);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="h-10! w-40"
                      aria-label={`Cambiar estado del pedido ${order.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
