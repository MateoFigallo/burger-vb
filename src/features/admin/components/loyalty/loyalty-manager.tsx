"use client";

import { useState } from "react";
import {
  Award,
  Cake,
  Crown,
  Gift,
  MessageCircle,
  Minus,
  Plus,
  Stamp,
  Trash,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessConfig } from "@/config/business.config";
import { useCustomers, type Customer } from "@/features/customers";
import {
  MAX_STAMPS,
  MIN_STAMPS,
  StampCard,
  addReward,
  getCustomerTier,
  removeReward,
  setStampsRequired,
  updateLoyaltySettings,
  useLoyaltySettings,
  useRedemptions,
} from "@/features/loyalty";
import { useCatalog } from "@/features/menu";
import { isBirthdayThisMonth } from "@/lib/dates";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { normalizePhone } from "@/lib/ids";
import { PageHeader } from "../shared/page-header";
import { SectionTabs, type SectionTab } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";
import { RedeemDialog } from "./redeem-dialog";

type ClubTabId = "sellos" | "niveles";

export function LoyaltyManager() {
  const settings = useLoyaltySettings();
  const { stampsRequired, rewards } = settings;
  const redemptions = useRedemptions();
  const customers = useCustomers();
  const { products } = useCatalog();

  const [now] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<ClubTabId>("sellos");
  const [productToAdd, setProductToAdd] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<Customer | null>(null);

  const ready = customers
    .filter((customer) => customer.stamps >= stampsRequired)
    .sort((a, b) => b.stamps - a.stamps);
  const totalRedeemed = customers.reduce((sum, customer) => sum + customer.redeemedCount, 0);
  const birthdayCustomers = customers.filter((c) => isBirthdayThisMonth(c.birthday, now));

  const stats: Stat[] = [
    {
      label: "Sellos por premio",
      value: String(stampsRequired),
      hint: "Un sello por pedido o compra POS",
      icon: Stamp,
    },
    {
      label: "Listos para canjear",
      value: String(ready.length),
      hint: "Completaron la tarjeta",
      icon: Gift,
    },
    {
      label: "Socios Oro / Plata",
      value: String(
        customers.filter((c) => {
          const k = getCustomerTier(c).current.key;
          return k === "oro" || k === "plata";
        }).length,
      ),
      hint: "Con descuento VIP automático en caja",
      icon: Crown,
    },
    {
      label: "Premios canjeados",
      value: String(totalRedeemed),
      hint: `${birthdayCustomers.length} cumplen años este mes`,
      icon: Award,
    },
  ];

  const tabs: SectionTab<ClubTabId>[] = [
    { value: "sellos", label: "Tarjeta de sellos y premios", count: ready.length },
    {
      value: "niveles",
      label: "Niveles VIP y cumpleaños",
      count: birthdayCustomers.length,
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

  function handleTierChange(index: number, field: "minSpend" | "discountPct", rawValue: string) {
    const num = Math.max(0, Math.round(Number(rawValue) || 0));
    const updated = settings.tiers.map((t, i) =>
      i === index
        ? {
            ...t,
            [field]: field === "discountPct" ? Math.min(50, num) : num,
          }
        : t,
    );
    updateLoyaltySettings({ tiers: updated });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Club Burger · Sellos, niveles VIP y cumpleaños"
        description="Fidelizá a tus clientes con tarjeta de sellos, niveles por consumo (Bronce, Plata, Oro) y beneficio de cumpleaños."
      />

      <StatCards stats={stats} />

      <SectionTabs
        id="club-tabs"
        label="Secciones del Club Burger"
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "sellos" && (
        <div className="space-y-6">
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
                <div
                  role="group"
                  aria-labelledby="stamps-required-label"
                  className="flex items-center"
                >
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

            <section
              aria-labelledby="rewards-title"
              className="bg-card rounded-2xl border shadow-sm"
            >
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
                  onValueChange={(value) =>
                    setProductToAdd(typeof value === "string" ? value : null)
                  }
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
                  <li
                    key={customer.id}
                    className="flex items-center justify-between gap-3 px-5 py-2"
                  >
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
        </div>
      )}

      {activeTab === "niveles" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Niveles Bronce / Plata / Oro */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold">
                    Niveles del Club por consumo acumulado
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Al seleccionar al cliente en Vender POS, su nivel aplica el descuento
                    automáticamente (Regla de Oro: gana el mayor beneficio).
                  </p>
                </div>
                <Switch
                  checked={settings.tiersEnabled}
                  onCheckedChange={(checked) => {
                    updateLoyaltySettings({ tiersEnabled: checked });
                    toast.success(
                      checked ? "Niveles del Club activados" : "Niveles desactivados",
                    );
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {settings.tiers.map((tier, idx) => {
                  const countInTier = customers.filter(
                    (c) => getCustomerTier(c).current.key === tier.key,
                  ).length;
                  return (
                    <div key={tier.key} className="bg-muted/20 space-y-3 rounded-2xl border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold">
                          {tier.badge} {tier.name}
                        </span>
                        <Badge variant="secondary">
                          <Users className="mr-1 size-3" /> {countInTier}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-[11px] font-semibold">
                          Consumo desde ($)
                        </label>
                        <Input
                          type="number"
                          disabled={idx === 0}
                          value={tier.minSpend}
                          onChange={(e) => handleTierChange(idx, "minSpend", e.target.value)}
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground text-[11px] font-semibold">
                          Descuento automático (%)
                        </label>
                        <Input
                          type="number"
                          value={tier.discountPct}
                          onChange={(e) => handleTierChange(idx, "discountPct", e.target.value)}
                          className="mt-1 h-9 text-xs font-bold"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Beneficio de Cumpleaños */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cake className="text-primary size-5" />
                  <div>
                    <h2 className="text-base font-extrabold">Beneficio de cumpleaños</h2>
                    <p className="text-muted-foreground text-xs">
                      Descuento especial durante el mes de su cumpleaños.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.birthdayEnabled}
                  onCheckedChange={(checked) => {
                    updateLoyaltySettings({ birthdayEnabled: checked });
                    toast.success(
                      checked
                        ? "Regalo de cumpleaños activado"
                        : "Regalo de cumpleaños desactivado",
                    );
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Regalo de cumpleaños (% OFF)</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.birthdayDiscountPct}
                  onChange={(e) =>
                    updateLoyaltySettings({
                      birthdayDiscountPct: Math.min(50, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="mt-1 h-10"
                />
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase">
                  Socios que cumplen años este mes ({birthdayCustomers.length})
                </p>
                {birthdayCustomers.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Ningún cliente registrado cumple años este mes.
                  </p>
                ) : (
                  <div className="divide-y rounded-xl border">
                    {birthdayCustomers.map((c) => {
                      const digits = normalizePhone(c.phone);
                      const msg = `¡Feliz cumple ${c.name.split(" ")[0]}! 🎂🍔 En ${businessConfig.site.name} tenés un ${settings.birthdayDiscountPct}% OFF especial para festejar con tus burgers favoritas.`;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-bold">{c.name}</p>
                            <p className="text-muted-foreground">
                              Cumple: {c.birthday} · Gastó {formatCurrency(c.totalSpent)}
                            </p>
                          </div>
                          {digits && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              nativeButton={false}
                              render={
                                <a
                                  href={`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <MessageCircle className="size-3.5" />
                              Saludar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      <RedeemDialog customer={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} />
    </div>
  );
}
