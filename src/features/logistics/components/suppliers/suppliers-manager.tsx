"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Building2,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  Truck,
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
import {
  ConfirmDialog,
  PageHeader,
  SectionTabs,
  StatCards,
  type SectionTab,
  type Stat,
} from "@/features/admin";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLogistics } from "../../hooks/use-logistics";
import { foldText } from "../../schemas/logistics.schema";
import { downloadCsv } from "../../services/csv-export";
import { formatCuit } from "../../services/cuit";
import { updatePurchaseOrderStatus } from "../../services/logistics-store";
import type {
  GoodsReceipt,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from "../../types";
import {
  LogisticsErrorState,
  LogisticsLoadingSkeleton,
  LogisticsNav,
} from "../logistics-nav";
import { GoodsReceiptTab } from "./goods-receipt-tab";
import {
  InvoiceScanSheet,
  PurchaseOrderDetailDialog,
  PurchaseOrderSheet,
  SupplierCreditNoteSheet,
  SupplierFormSheet,
  SupplierPaymentSheet,
  type PrefilledReceiptHeader,
} from "./supplier-dialogs";

type SuppliersTabId = "proveedores" | "ordenes" | "remito" | "cuenta";
type SupplierFilter = "activos" | "con-deuda" | "al-dia" | "archivados";

const PO_STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  Borrador: "border-zinc-500/30 bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  Solicitada:
    "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Recibida:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelada: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function SuppliersManager() {
  const {
    isReady,
    items,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    supplierLedger,
  } = useLogistics();

  const [activeTab, setActiveTab] = useState<SuppliersTabId>("proveedores");
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>("activos");
  const [poStatusFilter, setPoStatusFilter] = useState<
    PurchaseOrderStatus | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLedgerSupplierId, setSelectedLedgerSupplierId] =
    useState<string>("");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Modales y Sheets
  const [supplierSheetOpen, setSupplierSheetOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [poSheetOpen, setPoSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [defaultPoSupplierId, setDefaultPoSupplierId] = useState<
    string | undefined
  >(undefined);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] =
    useState<PurchaseOrder | null>(null);

  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [creditNoteSupplier, setCreditNoteSupplier] = useState<Supplier | null>(
    null,
  );
  const [invoiceScanOpen, setInvoiceScanOpen] = useState(false);

  // Pre-carga para la pestaña "Carga de remito"
  const [prefilledOrder, setPrefilledOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [prefilledHeader, setPrefilledHeader] =
    useState<PrefilledReceiptHeader | null>(null);

  // Detalle de remito histórico
  const [viewingReceipt, setViewingReceipt] = useState<GoodsReceipt | null>(
    null,
  );

  const supplierById = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const s of suppliers) {
      map.set(s.id, s);
    }
    return map;
  }, [suppliers]);

  const effectiveLedgerSupplierId =
    selectedLedgerSupplierId || suppliers[0]?.id || "";

  const activeSuppliersCount = useMemo(
    () => suppliers.filter((s) => s.active).length,
    [suppliers],
  );

  const totalSupplierDebt = useMemo(
    () =>
      suppliers
        .filter((s) => s.active && s.balance > 0)
        .reduce((acc, s) => acc + s.balance, 0),
    [suppliers],
  );

  const pendingPurchaseOrdersCount = useMemo(
    () => purchaseOrders.filter((po) => po.status === "Solicitada").length,
    [purchaseOrders],
  );

  const totalReceiptsAmount = useMemo(
    () => goodsReceipts.reduce((acc, r) => acc + r.total, 0),
    [goodsReceipts],
  );

  const stats: Stat[] = useMemo(
    () => [
      {
        label: "Deuda total a proveedores",
        value: formatPrice(totalSupplierDebt),
        hint: `${
          suppliers.filter((s) => s.active && s.balance > 0).length
        } proveedor(es) con saldo pendiente`,
        icon: Wallet,
      },
      {
        label: "Órdenes pendientes de recepción",
        value: String(pendingPurchaseOrdersCount),
        hint: `${purchaseOrders.length} orden(es) de compra en total`,
        icon: ClipboardList,
      },
      {
        label: "Remitos y facturas ingresadas",
        value: String(goodsReceipts.length),
        hint: `${formatPrice(totalReceiptsAmount)} en compras registradas`,
        icon: Receipt,
      },
      {
        label: "Proveedores activos",
        value: String(activeSuppliersCount),
        hint: `${suppliers.length} registrado(s) en padrón`,
        icon: Truck,
      },
    ],
    [
      totalSupplierDebt,
      suppliers,
      pendingPurchaseOrdersCount,
      purchaseOrders.length,
      goodsReceipts.length,
      totalReceiptsAmount,
      activeSuppliersCount,
    ],
  );

  const tabs: SectionTab<SuppliersTabId>[] = [
    {
      value: "proveedores",
      label: "Proveedores",
      icon: Building2,
      count: activeSuppliersCount,
    },
    {
      value: "ordenes",
      label: "Órdenes de compra",
      icon: ClipboardList,
      count: pendingPurchaseOrdersCount,
    },
    {
      value: "remito",
      label: "Carga de remito",
      icon: PackageCheck,
    },
    {
      value: "cuenta",
      label: "Cuenta corriente",
      icon: CreditCard,
      count: supplierLedger.length,
    },
  ];

  const filteredSuppliers = useMemo(() => {
    const q = foldText(searchQuery);
    return suppliers.filter((supplier) => {
      if (supplierFilter === "activos" && !supplier.active) return false;
      if (supplierFilter === "archivados" && supplier.active) return false;
      if (
        supplierFilter === "con-deuda" &&
        (!supplier.active || supplier.balance <= 0)
      ) {
        return false;
      }
      if (
        supplierFilter === "al-dia" &&
        (!supplier.active || supplier.balance > 0)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        foldText(supplier.businessName).includes(q) ||
        foldText(supplier.cuit).includes(q) ||
        foldText(formatCuit(supplier.cuit)).includes(q) ||
        foldText(supplier.phone).includes(q) ||
        foldText(supplier.email).includes(q)
      );
    });
  }, [suppliers, supplierFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    const q = foldText(searchQuery);
    return purchaseOrders.filter((po) => {
      if (poStatusFilter !== "all" && po.status !== poStatusFilter) return false;
      if (!q) return true;
      const supName = supplierById.get(po.supplierId)?.businessName ?? "";
      return (
        foldText(po.code).includes(q) ||
        foldText(supName).includes(q) ||
        po.items.some((item) => foldText(item.productName).includes(q))
      );
    });
  }, [purchaseOrders, poStatusFilter, searchQuery, supplierById]);

  const currentLedgerSupplier = useMemo(
    () => suppliers.find((s) => s.id === effectiveLedgerSupplierId) ?? null,
    [suppliers, effectiveLedgerSupplierId],
  );

  const currentSupplierMovements = useMemo(
    () =>
      supplierLedger.filter(
        (entry) => entry.supplierId === effectiveLedgerSupplierId,
      ),
    [supplierLedger, effectiveLedgerSupplierId],
  );

  const currentSupplierReceipts = useMemo(
    () =>
      goodsReceipts.filter(
        (receipt) => receipt.supplierId === effectiveLedgerSupplierId,
      ),
    [goodsReceipts, effectiveLedgerSupplierId],
  );

  const supplierSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of suppliers) {
      map[s.id] = `${s.businessName} · Saldo: ${formatPrice(s.balance)}`;
    }
    return map;
  }, [suppliers]);

  function handleExportCsv() {
    try {
      if (activeTab === "ordenes") {
        if (filteredOrders.length === 0) {
          toast.error("No hay órdenes de compra para exportar.");
          return;
        }
        downloadCsv(
          `ordenes-compra-burger-vb-${new Date().toISOString().slice(0, 10)}.csv`,
          [
            "Código",
            "Fecha",
            "Proveedor",
            "Artículos",
            "Total estimado",
            "Estado",
          ],
          filteredOrders.map((po) => [
            po.code,
            formatDateTime(po.createdAt),
            supplierById.get(po.supplierId)?.businessName ?? "Proveedor",
            po.items.map((i) => `${i.quantity}x ${i.productName}`).join(" | "),
            po.total,
            po.status,
          ]),
        );
        toast.success(`CSV exportado (${filteredOrders.length} orden(es)).`);
        return;
      }

      if (activeTab === "cuenta" && currentLedgerSupplier) {
        if (currentSupplierMovements.length === 0) {
          toast.error("Este proveedor aún no registra movimientos.");
          return;
        }
        downloadCsv(
          `cuenta-corriente-${foldText(currentLedgerSupplier.businessName).replace(
            /\s+/g,
            "-",
          )}.csv`,
          ["Fecha", "Tipo", "Referencia", "Importe", "Saldo resultante"],
          currentSupplierMovements.map((entry) => [
            formatDateTime(entry.createdAt),
            entry.type,
            entry.reference,
            entry.amount,
            entry.balanceAfter,
          ]),
        );
        toast.success(
          `Cuenta corriente de ${currentLedgerSupplier.businessName} exportada a CSV.`,
        );
        return;
      }

      if (filteredSuppliers.length === 0) {
        toast.error("No hay proveedores en la vista actual para exportar.");
        return;
      }
      downloadCsv(
        `proveedores-burger-vb-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Razón social",
          "CUIT",
          "Condición IVA",
          "Teléfono",
          "Email",
          "Dirección",
          "Saldo cuenta corriente",
          "Estado",
        ],
        filteredSuppliers.map((s) => [
          s.businessName,
          formatCuit(s.cuit),
          s.ivaCondition,
          s.phone,
          s.email,
          s.address,
          s.balance,
          s.active ? "Activo" : "Archivado",
        ]),
      );
      toast.success(`CSV exportado (${filteredSuppliers.length} proveedor(es)).`);
    } catch (err) {
      setRuntimeError(
        err instanceof Error ? err.message : "Error al exportar CSV.",
      );
    }
  }

  function handleMarkOrderSolicitada(order: PurchaseOrder) {
    const result = updatePurchaseOrderStatus(order.id, "Solicitada");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Orden de compra ${order.code} marcada como Solicitada.`);
  }

  function handleReceiveFromOrder(order: PurchaseOrder) {
    setPrefilledOrder(order);
    setPrefilledHeader(null);
    setActiveTab("remito");
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <LogisticsNav />
        <LogisticsLoadingSkeleton />
      </div>
    );
  }

  if (runtimeError) {
    return (
      <div className="space-y-6">
        <LogisticsNav />
        <LogisticsErrorState
          description={runtimeError}
          onRetry={() => setRuntimeError(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LogisticsNav />

      <PageHeader
        title="Proveedores y compras"
        description="Padrón con validación CUIT ARCA, órdenes de compra, recepción de remitos con actualización automática de costos y cuenta corriente."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              className="h-11 gap-2 rounded-xl px-4 font-semibold"
            >
              <Download className="size-4" />
              Exportar CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setInvoiceScanOpen(true)}
              className="h-11 gap-2 rounded-xl px-4 font-semibold"
            >
              <FileCheck2 className="size-4" />
              Cargar factura foto/PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingOrder(null);
                setDefaultPoSupplierId(undefined);
                setPoSheetOpen(true);
              }}
              className="h-11 gap-2 rounded-xl px-4 font-semibold"
            >
              <FilePlus2 className="size-4" />
              + Orden de compra
            </Button>

            <Button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setSupplierSheetOpen(true);
              }}
              className="h-11 gap-2 rounded-xl px-5 font-bold"
            >
              <Plus className="size-4" />
              + Proveedor
            </Button>
          </>
        }
      />

      <StatCards stats={stats} />

      {/* Navegación interna de las 4 sub-secciones */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionTabs
          id="suppliers-tabs"
          label="Vistas de proveedores y compras"
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />

        {(activeTab === "proveedores" || activeTab === "ordenes") && (
          <div className="relative min-w-64 flex-1 lg:max-w-xs">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                activeTab === "proveedores"
                  ? "Buscar por razón social, CUIT o teléfono..."
                  : "Buscar por código, proveedor o ítem..."
              }
              aria-label="Buscar"
              className="h-11 rounded-xl pl-10"
            />
          </div>
        )}
      </div>

      {/* =====================================================================
       * SUB-TAB 1: PROVEEDORES
       * =================================================================== */}
      {activeTab === "proveedores" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "activos", label: "Activos" },
                { id: "con-deuda", label: "Con saldo a pagar" },
                { id: "al-dia", label: "Al día ($0)" },
                { id: "archivados", label: "Archivados" },
              ] as const
            ).map((pill) => (
              <Button
                key={pill.id}
                type="button"
                size="sm"
                variant={supplierFilter === pill.id ? "default" : "outline"}
                onClick={() => setSupplierFilter(pill.id)}
                className="h-9 rounded-xl px-3.5 text-xs font-semibold"
              >
                {pill.label}
              </Button>
            ))}
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
              <div className="bg-muted mb-3 grid size-12 place-items-center rounded-2xl">
                <Building2 className="text-muted-foreground size-6" />
              </div>
              <h3 className="text-lg font-bold">
                Sin proveedores en este filtro
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Registra tus proveedores habituales con su CUIT validado para emitir
                órdenes de compra y llevar su cuenta corriente al día.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierSheetOpen(true);
                }}
                className="mt-4 h-10 gap-2 rounded-xl px-4 font-semibold"
              >
                <Plus className="size-4" />
                Dar de alta proveedor
              </Button>
            </div>
          ) : (
            <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-5">Razón social</TableHead>
                    <TableHead>CUIT / IVA</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">
                      Saldo cuenta corriente
                    </TableHead>
                    <TableHead className="pr-5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => {
                    const balance = supplier.balance;
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{supplier.businessName}</p>
                            {!supplier.active && (
                              <Badge variant="outline" className="text-[10px]">
                                Archivado
                              </Badge>
                            )}
                          </div>
                          {supplier.address && (
                            <p className="text-muted-foreground text-xs">
                              {supplier.address}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold">
                            {formatCuit(supplier.cuit)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {supplier.ivaCondition}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">
                            {supplier.phone || "—"}
                          </p>
                          <p className="text-muted-foreground max-w-xs truncate text-xs">
                            {supplier.email || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-heading text-base font-extrabold tabular-nums",
                              balance > 0
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {formatPrice(balance)}
                          </span>
                          <p className="text-muted-foreground text-[11px]">
                            {balance > 0
                              ? "Deuda pendiente"
                              : balance < 0
                                ? "Saldo a favor"
                                : "Al día"}
                          </p>
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLedgerSupplierId(supplier.id);
                                setActiveTab("cuenta");
                              }}
                              className="h-8 rounded-lg px-2.5 text-xs font-semibold"
                            >
                              Cuenta cte.
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPrefilledHeader({
                                  supplierId: supplier.id,
                                  receiptType: "Factura",
                                  receiptNumber: "",
                                  receptionDate: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                });
                                setPrefilledOrder(null);
                                setActiveTab("remito");
                              }}
                              className="h-8 rounded-lg px-2.5 text-xs"
                            >
                              + Remito
                            </Button>
                            {balance > 0 && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setPaymentSupplier(supplier)}
                                className="h-8 rounded-lg px-2.5 text-xs font-bold"
                              >
                                Pagar
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setSupplierSheetOpen(true);
                              }}
                              aria-label={`Editar ${supplier.businessName}`}
                              className="size-8 rounded-lg"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * SUB-TAB 2: ÓRDENES DE COMPRA
       * =================================================================== */}
      {activeTab === "ordenes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: "Todas" },
                { id: "Borrador", label: "Borradores" },
                { id: "Solicitada", label: "Solicitadas (pendientes)" },
                { id: "Recibida", label: "Recibidas" },
                { id: "Cancelada", label: "Canceladas" },
              ] as const
            ).map((pill) => (
              <Button
                key={pill.id}
                type="button"
                size="sm"
                variant={poStatusFilter === pill.id ? "default" : "outline"}
                onClick={() => setPoStatusFilter(pill.id)}
                className="h-9 rounded-xl px-3.5 text-xs font-semibold"
              >
                {pill.label}
              </Button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
              <div className="bg-muted mb-3 grid size-12 place-items-center rounded-2xl">
                <ClipboardList className="text-muted-foreground size-6" />
              </div>
              <h3 className="text-lg font-bold">
                Sin órdenes de compra para mostrar
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Arma un pedido a proveedor en borrador o márcalo como Solicitado para
                controlar qué mercadería está pendiente de entrega.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setPoSheetOpen(true);
                }}
                className="mt-4 h-10 gap-2 rounded-xl px-4 font-semibold"
              >
                <Plus className="size-4" />
                Crear orden de compra
              </Button>
            </div>
          ) : (
            <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="pl-5">Código</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Artículos pedidos</TableHead>
                    <TableHead className="text-right">Total estimado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="pr-5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((po) => {
                    const supName =
                      supplierById.get(po.supplierId)?.businessName ??
                      "Proveedor";
                    return (
                      <TableRow key={po.id}>
                        <TableCell className="pl-5 font-mono font-extrabold">
                          {po.code}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDateTime(po.createdAt)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {supName}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {po.items.map((item) => (
                              <Badge
                                key={`${po.id}-${item.productId}`}
                                variant="secondary"
                                className="rounded-lg text-xs"
                              >
                                {item.quantity}x {item.productName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatPrice(po.total)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold",
                              PO_STATUS_STYLES[po.status],
                            )}
                          >
                            {po.status}
                          </span>
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingOrder(po)}
                              className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                            >
                              <Eye className="size-3.5" />
                              Ver
                            </Button>
                            {po.status === "Borrador" && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOrder(po);
                                    setPoSheetOpen(true);
                                  }}
                                  className="h-8 rounded-lg px-2.5 text-xs"
                                >
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleMarkOrderSolicitada(po)}
                                  className="h-8 gap-1 rounded-lg px-2.5 text-xs font-bold"
                                >
                                  <Send className="size-3.5" />
                                  Solicitar
                                </Button>
                              </>
                            )}
                            {po.status === "Solicitada" && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleReceiveFromOrder(po)}
                                className="h-8 gap-1 rounded-lg px-2.5 text-xs font-bold"
                              >
                                <PackageCheck className="size-3.5" />
                                Recibir mercadería
                              </Button>
                            )}
                            {(po.status === "Borrador" ||
                              po.status === "Solicitada") && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setCancelOrderTarget(po)}
                                aria-label={`Cancelar orden ${po.code}`}
                                className="text-destructive hover:text-destructive size-8 rounded-lg"
                              >
                                <Ban className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * SUB-TAB 3: CARGA DE REMITO / RECEPCIÓN DE MERCADERÍA
       * =================================================================== */}
      {activeTab === "remito" && (
        <GoodsReceiptTab
          suppliers={suppliers}
          products={items}
          purchaseOrders={purchaseOrders}
          prefilledOrder={prefilledOrder}
          prefilledHeader={prefilledHeader}
          onClearPrefill={() => {
            setPrefilledOrder(null);
            setPrefilledHeader(null);
          }}
          onViewSupplierLedger={(supplierId) => {
            setSelectedLedgerSupplierId(supplierId);
            setActiveTab("cuenta");
          }}
        />
      )}

      {/* =====================================================================
       * SUB-TAB 4: CUENTA CORRIENTE DE PROVEEDORES
       * =================================================================== */}
      {activeTab === "cuenta" && (
        <div className="space-y-6">
          <div className="bg-card flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-sm lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-72">
                <p className="text-muted-foreground mb-1 text-xs font-semibold">
                  Seleccionar proveedor
                </p>
                <Select
                  value={effectiveLedgerSupplierId}
                  items={supplierSelectItems}
                  onValueChange={(value) => {
                    if (value) setSelectedLedgerSupplierId(value);
                  }}
                >
                  <SelectTrigger
                    aria-label="Seleccionar proveedor para cuenta corriente"
                    className="h-11 w-full rounded-xl font-semibold"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.businessName} · Saldo: {formatPrice(s.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentLedgerSupplier && (
                <div className="border-l pl-4">
                  <p className="text-muted-foreground text-xs">
                    CUIT {formatCuit(currentLedgerSupplier.cuit)} ·{" "}
                    {currentLedgerSupplier.ivaCondition}
                  </p>
                  <p className="font-heading mt-0.5 text-2xl font-extrabold tabular-nums">
                    Saldo actual:{" "}
                    <span
                      className={
                        currentLedgerSupplier.balance > 0
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }
                    >
                      {formatPrice(currentLedgerSupplier.balance)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {currentLedgerSupplier && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreditNoteSupplier(currentLedgerSupplier)}
                  className="h-10 rounded-xl font-semibold"
                >
                  + Nota de crédito
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPrefilledHeader({
                      supplierId: currentLedgerSupplier.id,
                      receiptType: "Factura",
                      receiptNumber: "",
                      receptionDate: new Date().toISOString().slice(0, 10),
                    });
                    setPrefilledOrder(null);
                    setActiveTab("remito");
                  }}
                  className="h-10 rounded-xl font-semibold"
                >
                  + Cargar factura / remito
                </Button>
                <Button
                  type="button"
                  onClick={() => setPaymentSupplier(currentLedgerSupplier)}
                  className="h-10 rounded-xl font-bold"
                >
                  Registrar pago
                </Button>
              </div>
            )}
          </div>

          {/* Tabla de movimientos de cuenta corriente */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold">
              Libro mayor de movimientos (Facturas, Remitos, Pagos y Notas de crédito)
            </h3>

            {currentSupplierMovements.length === 0 ? (
              <div className="bg-card rounded-2xl border p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Este proveedor aún no tiene movimientos en su cuenta corriente.
                </p>
              </div>
            ) : (
              <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-5">Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Referencia / Motivo</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="pr-5 text-right">
                        Saldo acumulado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSupplierMovements.map((entry) => {
                      const increasesDebt =
                        entry.type === "Factura" || entry.type === "Remito";
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-muted-foreground pl-5 text-xs whitespace-nowrap">
                            {formatDateTime(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={increasesDebt ? "secondary" : "outline"}
                              className="rounded-lg text-xs"
                            >
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-mono text-xs font-semibold">
                              {entry.reference}
                            </p>
                            {entry.reason && (
                              <p className="text-muted-foreground text-xs">
                                {entry.reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-bold tabular-nums",
                              increasesDebt
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {increasesDebt ? "+" : "-"}
                            {formatPrice(entry.amount)}
                          </TableCell>
                          <TableCell className="pr-5 text-right font-extrabold tabular-nums">
                            {formatPrice(entry.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Historial de remitos y facturas ingresadas de este proveedor */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold">
              Comprobantes de mercadería recibidos de este proveedor
            </h3>

            {currentSupplierReceipts.length === 0 ? (
              <div className="bg-card rounded-2xl border p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Sin remitos ni facturas cargadas para este proveedor.
                </p>
              </div>
            ) : (
              <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-5">Fecha</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Artículos ingresados</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="pr-5 text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSupplierReceipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="text-muted-foreground pl-5 text-xs">
                          {formatDate(receipt.receptionDate)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          {receipt.receiptType} {receipt.receiptNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {receipt.items.map((item) => (
                              <Badge
                                key={`${receipt.id}-${item.productId}`}
                                variant="secondary"
                                className="rounded-lg text-xs"
                              >
                                +{item.quantity}x {item.productName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {receipt.paymentCondition === "credito"
                            ? "Cuenta corriente"
                            : "Al contado"}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatPrice(receipt.total)}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingReceipt(receipt)}
                            className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                          >
                            <FileText className="size-3.5" />
                            Ver impacto
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheets y Diálogos auxiliares */}
      <SupplierFormSheet
        open={supplierSheetOpen}
        onOpenChange={setSupplierSheetOpen}
        supplier={editingSupplier}
      />

      <PurchaseOrderSheet
        open={poSheetOpen}
        onOpenChange={setPoSheetOpen}
        suppliers={suppliers}
        products={items}
        orderToEdit={editingOrder}
        defaultSupplierId={defaultPoSupplierId}
      />

      <PurchaseOrderDetailDialog
        order={viewingOrder}
        supplierName={
          viewingOrder
            ? supplierById.get(viewingOrder.supplierId)?.businessName ??
              "Proveedor"
            : ""
        }
        onOpenChange={(open) => {
          if (!open) setViewingOrder(null);
        }}
        onReceiveOrder={handleReceiveFromOrder}
      />

      <ConfirmDialog
        open={Boolean(cancelOrderTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelOrderTarget(null);
        }}
        title={`¿Cancelar Orden de Compra ${cancelOrderTarget?.code}?`}
        description="La orden quedará registrada como cancelada y ya no figurará pendiente de recepción."
        confirmLabel="Sí, cancelar orden"
        onConfirm={() => {
          if (!cancelOrderTarget) return;
          const res = updatePurchaseOrderStatus(
            cancelOrderTarget.id,
            "Cancelada",
          );
          if (res.ok) {
            toast.success(
              `Orden de compra ${cancelOrderTarget.code} cancelada.`,
            );
          } else {
            toast.error(res.error);
          }
          setCancelOrderTarget(null);
        }}
      />

      <SupplierPaymentSheet
        open={Boolean(paymentSupplier)}
        onOpenChange={(open) => {
          if (!open) setPaymentSupplier(null);
        }}
        supplier={paymentSupplier}
      />

      <SupplierCreditNoteSheet
        open={Boolean(creditNoteSupplier)}
        onOpenChange={(open) => {
          if (!open) setCreditNoteSupplier(null);
        }}
        supplier={creditNoteSupplier}
      />

      <InvoiceScanSheet
        open={invoiceScanOpen}
        onOpenChange={setInvoiceScanOpen}
        suppliers={suppliers}
        receipts={goodsReceipts}
        onApplyToReceipt={(prefill) => {
          setPrefilledHeader(prefill);
          setPrefilledOrder(null);
          setActiveTab("remito");
        }}
      />

      {/* Sheet: Detalle histórico de remito */}
      <Sheet
        open={Boolean(viewingReceipt)}
        onOpenChange={(open) => {
          if (!open) setViewingReceipt(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              Comprobante {viewingReceipt?.receiptType}{" "}
              {viewingReceipt?.receiptNumber}
            </SheetTitle>
            <SheetDescription>
              Proveedor:{" "}
              <strong>
                {viewingReceipt
                  ? supplierById.get(viewingReceipt.supplierId)?.businessName ??
                    "Proveedor"
                  : ""}
              </strong>{" "}
              · Fecha:{" "}
              {viewingReceipt ? formatDate(viewingReceipt.receptionDate) : ""}
            </SheetDescription>
          </SheetHeader>

          {viewingReceipt && (
            <div className="mt-6 space-y-4 px-4 pb-6">
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Costo ant. → nuevo</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingReceipt.items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-semibold">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center font-bold tabular-nums">
                          +{item.quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs tabular-nums">
                          {item.previousStock} → {item.newStock}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {formatPrice(item.previousCost)} →{" "}
                          {formatPrice(item.newCost)}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatPrice(Math.round(item.quantity * item.unitCost))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground text-xs">
                  Saldo resultante:{" "}
                  {formatPrice(viewingReceipt.supplierBalanceAfter)}
                </span>
                <span className="font-heading text-xl font-extrabold tabular-nums">
                  Total: {formatPrice(viewingReceipt.total)}
                </span>
              </div>

              <SheetFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingReceipt(null)}
                  className="h-11 rounded-xl"
                >
                  Cerrar
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
