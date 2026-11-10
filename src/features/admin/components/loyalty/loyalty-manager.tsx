"use client";

import { useState } from "react";
import { Award, Gift, Minus, Plus, Stamp, Trash, Users } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
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
import { useCustomers, type Customer } from "@/features/customers";
import {
  MAX_STAMPS,
  MIN_STAMPS,
  StampCard,
  addReward,
  removeReward,
  setStampsRequired,
  useLoyaltySettings,
  useRedemptions,
} from "@/features/loyalty";
import { useCatalog } from "@/features/menu";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "../shared/page-header";
import { StatCards, type Stat } from "../shared/stat-cards";
import { RedeemDialog } from "./redeem-dialog";

export function LoyaltyManager() {
  const { stampsRequired, rewards } = useLoyaltySettings();
  const redemptions = useRedemptions();
  const customers = useCustomers();
  const { products } = useCatalog();
  const [productToAdd, setProductToAdd] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<Customer | null>(null);

  const ready = customers
    .filter((customer) => customer.stamps >= stampsRequired)
    .sort((a, b) => b.stamps - a.stamps);
  const totalRedeemed = customers.reduce((sum, customer) => sum + customer.redeemedCount, 0);

  const stats: Stat[] = [
    {
      label: "Sellos por premio",
      value: String(stampsRequired),
      hint: "Un sello por pedido entregado",
      icon: Stamp,
    },
    {
      label: "Con sellos",
      value: String(customers.filter((customer) => customer.stamps > 0).length),
      hint: "Clientes sumando en su tarjeta",
      icon: Users,
    },
    {
      label: "Listos para canjear",
      value: String(ready.length),
      hint: "Completaron la tarjeta",
      icon: Gift,
    },
    {
      label: "Premios canjeados",
      value: String(totalRedeemed),
      hint: "En total",
      icon: Award,
    },
  ];

  const availableProducts = products.filter(
    (product) => !rewards.some((reward) => reward.productId === product.id),
  );
  const productItems = Object.fromEntries(
    availableProducts.map((product) => [product.id, product.name]),
  );
  const selectedProduct = availableProducts.find((product) => product.id === productToAdd) ?? null;

  function handleAddReward() {
    if (!selectedProduct) return;
    if (addReward(selectedProduct)) {
      toast.success(`${selectedProduct.name} ya se puede canjear con sellos`);
      setProductToAdd(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sellos y premios"
        description="Cada pedido entregado suma un sello. Al completar la tarjeta, el cliente elige un premio."
      />

      <StatCards stats={stats} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="stamp-settings"
          className="bg-card space-y-5 rounded-2xl border p-5 shadow-sm"
        >
          <div>
            <h2 id="stamp-settings" className="text-lg font-bold">
              Tarjeta de sellos
            </h2>
            <p className="text-muted-foreground text-sm">Así la ven tus clientes en la app.</p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <span id="stamps-required-label" className="text-sm font-medium">
              Sellos para un premio
            </span>
            <div role="group" aria-labelledby="stamps-required-label" className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-xl"
                aria-label="Un sello menos"
                disabled={stampsRequired <= MIN_STAMPS}
                onClick={() => setStampsRequired(stampsRequired - 1)}
              >
                <Minus className="size-4" />
              </Button>
              <span
                className="font-heading w-12 text-center text-2xl font-extrabold tabular-nums"
                aria-live="polite"
              >
                {stampsRequired}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-xl"
                aria-label="Un sello más"
                disabled={stampsRequired >= MAX_STAMPS}
                onClick={() => setStampsRequired(stampsRequired + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="bg-accent/50 rounded-2xl p-4">
            <StampCard
              stamps={Math.ceil(stampsRequired * 0.6)}
              stampsRequired={stampsRequired}
              size="sm"
            />
            <p className="text-muted-foreground mt-3 text-center text-xs">
              Ejemplo con {Math.ceil(stampsRequired * 0.6)} sellos
            </p>
          </div>
        </section>

        <section aria-labelledby="rewards-title" className="bg-card rounded-2xl border shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 id="rewards-title" className="text-lg font-bold">
              Premios para canjear
            </h2>
            <p className="text-muted-foreground text-sm">
              Productos que el cliente puede elegir al completar la tarjeta.
            </p>
          </div>
          {rewards.length === 0 ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">
              Agregá al menos un premio.
            </p>
          ) : (
            <ul className="divide-y">
              {rewards.map((reward) => (
                <li key={reward.id} className="flex items-center gap-3 px-5 py-2">
                  <span className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage src={reward.image} alt="" sizes="44px" />
                  </span>
                  <span className="flex-1 font-medium">{reward.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive size-11"
                    aria-label={`Quitar ${reward.name} de los premios`}
                    onClick={() => removeReward(reward.id)}
                  >
                    <Trash className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 border-t px-5 py-4">
            <Select
              items={productItems}
              value={selectedProduct?.id ?? null}
              onValueChange={(value) => setProductToAdd(typeof value === "string" ? value : null)}
            >
              <SelectTrigger
                className="h-11! w-full"
                aria-label="Producto para agregar como premio"
              >
                <SelectValue placeholder="Elegí un producto" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-11 shrink-0 rounded-xl"
              disabled={!selectedProduct}
              onClick={handleAddReward}
            >
              <Plus aria-hidden="true" className="size-4" />
              Agregar
            </Button>
          </div>
        </section>
      </div>

      <section aria-labelledby="ready-title" className="bg-card rounded-2xl border shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 id="ready-title" className="text-lg font-bold">
            Listos para canjear
          </h2>
        </div>
        {ready.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">
            Ningún cliente completó la tarjeta todavía.
          </p>
        ) : (
          <ul className="divide-y">
            {ready.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between gap-3 px-5 py-2">
                <div>
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {customer.stamps} sellos · {customer.phone}
                  </p>
                </div>
                <Button className="h-11 rounded-xl" onClick={() => setRedeeming(customer)}>
                  <Gift aria-hidden="true" className="size-4" />
                  Canjear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-title" className="bg-card rounded-2xl border shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 id="history-title" className="text-lg font-bold">
            Historial de canjes
          </h2>
        </div>
        {redemptions.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">
            Los canjes que hagas van a aparecer acá.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Premio</TableHead>
                <TableHead className="pr-5">Lo hizo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell className="text-muted-foreground pl-5">
                    {formatDateTime(redemption.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{redemption.customerName}</TableCell>
                  <TableCell>{redemption.rewardName}</TableCell>
                  <TableCell className="text-muted-foreground pr-5">
                    {redemption.redeemedBy}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <RedeemDialog customer={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} />
    </div>
  );
}
