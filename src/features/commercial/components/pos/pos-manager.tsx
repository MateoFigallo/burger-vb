"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  FileText,
  Gift,
  Minus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  Wallet,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { businessConfig } from "@/config/business.config";
import {
  getCustomerCreditLimit,
  getCustomerDebt,
  useCustomers,
} from "@/features/customers";
import { useLogistics } from "@/features/logistics";
import {
  evaluateBestBenefit,
  findGiftCardByCode,
  getCustomerTier,
  getCustomerWalletBalance,
  getGiftCardStatus,
  useDiscountCoupons,
} from "@/features/loyalty";
import { getFinalPrice } from "@/features/menu";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { useCommercial } from "../../hooks/use-commercial";
import {
  commitPosSale,
  openCashSession,
  voidPosSale,
} from "../../services/commercial-store";
import type { PosPaymentMethod, PosPaymentSplit, PosSale, PosSaleLine } from "../../types";

const PAYMENT_METHOD_LABELS = businessConfig.commercial.posPaymentMethods;

type CartLine = {
  productId: string;
  quantity: number;
};

export function PosManager() {
  const { state, openSession, openSessionSummary } = useCommercial();
  const { items: inventoryItems, categories } = useLogistics();
  const customers = useCustomers();
  const coupons = useDiscountCoupons();

  const isHydrated = useIsClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("todas");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("consumidor_final");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [primaryMethod, setPrimaryMethod] = useState<PosPaymentMethod>("efectivo");
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [secondaryMethod, setSecondaryMethod] = useState<PosPaymentMethod>("mercadopago");
  const [primarySplitAmount, setPrimarySplitAmount] = useState<string>("");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");
  const [giftCardCode, setGiftCardCode] = useState<string>("");
  const [arcaEnabled, setArcaEnabled] = useState<boolean>(false);
  const [arcaCbteTipo, setArcaCbteTipo] = useState<"Ticket B" | "Factura A" | "Factura B">(
    "Ticket B",
  );
  const [arcaDocNumber, setArcaDocNumber] = useState<string>("");
  const [lastCompletedSale, setLastCompletedSale] = useState<PosSale | null>(null);
  const [quickOpenCashAmount, setQuickOpenCashAmount] = useState<string>("45000");
  const [voidTarget, setVoidTarget] = useState<PosSale | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const couponInputRef = useRef<HTMLInputElement | null>(null);

  const activeProducts = useMemo(
    () => inventoryItems.filter((item) => !item.archived && item.available),
    [inventoryItems],
  );

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("es");
    return activeProducts.filter((item) => {
      if (selectedCategoryId !== "todas" && item.categoryId !== selectedCategoryId) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLocaleLowerCase("es").includes(q) ||
        item.barcode.toLocaleLowerCase("es").includes(q) ||
        item.plu.toLocaleLowerCase("es").includes(q) ||
        item.categoryName.toLocaleLowerCase("es").includes(q)
      );
    });
  }, [activeProducts, searchQuery, selectedCategoryId]);

  const selectedCustomer = useMemo(
    () =>
      selectedCustomerId !== "consumidor_final"
        ? (customers.find((c) => c.id === selectedCustomerId) ?? null)
        : null,
    [customers, selectedCustomerId],
  );

  const customerTier = useMemo(
    () => (selectedCustomer ? getCustomerTier(selectedCustomer) : null),
    [selectedCustomer],
  );

  const customerWalletBalance = useMemo(
    () => (selectedCustomer ? getCustomerWalletBalance(selectedCustomer.id) : 0),
    [selectedCustomer],
  );

  const customerDebt = useMemo(
    () => (selectedCustomer ? getCustomerDebt(selectedCustomer.id) : 0),
    [selectedCustomer],
  );

  const customerCreditLimit = useMemo(
    () => (selectedCustomer ? getCustomerCreditLimit(selectedCustomer) : 0),
    [selectedCustomer],
  );

  const saleLines: PosSaleLine[] = useMemo(() => {
    return cart
      .map((entry) => {
        const item = inventoryItems.find((p) => p.id === entry.productId);
        if (!item) return null;
        const unitPrice = getFinalPrice(item);
        return {
          productId: item.id,
          name: item.name,
          quantity: entry.quantity,
          unitPrice,
          unitCost: item.effectiveCost,
          subtotal: Math.round(unitPrice * entry.quantity),
        };
      })
      .filter((line): line is PosSaleLine => line !== null);
  }, [cart, inventoryItems]);

  const subtotal = useMemo(
    () => saleLines.reduce((acc, line) => acc + line.subtotal, 0),
    [saleLines],
  );

  const benefit = useMemo(
    () =>
      evaluateBestBenefit({
        subtotal,
        customer: selectedCustomer,
        couponCode: appliedCoupon,
      }),
    [subtotal, selectedCustomer, appliedCoupon],
  );

  const total = Math.max(0, subtotal - benefit.discountAmount);

  function addProductToTicket(productId: string) {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }

  function updateLineQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function clearTicket() {
    setCart([]);
    setAppliedCoupon("");
    setCouponInput("");
    setCashReceivedInput("");
    setPrimarySplitAmount("");
    setIsMixedPayment(false);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const code = searchQuery.trim();
    if (!code) return;
    const exactMatch = activeProducts.find(
      (item) =>
        item.barcode === code ||
        item.plu.toLocaleLowerCase("es") === code.toLocaleLowerCase("es"),
    );
    if (exactMatch) {
      e.preventDefault();
      addProductToTicket(exactMatch.id);
      setSearchQuery("");
      toast.success(`Agregado: ${exactMatch.name}`);
    } else if (visibleProducts.length === 1) {
      e.preventDefault();
      addProductToTicket(visibleProducts[0].id);
      setSearchQuery("");
      toast.success(`Agregado: ${visibleProducts[0].name}`);
    }
  }

  function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon("");
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) {
      toast.error("Cupón inválido o inactivo.");
      return;
    }
    if (found.usedCount >= found.maxUses) {
      toast.error("Este cupón alcanzó su límite máximo de usos.");
      return;
    }
    setAppliedCoupon(found.code);
    toast.success(`Cupón ${found.code} evaluado en el ticket.`);
  }

  function buildPaymentSplits(): PosPaymentSplit[] {
    if (!isMixedPayment) {
      return [{ method: primaryMethod, amount: total }];
    }
    const firstAmt = Math.min(total, Math.max(0, Math.round(Number(primarySplitAmount) || 0)));
    const secondAmt = Math.max(0, total - firstAmt);
    const splits: PosPaymentSplit[] = [];
    if (firstAmt > 0) splits.push({ method: primaryMethod, amount: firstAmt });
    if (secondAmt > 0) splits.push({ method: secondaryMethod, amount: secondAmt });
    return splits;
  }

  function handleCheckout() {
    const splits = buildPaymentSplits();
    const cashSplit = splits.find((s) => s.method === "efectivo");
    const parsedCashReceived = Number(cashReceivedInput) || 0;
    const cashReceived =
      cashSplit && parsedCashReceived >= cashSplit.amount
        ? parsedCashReceived
        : (cashSplit?.amount ?? 0);

    const result = commitPosSale({
      customerId: selectedCustomer?.id ?? null,
      customerName: selectedCustomer?.name ?? "Consumidor Final",
      lines: saleLines,
      discountAmount: benefit.discountAmount,
      discountLabel: benefit.label,
      couponCode: benefit.kind === "cupon" ? benefit.couponCode : undefined,
      payments: splits,
      cashReceived,
      giftCardCode: giftCardCode.trim() || undefined,
      arcaEnabled,
      arcaCbteTipo,
      arcaDocNumber: arcaDocNumber.trim() || selectedCustomer?.taxId || "Consumidor Final",
      cashier: "Mostrador POS",
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setLastCompletedSale(result.value);
    clearTicket();
    toast.success(
      `Venta ${result.value.ticketNumber} cobrada (${formatCurrency(result.value.total)})`,
    );
  }

  function triggerFunctionKey(action: string) {
    switch (action) {
      case "efectivo":
      case "debito":
      case "credito":
      case "fiado":
      case "mercadopago":
      case "monedero":
        setPrimaryMethod(action);
        toast.info(`Medio de pago: ${PAYMENT_METHOD_LABELS[action]}`);
        break;
      case "clear":
        clearTicket();
        toast.info("Ticket limpiado");
        break;
      case "arca":
        setArcaEnabled((prev) => !prev);
        break;
      case "FocusSearch":
        searchInputRef.current?.focus();
        break;
      case "coupon":
        couponInputRef.current?.focus();
        break;
      case "checkout":
        handleCheckout();
        break;
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const fKey = businessConfig.commercial.functionKeys.find((fk) => fk.key === e.key);
      if (!fKey) return;
      e.preventDefault();
      triggerFunctionKey(fKey.action);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-[560px] rounded-2xl lg:col-span-7" />
          <Skeleton className="h-[560px] rounded-2xl lg:col-span-5" />
        </div>
      </div>
    );
  }

  const customerItems: Record<string, string> = {
    consumidor_final: "Consumidor Final (Mostrador)",
    ...Object.fromEntries(
      customers.map((c) => [c.id, `${c.name} (${c.phone || "sin tel."})`]),
    ),
  };

  const paymentItems: Record<PosPaymentMethod, string> = PAYMENT_METHOD_LABELS;

  const splits = buildPaymentSplits();
  const cashSplitAmount = splits.find((s) => s.method === "efectivo")?.amount ?? 0;
  const parsedCash = Number(cashReceivedInput) || 0;
  const calculatedChange =
    cashSplitAmount > 0 && parsedCash > cashSplitAmount ? parsedCash - cashSplitAmount : 0;

  const usesGiftCard = splits.some((s) => s.method === "giftcard");
  const matchedGiftCard =
    usesGiftCard && giftCardCode.trim() ? findGiftCardByCode(giftCardCode) : undefined;

  const shiftSales = state.sales
    .filter((s) => (openSession ? s.sessionId === openSession.id : true))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Cabecera de estado de Caja y Barra de Teclas de Función F1–F12 */}
      <div className="bg-card space-y-3 rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/15 text-primary grid size-10 place-items-center rounded-xl">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Vender POS · Mostrador Burger VB
              </h1>
              <p className="text-muted-foreground text-xs">
                Atajos rápidos de teclado F1–F12, descuento automático de stock y beneficios del
                Club.
              </p>
            </div>
          </div>

          {openSession ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                <span className="size-2 rounded-full bg-emerald-500" />
                {openSession.registerName} · Turno #{openSession.number}
              </Badge>
              {openSessionSummary && (
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                  Efectivo en caja: {formatCurrency(openSessionSummary.expectedCash)}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                nativeButton={false}
                render={<Link href="/dashboard/caja" />}
              >
                Ir a Caja / Arqueo
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Caja cerrada: abrí turno para cobrar
              </span>
              <Input
                type="number"
                value={quickOpenCashAmount}
                onChange={(e) => setQuickOpenCashAmount(e.target.value)}
                className="h-8 w-28 text-xs"
                aria-label="Fondo inicial de caja"
              />
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => {
                  const res = openCashSession({
                    openingAmount: Number(quickOpenCashAmount) || 0,
                    user: "Encargado",
                  });
                  if (res.ok) {
                    toast.success(`Turno #${res.value.number} abierto correctamente`);
                  } else {
                    toast.error(res.error);
                  }
                }}
              >
                Abrir caja ahora
              </Button>
            </div>
          )}
        </div>

        {/* Barra interactiva F1–F12 */}
        <div
          role="toolbar"
          aria-label="Teclas rápidas de punto de venta"
          className="flex gap-1.5 overflow-x-auto pb-1"
        >
          {businessConfig.commercial.functionKeys.map((item) => {
            const isActiveMethod = primaryMethod === item.action;
            const isActiveArca = item.action === "arca" && arcaEnabled;
            const isCheckout = item.action === "checkout";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => triggerFunctionKey(item.action)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  isCheckout
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isActiveMethod || isActiveArca
                      ? "border-primary bg-primary/15 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <kbd className="bg-background/80 text-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-xs">
                  {item.key}
                </kbd>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grilla Principal POS: Izquierda Catálogo / Derecha Ticket y Cobro */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Buscador + Categorías + Grilla de Hamburguesas y Combos */}
        <section
          aria-label="Catálogo de productos POS"
          className="bg-card space-y-4 rounded-2xl border p-4 shadow-sm lg:col-span-7"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar hamburguesa, combo, PLU o escanear código (Enter agrega)..."
                aria-label="Buscar producto o código de barras"
                className="h-11 rounded-xl pr-10 pl-10"
              />
              <Barcode className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
            </div>
          </div>

          {/* Filtro por categorías */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              variant={selectedCategoryId === "todas" ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0 rounded-xl text-xs font-semibold"
              onClick={() => setSelectedCategoryId("todas")}
            >
              Todas ({activeProducts.length})
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                variant={selectedCategoryId === cat.id ? "default" : "outline"}
                size="sm"
                className="h-9 shrink-0 rounded-xl text-xs font-semibold"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Grilla de productos */}
          {visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
              <ShoppingBag className="text-muted-foreground mb-2 size-8" />
              <p className="font-bold">No encontramos productos con ese filtro</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Probá con otro nombre, código PLU o cambiá la categoría seleccionada.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategoryId("todas");
                }}
              >
                Ver toda la carta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleProducts.map((product) => {
                const inCart = cart.find((c) => c.productId === product.id)?.quantity ?? 0;
                const isLow = product.effectiveStock <= businessConfig.logistics.lowStockThreshold;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToTicket(product.id)}
                    className={`group bg-background hover:border-primary/60 relative flex flex-col overflow-hidden rounded-2xl border p-3 text-left transition-all hover:shadow-md ${
                      inCart > 0 ? "border-primary ring-primary/20 ring-2" : ""
                    }`}
                  >
                    <div className="bg-muted relative mb-2.5 aspect-16/10 w-full overflow-hidden rounded-xl">
                      <ProductImage src={product.image} alt={product.name} sizes="220px" />
                      {inCart > 0 && (
                        <span className="bg-primary text-primary-foreground absolute top-2 right-2 grid size-6 place-items-center rounded-full text-xs font-extrabold shadow">
                          {inCart}
                        </span>
                      )}
                      {product.isKit && (
                        <span className="bg-background/90 text-foreground absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                          Combo
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-sm font-bold">{product.name}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className="text-primary text-base font-extrabold tabular-nums">
                        {formatCurrency(getFinalPrice(product))}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          isLow
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Stock: {product.effectiveStock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Columna Derecha: Ticket Actual + Cliente + Beneficios + Medios de Pago */}
        <section
          aria-label="Ticket y cobro"
          className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-lg font-extrabold">Ticket de mostrador</h2>
              <p className="text-muted-foreground text-xs">
                {saleLines.reduce((acc, l) => acc + l.quantity, 0)} unidades cargadas
              </p>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-8 rounded-lg text-xs"
                onClick={clearTicket}
              >
                <RotateCcw className="size-3.5" />
                Vaciar (F7)
              </Button>
            )}
          </div>

          {/* Selector de Cliente y Estado de Fidelidad / Cuenta Corriente */}
          <div className="space-y-2 rounded-xl border p-3">
            <label className="flex items-center gap-1.5 text-xs font-bold">
              <UserCheck className="text-primary size-4" />
              Cliente / Socio del Club Burger
            </label>
            <Select
              items={customerItems}
              value={selectedCustomerId}
              onValueChange={(val) =>
                setSelectedCustomerId(typeof val === "string" ? val : "consumidor_final")
              }
            >
              <SelectTrigger className="h-10! w-full" aria-label="Seleccionar cliente">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumidor_final">Consumidor Final (Mostrador)</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.phone || "sin tel."})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCustomer && (
              <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg p-2 text-xs">
                {customerTier && (
                  <Badge variant="secondary" className="font-semibold">
                    {customerTier.current.badge} Nivel {customerTier.current.name} (
                    {customerTier.current.discountPct}% OFF)
                  </Badge>
                )}
                <Badge variant="outline">Sellos: {selectedCustomer.stamps}</Badge>
                <Badge variant="outline">
                  <Wallet className="mr-1 size-3" />
                  Monedero: {formatCurrency(customerWalletBalance)}
                </Badge>
                <Badge variant={customerDebt > 0 ? "destructive" : "outline"}>
                  Fiado: {formatCurrency(customerDebt)} / Disp:{" "}
                  {formatCurrency(Math.max(0, customerCreditLimit - customerDebt))}
                </Badge>
              </div>
            )}
          </div>

          {/* Líneas del Ticket */}
          {saleLines.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
              Tocá cualquier hamburguesa o combo de la izquierda para armar el pedido.
            </div>
          ) : (
            <ul className="max-h-60 divide-y overflow-y-auto rounded-xl border px-3">
              {saleLines.map((line) => (
                <li key={line.productId} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatCurrency(line.unitPrice)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg"
                      aria-label={`Restar ${line.name}`}
                      onClick={() => updateLineQuantity(line.productId, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-lg"
                      aria-label={`Sumar ${line.name}`}
                      onClick={() => updateLineQuantity(line.productId, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right text-sm font-bold tabular-nums">
                    {formatCurrency(line.subtotal)}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Cupón y Regla de Oro de Beneficios */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                ref={couponInputRef}
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Cupón de descuento (ej. BURGER10)"
                aria-label="Código de cupón"
                className="h-9 rounded-xl text-xs uppercase"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs font-semibold"
                onClick={handleApplyCoupon}
              >
                <Tag className="size-3.5" />
                Aplicar
              </Button>
            </div>

            {benefit.discountAmount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-200">
                  <Sparkles className="size-3.5" />
                  {benefit.label}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  -{formatCurrency(benefit.discountAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Selección de Medio de Pago y Pago Mixto */}
          <div className="space-y-3 rounded-xl border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Medio de cobro</span>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <span>Dividir pago (Mixto)</span>
                <Switch
                  checked={isMixedPayment}
                  onCheckedChange={(checked) => {
                    setIsMixedPayment(checked);
                    if (checked && !primarySplitAmount) {
                      setPrimarySplitAmount(String(Math.round(total / 2)));
                    }
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "efectivo",
                  "mercadopago",
                  "debito",
                  "credito",
                  "transferencia",
                  "monedero",
                  "giftcard",
                  "fiado",
                ] as PosPaymentMethod[]
              ).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPrimaryMethod(method)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    primaryMethod === method
                      ? "border-primary bg-primary/15 text-primary"
                      : "hover:bg-muted/60"
                  }`}
                >
                  {method === "efectivo" && <Banknote className="size-3.5 shrink-0" />}
                  {method === "mercadopago" && <QrCode className="size-3.5 shrink-0" />}
                  {(method === "debito" || method === "credito" || method === "transferencia") && (
                    <CreditCard className="size-3.5 shrink-0" />
                  )}
                  {method === "monedero" && <Wallet className="size-3.5 shrink-0" />}
                  {method === "giftcard" && <Gift className="size-3.5 shrink-0" />}
                  {method === "fiado" && <FileText className="size-3.5 shrink-0" />}
                  <span className="truncate">{PAYMENT_METHOD_LABELS[method]}</span>
                </button>
              ))}
            </div>

            {isMixedPayment && (
              <div className="bg-muted/40 grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground text-[11px] font-semibold">
                    Monto en {PAYMENT_METHOD_LABELS[primaryMethod]}
                  </label>
                  <Input
                    type="number"
                    value={primarySplitAmount}
                    onChange={(e) => setPrimarySplitAmount(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-[11px] font-semibold">
                    Resto ({formatCurrency(Math.max(0, total - (Number(primarySplitAmount) || 0)))})
                    en:
                  </label>
                  <Select
                    items={paymentItems}
                    value={secondaryMethod}
                    onValueChange={(v) =>
                      setSecondaryMethod((v as PosPaymentMethod) ?? "mercadopago")
                    }
                  >
                    <SelectTrigger className="mt-1 h-9! w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PosPaymentMethod[])
                        .filter((m) => m !== primaryMethod)
                        .map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Efectivo: cálculo de vuelto */}
            {cashSplitAmount > 0 && (
              <div className="bg-muted/30 flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                <div className="flex-1">
                  <label className="text-muted-foreground block text-[11px] font-semibold">
                    Paga con efectivo ($)
                  </label>
                  <Input
                    type="number"
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    placeholder={String(cashSplitAmount)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px] font-semibold">
                    Vuelto a entregar
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                    {formatCurrency(calculatedChange)}
                  </span>
                </div>
              </div>
            )}

            {/* Gift Card: validación en vivo */}
            {usesGiftCard && (
              <div className="space-y-1.5 rounded-xl border p-2.5">
                <label className="text-xs font-semibold">Código de Gift Card / Voucher</label>
                <Input
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                  placeholder="GC-BURG-2026"
                  className="h-9 text-xs uppercase"
                />
                {matchedGiftCard ? (
                  <p className="text-xs font-medium text-emerald-600">
                    ✔ {matchedGiftCard.code} ({getGiftCardStatus(matchedGiftCard)}) · Saldo:{" "}
                    {formatCurrency(matchedGiftCard.balance)}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    Ejemplos activos: GC-BURG-2026 o GC-VIPX-9900
                  </p>
                )}
              </div>
            )}

            {/* Facturación electrónica ARCA opcional */}
            <div className="flex items-center justify-between border-t pt-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <Receipt className="text-muted-foreground size-4" />
                Emitir comprobante fiscal ARCA (F8)
              </label>
              <Switch checked={arcaEnabled} onCheckedChange={setArcaEnabled} />
            </div>

            {arcaEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Select
                  items={{
                    "Ticket B": "Ticket Factura B",
                    "Factura A": "Factura A (RI)",
                    "Factura B": "Factura B",
                  }}
                  value={arcaCbteTipo}
                  onValueChange={(v) =>
                    setArcaCbteTipo((v as "Ticket B" | "Factura A" | "Factura B") ?? "Ticket B")
                  }
                >
                  <SelectTrigger className="h-9! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ticket B">Ticket Factura B</SelectItem>
                    <SelectItem value="Factura A">Factura A (RI)</SelectItem>
                    <SelectItem value="Factura B">Factura B</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={arcaDocNumber}
                  onChange={(e) => setArcaDocNumber(e.target.value)}
                  placeholder={selectedCustomer?.taxId || "CUIT / DNI receptor"}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* Totales y Botón de Cobro */}
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-1 text-sm">
              <div className="text-muted-foreground flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {benefit.discountAmount > 0 && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>{benefit.label}</span>
                  <span className="tabular-nums">-{formatCurrency(benefit.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-xl font-extrabold">
                <span>Total a cobrar</span>
                <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-xl text-base font-extrabold shadow-md"
              disabled={saleLines.length === 0 || !openSession}
              onClick={handleCheckout}
            >
              <CheckCircle2 className="size-5" />
              Cobrar {formatCurrency(total)} (F12)
            </Button>
          </div>
        </section>
      </div>

      {/* Últimos tickets cobrados en el turno */}
      <section className="bg-card rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Últimas ventas POS del turno</h2>
            <p className="text-muted-foreground text-xs">
              Podés reimprimir el ticket térmico de 80 mm o anular con devolución automática de
              stock.
            </p>
          </div>
        </div>
        {shiftSales.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">
            Todavía no hay ventas registradas en este turno.
          </p>
        ) : (
          <div className="divide-y">
            {shiftSales.map((sale) => (
              <div
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{sale.ticketNumber}</span>
                    <span className="font-semibold">{sale.customerName}</span>
                    {sale.status === "anulada" ? (
                      <Badge variant="destructive">Anulada</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {sale.payments
                          .map((p) => PAYMENT_METHOD_LABELS[p.method])
                          .join(" + ")}
                      </Badge>
                    )}
                    {sale.arcaInvoice && (
                      <Badge variant="outline">ARCA {sale.arcaInvoice.cbteTipo}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(sale.createdAt)} ·{" "}
                    {sale.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tabular-nums">
                    {formatCurrency(sale.total)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setLastCompletedSale(sale)}
                  >
                    <Printer className="size-3.5" />
                    Ticket
                  </Button>
                  {sale.status === "completada" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 rounded-lg text-xs"
                      onClick={() => {
                        setVoidTarget(sale);
                        setVoidReason("");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Anular
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sheet de Vista Previa e Impresión de Ticket 80mm */}
      <Sheet
        open={lastCompletedSale !== null}
        onOpenChange={(open) => !open && setLastCompletedSale(null)}
      >
        <SheetContent className="w-full p-5 sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg font-extrabold">
              <Receipt className="text-primary size-5" />
              Comprobante {lastCompletedSale?.ticketNumber}
            </SheetTitle>
            <SheetDescription>
              Formato térmico de 80 mm listo para comandera e impresora de mostrador.
            </SheetDescription>
          </SheetHeader>
          {lastCompletedSale && (
            <div className="space-y-4">
              <div className="bg-muted/30 space-y-2 rounded-2xl border p-4 font-mono text-xs">
                <div className="border-b pb-2 text-center">
                  <p className="text-sm font-extrabold">{businessConfig.site.name}</p>
                  <p className="text-muted-foreground">{businessConfig.site.address}</p>
                  <p className="mt-1 font-bold">
                    {lastCompletedSale.arcaInvoice
                      ? `${lastCompletedSale.arcaInvoice.cbteTipo} · CAE ${lastCompletedSale.arcaInvoice.cae}`
                      : "TICKET DE VENTA MOSTRADOR"}
                  </p>
                  <p>
                    {lastCompletedSale.ticketNumber} ·{" "}
                    {formatDateTime(lastCompletedSale.createdAt)}
                  </p>
                  <p>Cliente: {lastCompletedSale.customerName}</p>
                </div>

                <div className="space-y-1 border-b py-2">
                  {lastCompletedSale.lines.map((line) => (
                    <div key={line.productId} className="flex justify-between">
                      <span>
                        {line.quantity}x {line.name}
                      </span>
                      <span>{formatCurrency(line.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>{formatCurrency(lastCompletedSale.subtotal)}</span>
                  </div>
                  {lastCompletedSale.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>{lastCompletedSale.discountLabel}</span>
                      <span>-{formatCurrency(lastCompletedSale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold">
                    <span>TOTAL</span>
                    <span>{formatCurrency(lastCompletedSale.total)}</span>
                  </div>
                  {lastCompletedSale.payments.map((p, idx) => (
                    <div key={idx} className="text-muted-foreground flex justify-between">
                      <span>Pago {PAYMENT_METHOD_LABELS[p.method]}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  {lastCompletedSale.changeGiven > 0 && (
                    <div className="flex justify-between font-bold">
                      <span>VUELTO</span>
                      <span>{formatCurrency(lastCompletedSale.changeGiven)}</span>
                    </div>
                  )}
                </div>

                {lastCompletedSale.cashbackAwarded > 0 && (
                  <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-center font-sans text-xs font-bold text-emerald-700">
                    <Award className="mr-1 inline size-3.5" />
                    Acreditamos {formatCurrency(lastCompletedSale.cashbackAwarded)} de Cashback en
                    su Monedero Club
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="h-11 flex-1 rounded-xl font-bold"
                  onClick={() => window.print()}
                >
                  <Printer className="size-4" />
                  Imprimir ticket
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setLastCompletedSale(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet para Anular Venta con devolución de stock */}
      <Sheet open={voidTarget !== null} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <SheetContent className="w-full p-5 sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-extrabold">
              Anular venta {voidTarget?.ticketNumber}
            </SheetTitle>
            <SheetDescription>
              Se restituirá automáticamente el stock de los productos vendidos y quedará registrado
              el motivo de anulación.
            </SheetDescription>
          </SheetHeader>
          {voidTarget && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Motivo de anulación (obligatorio)</label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej. Error de carga en medio de pago"
                  className="mt-1.5 h-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="h-11 flex-1 rounded-xl font-bold"
                  onClick={() => {
                    const res = voidPosSale(voidTarget.id, voidReason);
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    toast.success(`Venta ${voidTarget.ticketNumber} anulada y stock repuesto.`);
                    setVoidTarget(null);
                  }}
                >
                  Confirmar anulación
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setVoidTarget(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
