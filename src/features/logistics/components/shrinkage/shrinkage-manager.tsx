"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  PackageMinus,
  PackageX,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  TrendingDown,
  Undo2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { businessConfig } from "@/config/business.config";
import {
  PageHeader,
  SectionTabs,
  StatCards,
  type SectionTab,
  type Stat,
} from "@/features/admin";
import { useSession } from "@/features/auth";
import { useOrders } from "@/features/orders";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLogistics } from "../../hooks/use-logistics";
import { foldText } from "../../schemas/logistics.schema";
import {
  adjustProductStock,
  createPartialReturn,
  getReturnedQuantityForOrderLine,
} from "../../services/logistics-store";
import type { RefundMethod, ShrinkageType } from "../../types";
import {
  LogisticsErrorState,
  LogisticsLoadingSkeleton,
} from "../logistics-nav";

type PeriodFilter = "7" | "30" | "90" | "365" | "all";
type ActiveTab = "mermas" | "devoluciones";

const PERIOD_ITEMS: Record<PeriodFilter, string> = {
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  "365": "Último año",
  all: "Todo el historial",
};

const SHRINKAGE_TYPES: ShrinkageType[] = [
  "merma",
  "rotura",
  "vencimiento",
  "robo",
  "consumo",
];

const SHRINKAGE_TYPE_STYLES: Record<ShrinkageType, string> = {
  merma: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rotura: "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  vencimiento: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  robo: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300",
  consumo: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

const REFUND_METHOD_ITEMS: Record<RefundMethod, string> = {
  efectivo: businessConfig.logistics.refundMethods.efectivo,
  monedero: businessConfig.logistics.refundMethods.monedero,
  otro: businessConfig.logistics.refundMethods.otro,
};

const SHRINKAGE_TYPE_ITEMS: Record<ShrinkageType, string> = {
  merma: businessConfig.logistics.movementTypes.merma,
  rotura: businessConfig.logistics.movementTypes.rotura,
  vencimiento: businessConfig.logistics.movementTypes.vencimiento,
  robo: businessConfig.logistics.movementTypes.robo,
  consumo: businessConfig.logistics.movementTypes.consumo,
};

export function ShrinkageManager() {
  const { isReady, items, shrinkages, partialReturns } = useLogistics();
  const orders = useOrders();
  const { viewer } = useSession();

  const [period, setPeriod] = useState<PeriodFilter>("30");
  const [referenceNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<ActiveTab>("mermas");
  const [typeFilter, setTypeFilter] = useState<ShrinkageType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Sheet: Registrar merma
  const [shrinkageSheetOpen, setShrinkageSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [shrinkageType, setShrinkageType] = useState<ShrinkageType>("merma");
  const [shrinkageQty, setShrinkageQty] = useState<string>("1");
  const [shrinkageReason, setShrinkageReason] = useState<string>("");
  const [shrinkageFormError, setShrinkageFormError] = useState<string | null>(null);

  // Sheet: Devolución parcial
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("efectivo");
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnFormError, setReturnFormError] = useState<string | null>(null);

  const nonKitProducts = useMemo(
    () => items.filter((product) => !product.archived && !product.isKit),
    [items],
  );

  const productSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of nonKitProducts) {
      map[product.id] = `${product.name} (Stock: ${product.effectiveStock} ${
        businessConfig.logistics.units[product.unit].short
      })`;
    }
    return map;
  }, [nonKitProducts]);

  const eligibleOrders = useMemo(
    () => orders.filter((order) => order.status !== "cancelado"),
    [orders],
  );

  const orderSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const order of eligibleOrders) {
      map[order.id] = `${order.id} · ${order.customerName} (${formatPrice(order.total)})`;
    }
    return map;
  }, [eligibleOrders]);

  const cutoffMs = useMemo(() => {
    if (period === "all") return 0;
    const days = Number(period);
    return referenceNowMs - days * 86_400_000;
  }, [period, referenceNowMs]);

  const periodShrinkages = useMemo(
    () =>
      shrinkages.filter(
        (record) => cutoffMs === 0 || new Date(record.createdAt).getTime() >= cutoffMs,
      ),
    [shrinkages, cutoffMs],
  );

  const periodReturns = useMemo(
    () =>
      partialReturns.filter(
        (record) => cutoffMs === 0 || new Date(record.createdAt).getTime() >= cutoffMs,
      ),
    [partialReturns, cutoffMs],
  );

  const filteredShrinkages = useMemo(() => {
    const q = foldText(searchQuery);
    return periodShrinkages.filter((record) => {
      if (typeFilter !== "all" && record.type !== typeFilter) return false;
      if (!q) return true;
      return (
        foldText(record.productName).includes(q) ||
        foldText(record.reason).includes(q) ||
        foldText(record.user).includes(q) ||
        foldText(businessConfig.logistics.movementTypes[record.type]).includes(q)
      );
    });
  }, [periodShrinkages, typeFilter, searchQuery]);

  const filteredReturns = useMemo(() => {
    const q = foldText(searchQuery);
    return periodReturns.filter((record) => {
      if (!q) return true;
      return (
        foldText(record.orderNumber).includes(q) ||
        foldText(record.customerName).includes(q) ||
        foldText(record.reason).includes(q) ||
        record.lines.some((line) => foldText(line.productName).includes(q))
      );
    });
  }, [periodReturns, searchQuery]);

  const metrics = useMemo(() => {
    const totalLoss = periodShrinkages.reduce((acc, s) => acc + s.totalValue, 0);
    const totalLostUnits = periodShrinkages.reduce(
      (acc, s) => acc + Math.abs(s.quantity),
      0,
    );
    const byType: Record<ShrinkageType, { count: number; total: number; units: number }> = {
      merma: { count: 0, total: 0, units: 0 },
      rotura: { count: 0, total: 0, units: 0 },
      vencimiento: { count: 0, total: 0, units: 0 },
      robo: { count: 0, total: 0, units: 0 },
      consumo: { count: 0, total: 0, units: 0 },
    };

    for (const item of periodShrinkages) {
      byType[item.type].count += 1;
      byType[item.type].total += item.totalValue;
      byType[item.type].units += Math.abs(item.quantity);
    }

    const totalRefunded = periodReturns.reduce((acc, r) => acc + r.totalRefund, 0);
    const totalReturnedUnits = periodReturns.reduce(
      (acc, r) => acc + r.lines.reduce((sum, line) => sum + line.quantity, 0),
      0,
    );

    return {
      totalLoss,
      totalLostUnits,
      byType,
      totalRefunded,
      totalReturnedUnits,
    };
  }, [periodShrinkages, periodReturns]);

  const stats: Stat[] = useMemo(
    () => [
      {
        label: "Pérdida por mermas (al costo)",
        value: formatPrice(metrics.totalLoss),
        hint: `${periodShrinkages.length} incidente(s) · ${metrics.totalLostUnits} u. dadas de baja`,
        icon: TrendingDown,
      },
      {
        label: "Vencimientos y roturas",
        value: formatPrice(
          metrics.byType.vencimiento.total + metrics.byType.rotura.total,
        ),
        hint: `${metrics.byType.vencimiento.count} vencimiento(s) · ${metrics.byType.rotura.count} rotura(s)`,
        icon: Flame,
      },
      {
        label: "Consumo interno y mermas",
        value: formatPrice(metrics.byType.consumo.total + metrics.byType.merma.total),
        hint: `${metrics.byType.consumo.count} consumo(s) · ${metrics.byType.merma.count} merma(s)`,
        icon: Utensils,
      },
      {
        label: "Devoluciones parciales",
        value: formatPrice(metrics.totalRefunded),
        hint: `${periodReturns.length} devolución(es) · ${metrics.totalReturnedUnits} u. repuestas al stock`,
        icon: Undo2,
      },
    ],
    [metrics, periodShrinkages.length, periodReturns.length],
  );

  const tabs: SectionTab<ActiveTab>[] = [
    {
      value: "mermas",
      label: "Mermas valorizadas",
      icon: PackageX,
      count: filteredShrinkages.length,
    },
    {
      value: "devoluciones",
      label: "Devoluciones parciales",
      icon: RotateCcw,
      count: filteredReturns.length,
    },
  ];

  function openNewShrinkageSheet() {
    const firstProduct = nonKitProducts[0];
    setSelectedProductId(firstProduct?.id ?? "");
    setShrinkageType("merma");
    setShrinkageQty("1");
    setShrinkageReason("");
    setShrinkageFormError(null);
    setShrinkageSheetOpen(true);
  }

  function handleSaveShrinkage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShrinkageFormError(null);

    const product = nonKitProducts.find((p) => p.id === selectedProductId);
    if (!product) {
      setShrinkageFormError("Selecciona un producto válido.");
      return;
    }
    const parsedQty = Number(shrinkageQty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setShrinkageFormError("Ingresa una cantidad mayor a cero.");
      return;
    }

    const result = adjustProductStock({
      productId: product.id,
      delta: -Math.abs(parsedQty),
      type: shrinkageType,
      reason: shrinkageReason,
      user: viewer?.name ?? "Administrador",
    });

    if (!result.ok) {
      setShrinkageFormError(result.error);
      return;
    }

    toast.success(
      `Merma registrada: -${parsedQty} ${
        businessConfig.logistics.units[product.unit].short
      } de "${product.name}" (${formatPrice(
        Math.round(parsedQty * product.effectiveCost),
      )} al costo).`,
    );
    setShrinkageSheetOpen(false);
  }

  function openNewReturnSheet() {
    const firstOrder = eligibleOrders[0];
    setSelectedOrderId(firstOrder?.id ?? "");
    setReturnQuantities({});
    setRefundMethod("efectivo");
    setReturnReason("");
    setReturnFormError(null);
    setReturnSheetOpen(true);
  }

  const selectedOrder = useMemo(
    () => eligibleOrders.find((order) => order.id === selectedOrderId) ?? null,
    [eligibleOrders, selectedOrderId],
  );

  const selectedOrderLines = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items.map((item, lineIndex) => {
      const alreadyReturned = getReturnedQuantityForOrderLine(
        selectedOrder.id,
        lineIndex,
      );
      const availableToReturn = Math.max(0, item.quantity - alreadyReturned);
      const requestedQty = Math.min(
        availableToReturn,
        Math.max(0, returnQuantities[lineIndex] ?? 0),
      );
      return {
        lineIndex,
        productId: item.productId,
        productName: item.name,
        soldQuantity: item.quantity,
        alreadyReturned,
        availableToReturn,
        unitPrice: item.price,
        requestedQty,
        subtotalRefund: Math.round(requestedQty * item.price),
      };
    });
  }, [selectedOrder, returnQuantities]);

  const totalRefundPreview = useMemo(
    () => selectedOrderLines.reduce((acc, line) => acc + line.subtotalRefund, 0),
    [selectedOrderLines],
  );

  function handleSavePartialReturn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReturnFormError(null);

    if (!selectedOrder) {
      setReturnFormError("Selecciona un pedido para registrar la devolución.");
      return;
    }

    const linesToReturn = selectedOrderLines
      .filter((line) => line.requestedQty > 0)
      .map((line) => ({
        lineIndex: line.lineIndex,
        quantity: line.requestedQty,
      }));

    const result = createPartialReturn({
      orderId: selectedOrder.id,
      lines: linesToReturn,
      refundMethod,
      reason: returnReason,
      user: viewer?.name ?? "Administrador",
    });

    if (!result.ok) {
      setReturnFormError(result.error);
      return;
    }

    toast.success(
      `Devolución registrada en pedido ${result.value.orderNumber} por ${formatPrice(
        result.value.totalRefund,
      )}. El stock fue repuesto automáticamente.`,
    );
    setReturnSheetOpen(false);
    setActiveTab("devoluciones");
  }

  const selectedShrinkageProduct = useMemo(
    () => nonKitProducts.find((p) => p.id === selectedProductId) ?? null,
    [nonKitProducts, selectedProductId],
  );

  if (!isReady) {
    return (
      <div className="space-y-6">
        <LogisticsLoadingSkeleton />
      </div>
    );
  }

  if (runtimeError) {
    return (
      <div className="space-y-6">
        <LogisticsErrorState
          description={runtimeError}
          onRetry={() => setRuntimeError(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mermas y devoluciones"
        description="Control valorizado al costo de roturas, vencimientos, faltantes y devoluciones parciales de pedidos con reposición automática de stock."
        actions={
          <>
            <Select
              value={period}
              items={PERIOD_ITEMS}
              onValueChange={(value) => {
                if (value) setPeriod(value as PeriodFilter);
              }}
            >
              <SelectTrigger
                aria-label="Período de consulta"
                className="h-11 min-w-44 rounded-xl px-3.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
                <SelectItem value="365">Último año</SelectItem>
                <SelectItem value="all">Todo el historial</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={openNewReturnSheet}
              className="h-11 gap-2 rounded-xl px-4 font-semibold"
            >
              <Undo2 className="size-4" />
              Devolución parcial
            </Button>

            <Button
              type="button"
              onClick={openNewShrinkageSheet}
              className="h-11 gap-2 rounded-xl px-5 font-bold"
            >
              <Plus className="size-4" />
              Registrar merma
            </Button>
          </>
        }
      />

      <StatCards stats={stats} />

      {/* Desglose rápido e interactivo por tipo de merma */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SHRINKAGE_TYPES.map((type) => {
          const summary = metrics.byType[type];
          const active = activeTab === "mermas" && typeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveTab("mermas");
                setTypeFilter((current) => (current === type ? "all" : type));
              }}
              className={cn(
                "bg-card flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-primary ring-primary/20 ring-2"
                  : "hover:border-foreground/25",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold",
                    SHRINKAGE_TYPE_STYLES[type],
                  )}
                >
                  {businessConfig.logistics.movementTypes[type]}
                </span>
                <span className="text-muted-foreground text-xs font-semibold tabular-nums">
                  {summary.count} reg.
                </span>
              </div>
              <div className="mt-3">
                <p className="font-heading text-xl font-extrabold tabular-nums">
                  {formatPrice(summary.total)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {summary.units} u. dadas de baja
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controles de pestaña y buscador */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTabs
          id="shrinkage-tabs"
          label="Vistas de mermas y devoluciones"
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "mermas" && typeFilter !== "all" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter("all")}
              className="h-9 rounded-lg text-xs font-semibold"
            >
              Limpiar filtro: {businessConfig.logistics.movementTypes[typeFilter]}
            </Button>
          )}
          <div className="relative min-w-64 flex-1 sm:flex-none">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                activeTab === "mermas"
                  ? "Buscar por producto, motivo o autor..."
                  : "Buscar por pedido, cliente o motivo..."
              }
              aria-label="Buscar registros"
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabla principal según pestaña activa */}
      {activeTab === "mermas" ? (
        filteredShrinkages.length === 0 ? (
          <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
            <div className="bg-muted mb-3 grid size-12 place-items-center rounded-2xl">
              <PackageMinus className="text-muted-foreground size-6" />
            </div>
            <h3 className="text-lg font-bold">Sin mermas registradas en este período</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Registra roturas, vencimientos, faltantes o consumo del equipo para conocer
              el impacto exacto al costo sobre tu margen real.
            </p>
            <Button
              type="button"
              onClick={openNewShrinkageSheet}
              className="mt-4 h-10 gap-2 rounded-xl px-4 font-semibold"
            >
              <Plus className="size-4" />
              Registrar primera merma
            </Button>
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-5">Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Pérdida total</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="pr-5">Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShrinkages.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-muted-foreground pl-5 text-xs whitespace-nowrap">
                      {formatDateTime(record.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">{record.productName}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold",
                          SHRINKAGE_TYPE_STYLES[record.type],
                        )}
                      >
                        {businessConfig.logistics.movementTypes[record.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      -{Math.abs(record.quantity)}{" "}
                      {businessConfig.logistics.units[record.unit].short}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatPrice(record.unitCost)}
                    </TableCell>
                    <TableCell className="text-destructive text-right font-bold tabular-nums">
                      -{formatPrice(record.totalValue)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {record.reason}
                    </TableCell>
                    <TableCell className="text-muted-foreground pr-5 text-xs">
                      {record.user}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : filteredReturns.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
          <div className="bg-muted mb-3 grid size-12 place-items-center rounded-2xl">
            <Undo2 className="text-muted-foreground size-6" />
          </div>
          <h3 className="text-lg font-bold">Sin devoluciones parciales registradas</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Cuando un cliente devuelve uno o más productos de un pedido sin anular toda la
            venta, regístralo aquí para reponer el stock y dejar asentado el reintegro.
          </p>
          <Button
            type="button"
            onClick={openNewReturnSheet}
            className="mt-4 h-10 gap-2 rounded-xl px-4 font-semibold"
          >
            <Undo2 className="size-4" />
            Registrar devolución parcial
          </Button>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ítems devueltos (repuestos al stock)</TableHead>
                <TableHead>Medio de reintegro</TableHead>
                <TableHead className="text-right">Total reintegrado</TableHead>
                <TableHead className="pr-5">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground pl-5 text-xs whitespace-nowrap">
                    {formatDateTime(record.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold">
                    {record.orderNumber}
                  </TableCell>
                  <TableCell className="font-medium">{record.customerName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {record.lines.map((line) => (
                        <Badge
                          key={`${record.id}-${line.lineIndex}`}
                          variant="secondary"
                          className="rounded-lg text-xs"
                        >
                          +{line.quantity}x {line.productName}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg">
                      {businessConfig.logistics.refundMethods[record.refundMethod]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatPrice(record.totalRefund)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate pr-5 text-sm">
                    {record.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet: Registrar Merma Valorizada */}
      <Sheet open={shrinkageSheetOpen} onOpenChange={setShrinkageSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Registrar merma o baja de stock</SheetTitle>
            <SheetDescription>
              Descuenta unidades del inventario físico y valoriza la pérdida al costo
              unitario actual del producto.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSaveShrinkage} className="mt-6 space-y-5 px-4 pb-6">
            {shrinkageFormError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>{shrinkageFormError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="shrinkage-product">Producto afectado</Label>
              <Select
                value={selectedProductId}
                items={productSelectItems}
                onValueChange={(value) => {
                  if (value) setSelectedProductId(value);
                }}
              >
                <SelectTrigger id="shrinkage-product" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {nonKitProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.effectiveStock}{" "}
                      {businessConfig.logistics.units[product.unit].short})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shrinkage-type">Tipo de incidente</Label>
                <Select
                  value={shrinkageType}
                  items={SHRINKAGE_TYPE_ITEMS}
                  onValueChange={(value) => {
                    if (value) setShrinkageType(value as ShrinkageType);
                  }}
                >
                  <SelectTrigger id="shrinkage-type" className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHRINKAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {businessConfig.logistics.movementTypes[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shrinkage-qty">
                  Cantidad a dar de baja (
                  {selectedShrinkageProduct
                    ? businessConfig.logistics.units[selectedShrinkageProduct.unit].short
                    : "und"}
                  )
                </Label>
                <Input
                  id="shrinkage-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={shrinkageQty}
                  onChange={(event) => setShrinkageQty(event.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            {selectedShrinkageProduct && (
              <div className="bg-muted/50 grid grid-cols-3 gap-3 rounded-2xl border p-4 text-center">
                <div>
                  <p className="text-muted-foreground text-xs">Stock actual → nuevo</p>
                  <p className="mt-1 font-bold tabular-nums">
                    {selectedShrinkageProduct.effectiveStock} →{" "}
                    {selectedShrinkageProduct.effectiveStock -
                      (Number(shrinkageQty) || 0)}{" "}
                    {businessConfig.logistics.units[selectedShrinkageProduct.unit].short}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Costo unitario</p>
                  <p className="mt-1 font-bold tabular-nums">
                    {formatPrice(selectedShrinkageProduct.effectiveCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pérdida al costo</p>
                  <p className="text-destructive mt-1 font-extrabold tabular-nums">
                    -
                    {formatPrice(
                      Math.round(
                        (Number(shrinkageQty) || 0) *
                          selectedShrinkageProduct.effectiveCost,
                      ),
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="shrinkage-reason">Motivo detallado (obligatorio)</Label>
              <Textarea
                id="shrinkage-reason"
                value={shrinkageReason}
                onChange={(event) => setShrinkageReason(event.target.value)}
                placeholder="Ej.: 2 medallones sobrecocidos en plancha durante hora pico..."
                rows={3}
                className="rounded-xl"
                required
              />
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShrinkageSheetOpen(false)}
                className="h-11 rounded-xl"
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-11 rounded-xl font-bold">
                Confirmar baja y valorizar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Devolución Parcial de Pedido */}
      <Sheet open={returnSheetOpen} onOpenChange={setReturnSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Devolución parcial de pedido</SheetTitle>
            <SheetDescription>
              Selecciona el pedido original, indica cuántas unidades devuelve el cliente
              por línea y el sistema repondrá el stock automáticamente.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSavePartialReturn} className="mt-6 space-y-5 px-4 pb-6">
            {returnFormError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
              >
                <ShieldAlert className="size-4 shrink-0" />
                <span>{returnFormError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="return-order">Pedido original</Label>
              <Select
                value={selectedOrderId}
                items={orderSelectItems}
                onValueChange={(value) => {
                  if (value) {
                    setSelectedOrderId(value);
                    setReturnQuantities({});
                  }
                }}
              >
                <SelectTrigger id="return-order" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Selecciona un pedido" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.id} · {order.customerName} ({formatPrice(order.total)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOrder && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Líneas del pedido {selectedOrder.id}</Label>
                  <span className="text-muted-foreground text-xs">
                    Cliente: <strong>{selectedOrder.customerName}</strong>
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Vendido</TableHead>
                        <TableHead className="text-center">Ya dev.</TableHead>
                        <TableHead className="text-center">Disp.</TableHead>
                        <TableHead className="w-28 text-right">Devolver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderLines.map((line) => (
                        <TableRow key={line.lineIndex}>
                          <TableCell>
                            <p className="font-semibold">{line.productName}</p>
                            <p className="text-muted-foreground text-xs tabular-nums">
                              {formatPrice(line.unitPrice)} c/u
                            </p>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {line.soldQuantity}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-center tabular-nums">
                            {line.alreadyReturned}
                          </TableCell>
                          <TableCell className="text-center font-semibold tabular-nums">
                            {line.availableToReturn}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={line.availableToReturn}
                              disabled={line.availableToReturn === 0}
                              value={line.requestedQty}
                              onChange={(event) => {
                                const val = Math.max(
                                  0,
                                  Math.min(
                                    line.availableToReturn,
                                    Number(event.target.value) || 0,
                                  ),
                                );
                                setReturnQuantities((prev) => ({
                                  ...prev,
                                  [line.lineIndex]: val,
                                }));
                              }}
                              aria-label={`Cantidad a devolver de ${line.productName}`}
                              className="ml-auto h-9 w-20 rounded-lg text-right tabular-nums"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="refund-method">Medio de reintegro</Label>
                <Select
                  value={refundMethod}
                  items={REFUND_METHOD_ITEMS}
                  onValueChange={(value) => {
                    if (value) setRefundMethod(value as RefundMethod);
                  }}
                >
                  <SelectTrigger id="refund-method" className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">
                      {businessConfig.logistics.refundMethods.efectivo}
                    </SelectItem>
                    <SelectItem value="monedero">
                      {businessConfig.logistics.refundMethods.monedero}
                    </SelectItem>
                    <SelectItem value="otro">
                      {businessConfig.logistics.refundMethods.otro}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 flex flex-col justify-center rounded-2xl border px-4 py-3">
                <span className="text-muted-foreground text-xs">
                  Total a reintegrar al cliente
                </span>
                <span className="font-heading text-2xl font-extrabold tabular-nums">
                  {formatPrice(totalRefundPreview)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-reason">Motivo de la devolución</Label>
              <Textarea
                id="return-reason"
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                placeholder="Ej.: Producto llegó frío o el cliente solicitó cambiar un ítem..."
                rows={3}
                className="rounded-xl"
                required
              />
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReturnSheetOpen(false)}
                className="h-11 rounded-xl"
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-11 rounded-xl font-bold">
                Registrar devolución y reponer stock
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
