"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Boxes,
  Crown,
  DollarSign,
  Flame,
  Gift,
  PackageX,
  Percent,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessConfig } from "@/config/business.config";
import { PageHeader, SectionTabs, StatCards, type SectionTab, type Stat } from "@/features/admin";
import { useCommercial, type PosPaymentMethod } from "@/features/commercial";
import { getCustomerDebt, useCustomers } from "@/features/customers";
import { useLogistics } from "@/features/logistics";
import {
  getCustomerTier,
  getCustomerWalletBalance,
  getGiftCardStatus,
  useDiscountCoupons,
  useGiftCards,
  useLoyaltySettings,
} from "@/features/loyalty";
import { getFinalPrice } from "@/features/menu";
import { ACTIVE_STATUSES, useOrders } from "@/features/orders";
import { formatCurrency } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import type { AnalyticsPeriodDays, SummaryAnalyticsTab } from "../types";

const PAYMENT_LABELS = businessConfig.commercial.posPaymentMethods;

const PERIOD_OPTIONS: Array<{ days: AnalyticsPeriodDays; label: string }> = [
  { days: 1, label: "Hoy (24 h)" },
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 365, label: "1 año" },
];

export function SummaryDashboard() {
  const { state: commercialState, openSession, openSessionSummary } = useCommercial();
  const { items: inventoryItems, categories, shrinkages, suppliers } = useLogistics();
  const orders = useOrders();
  const customers = useCustomers();
  const loyaltySettings = useLoyaltySettings();
  const giftCards = useGiftCards();
  const coupons = useDiscountCoupons();

  const isHydrated = useIsClient();
  const [nowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<SummaryAnalyticsTab>("pulso");
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);

  // Ventas POS + Pedidos online entregados dentro del período seleccionado
  const salesAnalysis = useMemo(() => {
    const cutoff = nowMs - periodDays * 86_400_000;
    const validPosSales = commercialState.sales.filter(
      (s) => s.status === "completada" && new Date(s.createdAt).getTime() >= cutoff,
    );
    const deliveredOrders = orders.filter(
      (o) => o.status === "entregado" && new Date(o.createdAt).getTime() >= cutoff,
    );

    const posRevenue = validPosSales.reduce((acc, s) => acc + s.total, 0);
    const posCost = validPosSales.reduce((acc, s) => acc + s.totalCost, 0);
    const posDiscounts = validPosSales.reduce((acc, s) => acc + s.discountAmount, 0);

    const webRevenue = deliveredOrders.reduce((acc, o) => acc + o.total, 0);
    // Estimación costo web según catálogo
    const webCost = deliveredOrders.reduce((acc, order) => {
      const orderCost = order.items.reduce((sum, item) => {
        const inv = inventoryItems.find((p) => p.id === item.productId);
        const unitCost = inv ? inv.effectiveCost : Math.round(item.price * 0.45);
        return sum + unitCost * item.quantity;
      }, 0);
      return acc + orderCost;
    }, 0);

    const totalRevenue = posRevenue + webRevenue;
    const totalCost = posCost + webCost;
    const grossProfit = totalRevenue - totalCost;
    const grossMarginPct =
      totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
    const totalCount = validPosSales.length + deliveredOrders.length;
    const avgTicket = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    // Ranking de productos vendidos
    const productStatsMap = new Map<
      string,
      { id: string; name: string; units: number; revenue: number; cost: number; profit: number }
    >();

    for (const sale of validPosSales) {
      for (const line of sale.lines) {
        const prev = productStatsMap.get(line.productId) ?? {
          id: line.productId,
          name: line.name,
          units: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        const lineCost = line.unitCost * line.quantity;
        prev.units += line.quantity;
        prev.revenue += line.subtotal;
        prev.cost += lineCost;
        prev.profit += line.subtotal - lineCost;
        productStatsMap.set(line.productId, prev);
      }
    }

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const inv = inventoryItems.find((p) => p.id === item.productId);
        const unitCost = inv ? inv.effectiveCost : Math.round(item.price * 0.45);
        const prev = productStatsMap.get(item.productId) ?? {
          id: item.productId,
          name: item.name,
          units: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        const lineRev = item.price * item.quantity;
        const lineCost = unitCost * item.quantity;
        prev.units += item.quantity;
        prev.revenue += lineRev;
        prev.cost += lineCost;
        prev.profit += lineRev - lineCost;
        productStatsMap.set(item.productId, prev);
      }
    }

    const topProducts = Array.from(productStatsMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Desglose por medio de pago
    const byMethod: Record<PosPaymentMethod, number> = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0,
      mercadopago: 0,
      monedero: 0,
      giftcard: 0,
      fiado: 0,
    };

    for (const sale of validPosSales) {
      for (const p of sale.payments) {
        byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
      }
    }
    for (const order of deliveredOrders) {
      if (order.paymentMethod === "efectivo") byMethod.efectivo += order.total;
      else if (order.paymentMethod === "transferencia") byMethod.transferencia += order.total;
      else byMethod.mercadopago += order.total;
    }

    return {
      posRevenue,
      webRevenue,
      totalRevenue,
      totalCost,
      grossProfit,
      grossMarginPct,
      totalCount,
      avgTicket,
      posDiscounts,
      topProducts,
      byMethod,
    };
  }, [commercialState.sales, orders, inventoryItems, nowMs, periodDays]);

  // Análisis de Stock, Costos y Proveedores
  const stockAnalysis = useMemo(() => {
    const activeItems = inventoryItems.filter((i) => !i.archived && !i.isKit);
    const totalCostValuation = activeItems.reduce(
      (acc, i) => acc + Math.max(0, i.effectiveStock) * i.effectiveCost,
      0,
    );
    const totalSaleValuation = activeItems.reduce(
      (acc, i) => acc + Math.max(0, i.effectiveStock) * getFinalPrice(i),
      0,
    );
    const potentialProfit = totalSaleValuation - totalCostValuation;

    const criticalItems = activeItems
      .filter((i) => i.effectiveStock <= businessConfig.logistics.lowStockThreshold)
      .sort((a, b) => a.effectiveStock - b.effectiveStock);

    const totalShrinkageLoss = shrinkages.reduce(
      (acc, s) => acc + s.totalValue,
      0,
    );

    const totalSupplierDebt = suppliers.reduce(
      (acc, sup) => acc + Math.max(0, sup.balance),
      0,
    );

    const categoryBreakdown = categories.map((cat) => {
      const catItems = activeItems.filter((i) => i.categoryId === cat.id);
      const costVal = catItems.reduce(
        (acc, i) => acc + Math.max(0, i.effectiveStock) * i.effectiveCost,
        0,
      );
      const saleVal = catItems.reduce(
        (acc, i) => acc + Math.max(0, i.effectiveStock) * getFinalPrice(i),
        0,
      );
      return {
        id: cat.id,
        name: cat.name,
        itemsCount: catItems.length,
        costVal,
        saleVal,
      };
    });

    return {
      totalCostValuation,
      totalSaleValuation,
      potentialProfit,
      criticalItems,
      totalShrinkageLoss,
      totalSupplierDebt,
      categoryBreakdown,
    };
  }, [inventoryItems, categories, shrinkages, suppliers]);

  // Análisis de Clientes y Fidelidad
  const customersAnalysis = useMemo(() => {
    const enrichedCustomers = customers.map((c) => {
      const debt = getCustomerDebt(c.id);
      const wallet = getCustomerWalletBalance(c.id);
      const tier = getCustomerTier(c);
      return {
        customer: c,
        debt,
        wallet,
        tier: tier.current,
      };
    });

    const totalFiadoDebt = enrichedCustomers.reduce((acc, r) => acc + r.debt, 0);
    const totalWalletLiability = enrichedCustomers.reduce((acc, r) => acc + r.wallet, 0);
    const tierCounts: Record<string, number> = {
      bronce: enrichedCustomers.filter((r) => r.tier.key === "bronce").length,
      plata: enrichedCustomers.filter((r) => r.tier.key === "plata").length,
      oro: enrichedCustomers.filter((r) => r.tier.key === "oro").length,
    };

    const activeGiftCardLiability = giftCards
      .filter((g) => getGiftCardStatus(g, nowMs) === "activa")
      .reduce((acc, g) => acc + g.balance, 0);

    const readyToRedeemCount = customers.filter(
      (c) => c.stamps >= loyaltySettings.stampsRequired,
    ).length;

    const topCustomers = [...enrichedCustomers].sort(
      (a, b) => b.customer.totalSpent - a.customer.totalSpent,
    );

    return {
      totalCustomers: customers.length,
      totalFiadoDebt,
      totalWalletLiability,
      activeGiftCardLiability,
      readyToRedeemCount,
      tierCounts,
      topCustomers,
    };
  }, [customers, giftCards, loyaltySettings.stampsRequired, nowMs]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const activeOrdersCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  const tabs: SectionTab<SummaryAnalyticsTab>[] = [
    { value: "pulso", label: "Pulso de hoy (General)" },
    { value: "ventas", label: "Análisis de ventas", count: salesAnalysis.totalCount },
    {
      value: "stock",
      label: "Análisis de stock y costos",
      count: stockAnalysis.criticalItems.length,
    },
    {
      value: "clientes",
      label: "Análisis de clientes y fidelidad",
      count: customersAnalysis.totalCustomers,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen y centro de análisis"
        description="Visión integral de tu hamburguesería dividida por pulso operativo, ventas, stock valorizado y fidelización."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-xl font-semibold"
              nativeButton={false}
              render={<Link href="/dashboard/caja" />}
            >
              <Banknote className="size-4" />
              Ver Caja
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
        }
      />

      {/* Barra superior divisora de apartados analíticos */}
      <SectionTabs
        id="summary-analytics-tabs"
        label="Vistas de análisis del resumen"
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* =====================================================================
          VISTA 1: PULSO DE HOY (GENERAL)
         ===================================================================== */}
      {activeTab === "pulso" && (
        <div className="space-y-6">
          <StatCards
            stats={[
              {
                label: "Ventas del turno actual",
                value: openSessionSummary
                  ? formatCurrency(openSessionSummary.totalSales)
                  : "$0",
                hint: openSessionSummary
                  ? `${openSessionSummary.salesCount} tickets en ${openSession?.registerName}`
                  : "Caja cerrada en este momento",
                icon: Flame,
              },
              {
                label: "Efectivo esperado en caja",
                value: openSessionSummary
                  ? formatCurrency(openSessionSummary.expectedCash)
                  : "$0",
                hint: openSession
                  ? `Fondo inicial: ${formatCurrency(openSession.openingAmount)}`
                  : "Abrí turno para operar",
                icon: Banknote,
              },
              {
                label: "Comandas activas",
                value: String(activeOrdersCount),
                hint: "Pedidos web / WhatsApp en curso",
                icon: ShoppingBag,
              },
              {
                label: "Margen bruto real (30d)",
                value: `${salesAnalysis.grossMarginPct}%`,
                hint: `Ganancia: ${formatCurrency(salesAnalysis.grossProfit)}`,
                icon: TrendingUp,
              },
            ] satisfies Stat[]}
          />

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Alertas operativas accionables */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold">Alertas operativas del local</h2>
                  <p className="text-muted-foreground text-xs">
                    Puntos que requieren atención del encargado o dueño hoy.
                  </p>
                </div>
                <AlertTriangle className="size-5 text-amber-500" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-bold">
                      {stockAnalysis.criticalItems.length} productos con stock bajo o agotado
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Umbral crítico configurado en ≤ {businessConfig.logistics.lowStockThreshold}{" "}
                      unidades
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setActiveTab("stock")}
                  >
                    Ver stock <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-bold">
                      Fiado / Cuenta corriente por cobrar:{" "}
                      {formatCurrency(customersAnalysis.totalFiadoDebt)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Saldo pendiente en clientes habituales
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    nativeButton={false}
                    render={<Link href="/dashboard/clientes" />}
                  >
                    Cobrar <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-bold">
                      Deuda a proveedores:{" "}
                      {formatCurrency(stockAnalysis.totalSupplierDebt)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Facturas y remitos pendientes de pago
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    nativeButton={false}
                    render={<Link href="/dashboard/proveedores" />}
                  >
                    Proveedores <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-bold">
                      {customersAnalysis.readyToRedeemCount} clientes listos para canjear premio
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Completaron los {loyaltySettings.stampsRequired} sellos de su tarjeta
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    nativeButton={false}
                    render={<Link href="/dashboard/sellos" />}
                  >
                    Ver Club <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Resumen rápido de productos estrella hoy */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold">Top hamburguesas por ingresos</h2>
                  <p className="text-muted-foreground text-xs">
                    Productos que más facturación y margen aportaron en el período.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setActiveTab("ventas")}
                >
                  Ver análisis completo
                </Button>
              </div>

              <div className="space-y-3">
                {salesAnalysis.topProducts.slice(0, 5).map((prod, idx) => {
                  const maxRev = salesAnalysis.topProducts[0]?.revenue || 1;
                  const pct = Math.round((prod.revenue / maxRev) * 100);
                  return (
                    <div key={prod.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">
                          #{idx + 1} {prod.name}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({prod.units} u.)
                          </span>
                        </span>
                        <span className="font-extrabold tabular-nums">
                          {formatCurrency(prod.revenue)}
                        </span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 2: ANÁLISIS DE VENTAS Y RENTABILIDAD
         ===================================================================== */}
      {activeTab === "ventas" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Rendimiento comercial y margen real</h2>
              <p className="text-muted-foreground text-xs">
                Conecta las ventas de Vender POS y Pedidos Web contra el costo de receta/insumos.
              </p>
            </div>
            <div className="flex gap-1.5">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.days}
                  variant={periodDays === opt.days ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-xl text-xs font-semibold"
                  onClick={() => setPeriodDays(opt.days)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <StatCards
            stats={[
              {
                label: "Facturación bruta",
                value: formatCurrency(salesAnalysis.totalRevenue),
                hint: `${salesAnalysis.totalCount} operaciones cerradas`,
                icon: DollarSign,
              },
              {
                label: "Costo de mercadería (CMV)",
                value: formatCurrency(salesAnalysis.totalCost),
                hint: "Calculado según costo de stock y combos",
                icon: Boxes,
              },
              {
                label: "Ganancia bruta limpia",
                value: formatCurrency(salesAnalysis.grossProfit),
                hint: `Ticket promedio: ${formatCurrency(salesAnalysis.avgTicket)}`,
                icon: TrendingUp,
              },
              {
                label: "Margen sobre ventas",
                value: `${salesAnalysis.grossMarginPct}%`,
                hint: `Descuentos Club/Cupones: ${formatCurrency(salesAnalysis.posDiscounts)}`,
                icon: Percent,
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Ranking detallado por producto */}
            <section className="bg-card rounded-2xl border shadow-sm lg:col-span-7">
              <div className="border-b px-5 py-4">
                <h3 className="text-base font-extrabold">
                  Rentabilidad por hamburguesa / producto
                </h3>
                <p className="text-muted-foreground text-xs">
                  Unidades despachadas, ingreso, costo y ganancia neta aportada.
                </p>
              </div>
              {salesAnalysis.topProducts.length === 0 ? (
                <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                  Sin ventas registradas en este período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="pr-5 text-right">Ganancia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesAnalysis.topProducts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-5 font-semibold">{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.units}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {formatCurrency(item.cost)}
                        </TableCell>
                        <TableCell className="pr-5 text-right font-bold text-emerald-600 tabular-nums">
                          {formatCurrency(item.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            {/* Medios de pago y Canales */}
            <section className="bg-card space-y-5 rounded-2xl border p-5 shadow-sm lg:col-span-5">
              <div>
                <h3 className="text-base font-extrabold">Cobros por medio de pago</h3>
                <p className="text-muted-foreground text-xs">
                  Distribución del dinero cobrado en el período elegido.
                </p>
              </div>

              <div className="divide-y rounded-xl border">
                {(Object.keys(PAYMENT_LABELS) as PosPaymentMethod[]).map((method) => {
                  const amount = salesAnalysis.byMethod[method] ?? 0;
                  const share =
                    salesAnalysis.totalRevenue > 0
                      ? Math.round((amount / salesAnalysis.totalRevenue) * 100)
                      : 0;
                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <span className="font-medium">{PAYMENT_LABELS[method]}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {share}%
                        </Badge>
                        <span className="w-24 text-right font-bold tabular-nums">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-muted/30 space-y-2 rounded-xl border p-4 text-xs">
                <p className="font-extrabold uppercase">Participación por canal</p>
                <div className="flex justify-between">
                  <span>Mostrador POS (F1)</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(salesAnalysis.posRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tienda Online / WhatsApp</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(salesAnalysis.webRevenue)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: ANÁLISIS DE STOCK, MERMAS Y COSTOS
         ===================================================================== */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <StatCards
            stats={[
              {
                label: "Capital en stock (al costo)",
                value: formatCurrency(stockAnalysis.totalCostValuation),
                hint: "Mercadería e insumos valorizados al costo",
                icon: Boxes,
              },
              {
                label: "Valor potencial de venta",
                value: formatCurrency(stockAnalysis.totalSaleValuation),
                hint: `Ganancia potencial: ${formatCurrency(stockAnalysis.potentialProfit)}`,
                icon: BarChart3,
              },
              {
                label: "Pérdida por mermas",
                value: formatCurrency(stockAnalysis.totalShrinkageLoss),
                hint: `${shrinkages.length} registros de merma/rotura`,
                icon: PackageX,
              },
              {
                label: "Deuda a proveedores",
                value: formatCurrency(stockAnalysis.totalSupplierDebt),
                hint: `${suppliers.length} proveedores activos`,
                icon: Truck,
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Productos críticos */}
            <section className="bg-card rounded-2xl border shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h3 className="text-base font-extrabold">
                    Productos en punto crítico de reposición
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Artículos con stock menor o igual a{" "}
                    {businessConfig.logistics.lowStockThreshold} unidades.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  nativeButton={false}
                  render={<Link href="/dashboard/inventario" />}
                >
                  Ajustar en Stock
                </Button>
              </div>
              {stockAnalysis.criticalItems.length === 0 ? (
                <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                  ¡Excelente! Ningún producto está por debajo del stock mínimo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock actual</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead className="pr-5 text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockAnalysis.criticalItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-5 font-semibold">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.categoryName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={item.effectiveStock <= 0 ? "destructive" : "outline"}
                          >
                            {item.effectiveStock} {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(item.effectiveCost)}
                        </TableCell>
                        <TableCell className="pr-5 text-right font-semibold tabular-nums">
                          {item.marginPercent}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            {/* Valorización por categoría */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5">
              <div>
                <h3 className="text-base font-extrabold">Capital inmovilizado por rubro</h3>
                <p className="text-muted-foreground text-xs">
                  Comparativa entre costo de reposición y valor de venta por categoría.
                </p>
              </div>
              <div className="divide-y rounded-xl border">
                {stockAnalysis.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <div>
                      <p className="font-bold">{cat.name}</p>
                      <p className="text-muted-foreground">{cat.itemsCount} productos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">
                        Costo: {formatCurrency(cat.costVal)}
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        Venta: {formatCurrency(cat.saleVal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 4: ANÁLISIS DE CLIENTES Y FIDELIDAD
         ===================================================================== */}
      {activeTab === "clientes" && (
        <div className="space-y-6">
          <StatCards
            stats={[
              {
                label: "Socios del Club Burger",
                value: String(customersAnalysis.totalCustomers),
                hint: `🥇 ${customersAnalysis.tierCounts.oro ?? 0} Oro · 🥈 ${customersAnalysis.tierCounts.plata ?? 0} Plata · 🥉 ${customersAnalysis.tierCounts.bronce ?? 0} Bronce`,
                icon: Users,
              },
              {
                label: "Por cobrar en Fiado / Cta. Cte.",
                value: formatCurrency(customersAnalysis.totalFiadoDebt),
                hint: "Deuda activa de clientes",
                icon: Crown,
              },
              {
                label: "Saldo en Monederos Club",
                value: formatCurrency(customersAnalysis.totalWalletLiability),
                hint: "Saldo prepago disponible para gastar",
                icon: Wallet,
              },
              {
                label: "Gift Cards y Cupones activos",
                value: formatCurrency(customersAnalysis.activeGiftCardLiability),
                hint: `${coupons.filter((c) => c.active).length} cupones vigentes`,
                icon: Gift,
              },
            ]}
          />

          <section className="bg-card rounded-2xl border shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
              <div>
                <h3 className="text-base font-extrabold">
                  Ranking de clientes por consumo, nivel VIP y estado de cuenta
                </h3>
                <p className="text-muted-foreground text-xs">
                  Identificá a tus mejores clientes de hamburguesas, su saldo en monedero y su
                  cuenta corriente.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  nativeButton={false}
                  render={<Link href="/dashboard/monedero" />}
                >
                  Monedero y Cupones
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  nativeButton={false}
                  render={<Link href="/dashboard/clientes" />}
                >
                  Ir a Clientes
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Cliente</TableHead>
                  <TableHead>Nivel Club</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Gasto acumulado</TableHead>
                  <TableHead className="text-right">Sellos</TableHead>
                  <TableHead className="text-right">Monedero</TableHead>
                  <TableHead className="pr-5 text-right">Deuda Fiado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersAnalysis.topCustomers.slice(0, 10).map((row) => (
                  <TableRow key={row.customer.id}>
                    <TableCell className="pl-5">
                      <p className="font-semibold">{row.customer.name}</p>
                      <p className="text-muted-foreground text-xs">{row.customer.phone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {row.tier.badge} {row.tier.name} (
                        {row.tier.discountPct > 0 ? `${row.tier.discountPct}% OFF` : "Base"})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.customer.totalOrders}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatCurrency(row.customer.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          row.customer.stamps >= loyaltySettings.stampsRequired
                            ? "default"
                            : "outline"
                        }
                      >
                        <Award className="mr-1 size-3" />
                        {row.customer.stamps}/{loyaltySettings.stampsRequired}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600 tabular-nums">
                      {row.wallet > 0 ? formatCurrency(row.wallet) : "—"}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {row.debt > 0 ? (
                        <Badge variant="destructive">{formatCurrency(row.debt)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Al día</span>
                      )}
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
