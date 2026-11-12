"use client";

import { useState } from "react";
import {
  Award,
  Ban,
  Gift,
  Plus,
  Printer,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers } from "@/features/customers";
import {
  createDiscountCoupon,
  createGiftCard,
  deleteCoupon,
  getCustomerWalletBalance,
  getGiftCardStatus,
  loadCustomerWallet,
  toggleCouponActive,
  updateLoyaltySettings,
  useDiscountCoupons,
  useGiftCards,
  useLoyaltySettings,
  useWalletMovements,
  voidGiftCard,
} from "@/features/loyalty";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { PageHeader } from "../shared/page-header";
import { SectionTabs, type SectionTab } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";

type WalletTabId = "monedero" | "giftcards" | "cupones";

export function WalletCouponsManager() {
  const customers = useCustomers();
  const settings = useLoyaltySettings();
  const walletMovements = useWalletMovements();
  const giftCards = useGiftCards();
  const coupons = useDiscountCoupons();

  const isHydrated = useIsClient();
  const [nowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<WalletTabId>("monedero");

  // Formulario de recarga de monedero
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [walletAmountInput, setWalletAmountInput] = useState<string>("15000");
  const [walletMethod, setWalletMethod] = useState<string>("transferencia");
  const [walletRefInput, setWalletRefInput] = useState<string>("");

  // Formulario de emisión de Gift Card
  const [gcHolder, setGcHolder] = useState("");
  const [gcBuyer, setGcBuyer] = useState("");
  const [gcAmount, setGcAmount] = useState("25000");
  const [gcMethod, setGcMethod] = useState("transferencia");
  const [gcMessage, setGcMessage] = useState("¡Vale por unas buenas smash burgers en Burger VB! 🍔");
  const [gcCustomerId, setGcCustomerId] = useState<string>("portador");

  // Formulario de nuevo Cupón
  const [couponCode, setCouponCode] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [couponType, setCouponType] = useState<"porcentaje" | "monto_fijo">("porcentaje");
  const [couponValue, setCouponValue] = useState("15");
  const [couponMinOrder, setCouponMinOrder] = useState("18000");
  const [couponMaxUses, setCouponMaxUses] = useState("50");
  const [couponExpires, setCouponExpires] = useState("2026-12-31");

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const customersWithBalance = customers
    .map((c) => ({ customer: c, balance: getCustomerWalletBalance(c.id) }))
    .filter((row) => row.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalWalletBalance = customersWithBalance.reduce((acc, r) => acc + r.balance, 0);
  const totalCashbackGiven = walletMovements
    .filter((m) => m.kind === "cashback")
    .reduce((acc, m) => acc + m.amount, 0);

  const activeGiftCards = giftCards.filter((g) => getGiftCardStatus(g, nowMs) === "activa");
  const totalGiftCardsBalance = activeGiftCards.reduce((acc, g) => acc + g.balance, 0);

  const stats: Stat[] = [
    {
      label: "Saldo en Monederos Club",
      value: formatCurrency(totalWalletBalance),
      hint: `${customersWithBalance.length} clientes con saldo a favor`,
      icon: Wallet,
    },
    {
      label: "Gift Cards activas",
      value: formatCurrency(totalGiftCardsBalance),
      hint: `${activeGiftCards.length} tarjetas vigentes para canjear`,
      icon: Gift,
    },
    {
      label: "Cashback acreditado",
      value: formatCurrency(totalCashbackGiven),
      hint: `Reintegro ${settings.cashbackPct}% pagando con monedero`,
      icon: Sparkles,
    },
    {
      label: "Cupones activos",
      value: String(coupons.filter((c) => c.active).length),
      hint: `${coupons.reduce((acc, c) => acc + c.usedCount, 0)} canjes acumulados`,
      icon: Tag,
    },
  ];

  const tabs: SectionTab<WalletTabId>[] = [
    {
      value: "monedero",
      label: "Monedero digital y Cashback",
      count: customersWithBalance.length,
    },
    { value: "giftcards", label: "Gift Cards y Vouchers", count: giftCards.length },
    { value: "cupones", label: "Cupones de descuento", count: coupons.length },
  ];

  const customerSelectItems = Object.fromEntries(
    customers.map((c) => [c.id, `${c.name} (${c.phone || "sin tel."})`]),
  );

  const gcCustomerItems: Record<string, string> = {
    portador: "Al portador (la usa quien presente el código)",
    ...customerSelectItems,
  };

  function handleLoadWallet(e: React.FormEvent) {
    e.preventDefault();
    const targetId = selectedCustomerId || customers[0]?.id || "";
    const res = loadCustomerWallet({
      customerId: targetId,
      amount: Number(walletAmountInput) || 0,
      paymentMethod: walletMethod,
      reference: walletRefInput,
      user: "Encargado",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Se acreditaron ${formatCurrency(res.movement.amount)} en el monedero de ${res.movement.customerName}`,
    );
    setWalletRefInput("");
  }

  function handleCreateGiftCard(e: React.FormEvent) {
    e.preventDefault();
    const res = createGiftCard({
      customerId: gcCustomerId === "portador" ? null : gcCustomerId,
      holderName: gcHolder,
      buyerName: gcBuyer,
      message: gcMessage,
      amount: Number(gcAmount) || 0,
      paymentMethod: gcMethod,
      createdBy: "Encargado",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Gift Card ${res.giftCard.code} emitida por ${formatCurrency(res.giftCard.initialAmount)}`);
    setGcHolder("");
    setGcBuyer("");
  }

  function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = createDiscountCoupon({
      code: couponCode,
      description: couponDesc,
      type: couponType,
      value: Number(couponValue) || 0,
      minOrderAmount: Number(couponMinOrder) || 0,
      maxUses: Number(couponMaxUses) || 1,
      expiresAt: couponExpires,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Cupón ${res.coupon.code} creado y listo para Vender POS`);
    setCouponCode("");
    setCouponDesc("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monedero digital, Gift Cards y cupones"
        description="Fidelización avanzada para tu hamburguesería: saldo prepago con cashback, vouchers de regalo y códigos promocionales."
      />

      <StatCards stats={stats} />

      <SectionTabs
        id="wallet-tabs"
        label="Secciones de monedero y promociones"
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* =====================================================================
          PESTAÑA 1: MONEDERO DIGITAL Y CASHBACK
         ===================================================================== */}
      {activeTab === "monedero" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Cargar saldo a cliente */}
            <form
              onSubmit={handleLoadWallet}
              className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
            >
              <div>
                <h2 className="text-base font-extrabold">Cargar saldo en Monedero Club</h2>
                <p className="text-muted-foreground text-xs">
                  El cliente deja saldo prepago a su favor y lo consume desde Vender POS con el
                  botón Monedero (F6).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold">Cliente titular</label>
                <Select
                  items={customerSelectItems}
                  value={selectedCustomerId || customers[0]?.id || ""}
                  onValueChange={(v) => typeof v === "string" && setSelectedCustomerId(v)}
                >
                  <SelectTrigger className="mt-1 h-10! w-full text-xs">
                    <SelectValue placeholder="Elegí un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone || "sin tel."})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Importe a cargar ($)</label>
                  <Input
                    type="number"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Medio de pago</label>
                  <Select
                    items={{
                      transferencia: "Transferencia",
                      efectivo: "Efectivo",
                      mercadopago: "Mercado Pago / QR",
                      debito: "Tarjeta de débito",
                    }}
                    value={walletMethod}
                    onValueChange={(v) => typeof v === "string" && setWalletMethod(v)}
                  >
                    <SelectTrigger className="mt-1 h-10! w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="mercadopago">Mercado Pago / QR</SelectItem>
                      <SelectItem value="debito">Tarjeta de débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Nota / Comprobante (opcional)</label>
                <Input
                  value={walletRefInput}
                  onChange={(e) => setWalletRefInput(e.target.value)}
                  placeholder="Ej. Promo recarga semana de la hamburguesa"
                  className="mt-1 h-10"
                />
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                <Plus className="size-4" />
                Acreditar saldo en monedero
              </Button>
            </form>

            {/* Configuración de Cashback y Clientes con Saldo */}
            <div className="space-y-6 lg:col-span-7">
              <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold">
                      Cashback automático · Club Burger
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Cuando el cliente paga con su Monedero en Vender POS, recibe un porcentaje de
                      vuelta al instante.
                    </p>
                  </div>
                  <Switch
                    checked={settings.cashbackEnabled}
                    onCheckedChange={(checked) => {
                      updateLoyaltySettings({ cashbackEnabled: checked });
                      toast.success(
                        checked ? "Cashback del Club activado" : "Cashback desactivado",
                      );
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-40">
                    <label className="text-xs font-semibold">Porcentaje de reintegro (%)</label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.cashbackPct}
                      onChange={(e) =>
                        updateLoyaltySettings({
                          cashbackPct: Math.min(50, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="mt-1 h-9"
                    />
                  </div>
                  <p className="text-muted-foreground pt-4 text-xs">
                    Se acredita automáticamente en el libro mayor del monedero después de cada
                    compra pagada con saldo.
                  </p>
                </div>
              </section>

              <section className="bg-card rounded-2xl border shadow-sm">
                <div className="border-b px-5 py-4">
                  <h3 className="text-base font-extrabold">Clientes con saldo disponible</h3>
                </div>
                {customersWithBalance.length === 0 ? (
                  <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                    Ningún cliente tiene saldo cargado actualmente.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-5">Cliente</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="pr-5 text-right">Saldo disponible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersWithBalance.map(({ customer, balance }) => (
                        <TableRow key={customer.id}>
                          <TableCell className="pl-5 font-semibold">{customer.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {customer.phone}
                          </TableCell>
                          <TableCell className="pr-5 text-right font-extrabold text-emerald-600 tabular-nums">
                            {formatCurrency(balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </div>
          </div>

          {/* Historial inmutable de movimientos de monedero */}
          <section className="bg-card rounded-2xl border shadow-sm">
            <div className="border-b px-5 py-4">
              <h3 className="text-base font-extrabold">
                Libro mayor de movimientos de Monedero
              </h3>
              <p className="text-muted-foreground text-xs">
                Registro auditable de recargas, pagos en POS y reintegros por cashback.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="pr-5 text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {walletMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground pl-5 text-xs">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">{m.customerName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.kind === "carga" || m.kind === "cashback" ? "secondary" : "outline"
                        }
                      >
                        {m.kind.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.reference}</TableCell>
                    <TableCell
                      className={`pr-5 text-right font-bold tabular-nums ${
                        m.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {m.amount >= 0 ? "+" : ""}
                      {formatCurrency(m.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: GIFT CARDS Y VOUCHERS
         ===================================================================== */}
      {activeTab === "giftcards" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateGiftCard}
            className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
          >
            <div>
              <h2 className="text-base font-extrabold">Emitir nueva Gift Card / Voucher</h2>
              <p className="text-muted-foreground text-xs">
                Generá un código único canjeable total o parcialmente en Vender POS.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Valor de la tarjeta ($)</label>
                <Input
                  type="number"
                  value={gcAmount}
                  onChange={(e) => setGcAmount(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Medio de cobro</label>
                <Select
                  items={{
                    transferencia: "Transferencia",
                    efectivo: "Efectivo",
                    mercadopago: "Mercado Pago",
                    credito: "Tarjeta de crédito",
                  }}
                  value={gcMethod}
                  onValueChange={(v) => typeof v === "string" && setGcMethod(v)}
                >
                  <SelectTrigger className="mt-1 h-10! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="credito">Tarjeta de crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Modalidad de titularidad</label>
              <Select
                items={gcCustomerItems}
                value={gcCustomerId}
                onValueChange={(v) => typeof v === "string" && setGcCustomerId(v)}
              >
                <SelectTrigger className="mt-1 h-10! w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portador">
                    Al portador (la usa quien presente el código)
                  </SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Nominativa: {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Para (Agasajado)</label>
                <Input
                  value={gcHolder}
                  onChange={(e) => setGcHolder(e.target.value)}
                  placeholder="Ej. Gonzalo Rivas"
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">De parte de</label>
                <Input
                  value={gcBuyer}
                  onChange={(e) => setGcBuyer(e.target.value)}
                  placeholder="Ej. Sofía"
                  className="mt-1 h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Dedicatoria impresa</label>
              <Input
                value={gcMessage}
                onChange={(e) => setGcMessage(e.target.value)}
                className="mt-1 h-10"
              />
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl font-bold">
              <Gift className="size-4" />
              Emitir Gift Card
            </Button>
          </form>

          <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-7">
            <div>
              <h2 className="text-base font-extrabold">Tarjetas emitidas y saldos</h2>
              <p className="text-muted-foreground text-xs">
                Copiá el código o imprimí el voucher de regalo para entregar al cliente.
              </p>
            </div>

            <div className="grid gap-3">
              {giftCards.map((card) => {
                const status = getGiftCardStatus(card, nowMs);
                return (
                  <div
                    key={card.id}
                    className="bg-muted/20 flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-primary/15 text-primary rounded-lg px-2.5 py-1 font-mono text-sm font-extrabold">
                          {card.code}
                        </code>
                        <Badge
                          variant={
                            status === "activa"
                              ? "secondary"
                              : status === "agotada"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {status.toUpperCase()}
                        </Badge>
                        {card.customerName && (
                          <Badge variant="outline">Nominativa: {card.customerName}</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold">
                        Para: {card.holderName}
                        {card.buyerName ? ` · De: ${card.buyerName}` : ""}
                      </p>
                      {card.message && (
                        <p className="text-muted-foreground text-xs italic">“{card.message}”</p>
                      )}
                      <p className="text-muted-foreground text-[11px]">
                        Vence: {formatDate(card.expiresAt)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-extrabold tabular-nums">
                          {formatCurrency(card.balance)}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Valor original: {formatCurrency(card.initialAmount)}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => window.print()}
                        >
                          <Printer className="size-3.5" />
                          Imprimir
                        </Button>
                        {status === "activa" && card.balance === card.initialAmount && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-8 rounded-lg text-xs"
                            onClick={() => {
                              if (voidGiftCard(card.id, "Anulada desde panel")) {
                                toast.success(`Gift Card ${card.code} anulada`);
                              }
                            }}
                          >
                            <Ban className="size-3.5" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: CUPONES DE DESCUENTO
         ===================================================================== */}
      {activeTab === "cupones" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
          >
            <div>
              <h2 className="text-base font-extrabold">Crear cupón promocional</h2>
              <p className="text-muted-foreground text-xs">
                Compite automáticamente bajo la Regla de Oro (se aplica el mayor beneficio en POS).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold">Código del cupón</label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Ej. DOBLEBURGER20"
                className="mt-1 h-10 uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Descripción de la promo</label>
              <Input
                value={couponDesc}
                onChange={(e) => setCouponDesc(e.target.value)}
                placeholder="Ej. 20% OFF en combos dobles los jueves"
                className="mt-1 h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Tipo de descuento</label>
                <Select
                  items={{
                    porcentaje: "Porcentaje (%)",
                    monto_fijo: "Monto fijo ($)",
                  }}
                  value={couponType}
                  onValueChange={(v) =>
                    setCouponType((v as "porcentaje" | "monto_fijo") ?? "porcentaje")
                  }
                >
                  <SelectTrigger className="mt-1 h-10! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="monto_fijo">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">
                  Valor ({couponType === "porcentaje" ? "%" : "$"})
                </label>
                <Input
                  type="number"
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold">Compra mín. ($)</label>
                <Input
                  type="number"
                  value={couponMinOrder}
                  onChange={(e) => setCouponMinOrder(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Usos máx.</label>
                <Input
                  type="number"
                  value={couponMaxUses}
                  onChange={(e) => setCouponMaxUses(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Vence</label>
                <Input
                  type="date"
                  value={couponExpires}
                  onChange={(e) => setCouponExpires(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl font-bold">
              <Award className="size-4" />
              Guardar cupón
            </Button>
          </form>

          <section className="bg-card rounded-2xl border shadow-sm lg:col-span-7">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-extrabold">Catálogo de cupones vigentes</h2>
              <p className="text-muted-foreground text-xs">
                Usalos en Vender POS con el atajo F10 o compartilos en tus Campañas WhatsApp.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Código</TableHead>
                  <TableHead>Beneficio</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="pr-5 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((cup) => (
                  <TableRow key={cup.id}>
                    <TableCell className="pl-5">
                      <code className="bg-muted rounded px-2 py-0.5 font-mono text-xs font-bold">
                        {cup.code}
                      </code>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {cup.description}
                      </p>
                    </TableCell>
                    <TableCell className="font-bold">
                      {cup.type === "porcentaje"
                        ? `${cup.value}% OFF`
                        : `-${formatCurrency(cup.value)}`}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatCurrency(cup.minOrderAmount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {cup.usedCount}/{cup.maxUses}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cup.active}
                        onCheckedChange={(checked) => toggleCouponActive(cup.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-8"
                        aria-label={`Eliminar cupón ${cup.code}`}
                        onClick={() => {
                          deleteCoupon(cup.id);
                          toast.success(`Cupón ${cup.code} eliminado`);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
    </div>
  );
}
