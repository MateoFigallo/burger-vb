"use client";

import { Cake, Gift, MessageCircle, Pencil, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/features/customers";
import { formatBirthday, formatRelativeDays, isBirthdayThisMonth } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type CustomersTableProps = {
  customers: Customer[];
  stampsRequired: number;
  now: Date;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRedeem: (customer: Customer) => void;
};

export function CustomersTable({
  customers,
  stampsRequired,
  now,
  onEdit,
  onDelete,
  onRedeem,
}: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <p className="text-muted-foreground px-5 py-12 text-center text-sm">
        No hay clientes que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Cliente</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Cumpleaños</TableHead>
          <TableHead>Pedidos</TableHead>
          <TableHead>Sellos</TableHead>
          <TableHead>App</TableHead>
          <TableHead className="pr-5 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => {
          const birthdayNow = isBirthdayThisMonth(customer.birthday, now);
          const canRedeem = customer.stamps >= stampsRequired;
          const progress = Math.min(100, (customer.stamps / stampsRequired) * 100);

          return (
            <TableRow key={customer.id}>
              <TableCell className="pl-5">
                <p className="font-semibold">{customer.name}</p>
                <p className="text-muted-foreground max-w-56 truncate text-xs">
                  {customer.email || customer.notes || "Sin email"}
                </p>
              </TableCell>
              <TableCell>
                <a
                  href={getWhatsAppUrl(customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm tabular-nums outline-none focus-visible:ring-3"
                  aria-label={`Escribirle a ${customer.name} por WhatsApp`}
                >
                  <MessageCircle aria-hidden="true" className="text-whatsapp size-4" />
                  {customer.phone}
                </a>
              </TableCell>
              <TableCell>
                {customer.birthday ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm",
                      birthdayNow && "text-brand font-semibold",
                    )}
                  >
                    {birthdayNow && <Cake aria-hidden="true" className="size-4" />}
                    {formatBirthday(customer.birthday)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium tabular-nums">
                  {customer.totalOrders} · {formatPrice(customer.totalSpent)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {customer.lastOrderAt
                    ? `Último ${formatRelativeDays(customer.lastOrderAt, now)}`
                    : "Sin pedidos"}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="bg-muted h-2 w-16 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={stampsRequired}
                    aria-valuenow={Math.min(customer.stamps, stampsRequired)}
                    aria-label={`Sellos de ${customer.name}`}
                  >
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {customer.stamps}/{stampsRequired}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {customer.account ? (
                  <Badge variant="secondary" className="h-6">
                    @{customer.account.username}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Sin acceso</span>
                )}
              </TableCell>
              <TableCell className="pr-5 text-right">
                <div className="flex justify-end">
                  {canRedeem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-brand size-11"
                      aria-label={`Canjear premio de ${customer.name}`}
                      onClick={() => onRedeem(customer)}
                    >
                      <Gift className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Editar ${customer.name}`}
                    onClick={() => onEdit(customer)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive size-11"
                    aria-label={`Eliminar ${customer.name}`}
                    onClick={() => onDelete(customer)}
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
