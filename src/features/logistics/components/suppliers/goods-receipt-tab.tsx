"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { businessConfig } from "@/config/business.config";
import { getFinalPrice } from "@/features/menu";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatCuit } from "../../services/cuit";
import { receiveGoods } from "../../services/logistics-store";
import type {
  GoodsReceipt,
  InventoryItem,
  PaymentCondition,
  PurchaseOrder,
  ReceiptType,
  Supplier,
  SupplierPaymentMethod,
} from "../../types";
import type { PrefilledReceiptHeader } from "./supplier-dialogs";

type DraftReceiptLine = {
  productId: string;
  quantity: number;
  unitCost: number;
};

type GoodsReceiptTabProps = {
  suppliers: Supplier[];
  products: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  prefilledOrder: PurchaseOrder | null;
  prefilledHeader: PrefilledReceiptHeader | null;
  onClearPrefill: () => void;
  onViewSupplierLedger: (supplierId: string) => void;
};

const DOC_TYPE_ITEMS: Record<ReceiptType, string> = {
  Factura: "Factura de compra",
  Remito: "Remito de entrega",
};

const PAYMENT_METHOD_ITEMS: Record<SupplierPaymentMethod, string> = {
  transferencia: businessConfig.logistics.supplierPaymentMethods.transferencia,
  efectivo: businessConfig.logistics.supplierPaymentMethods.efectivo,
  cheque: businessConfig.logistics.supplierPaymentMethods.cheque,
  tarjeta: businessConfig.logistics.supplierPaymentMethods.tarjeta,
};

export function GoodsReceiptTab({
  suppliers,
  products,
  purchaseOrders,
  prefilledOrder,
  prefilledHeader,
  onClearPrefill,
  onViewSupplierLedger,
}: GoodsReceiptTabProps) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const nonKitProducts = useMemo(
    () => products.filter((p) => !p.isKit && !p.archived),
    [products],
  );

  const [supplierId, setSupplierId] = useState<string>(
    prefilledOrder?.supplierId ??
      prefilledHeader?.supplierId ??
      activeSuppliers[0]?.id ??
      "",
  );
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>(
    prefilledOrder?.id ?? "none",
  );
  const [receiptType, setReceiptType] = useState<ReceiptType>(
    prefilledHeader?.receiptType ?? "Factura",
  );
  const [receiptNumber, setReceiptNumber] = useState<string>(
    prefilledHeader?.receiptNumber ?? "",
  );
  const [receptionDate, setReceptionDate] = useState<string>(
    prefilledHeader?.receptionDate ?? new Date().toISOString().slice(0, 10),
  );
  const [declaredTotal, setDeclaredTotal] = useState<string>(
    prefilledHeader?.declaredTotal ? String(prefilledHeader.declaredTotal) : "",
  );
  const [paymentCondition, setPaymentCondition] =
    useState<PaymentCondition>("credito");
  const [paymentMethod, setPaymentMethod] =
    useState<SupplierPaymentMethod>("transferencia");
  const [notes, setNotes] = useState<string>(prefilledHeader?.notes ?? "");
  const [productToAddId, setProductToAddId] = useState<string>(
    nonKitProducts[0]?.id ?? "",
  );
  const [lines, setLines] = useState<DraftReceiptLine[]>(() => {
    if (prefilledOrder) {
      return prefilledOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.agreedUnitCost,
      }));
    }
    if (nonKitProducts[0]) {
      return [
        {
          productId: nonKitProducts[0].id,
          quantity: 20,
          unitCost: nonKitProducts[0].effectiveCost,
        },
      ];
    }
    return [];
  });

  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<GoodsReceipt | null>(null);

  const [prevPrefillKey, setPrevPrefillKey] = useState<string>("");
  const currentPrefillKey = `${prefilledOrder?.id ?? ""}-${
    prefilledHeader?.receiptNumber ?? ""
  }-${prefilledHeader?.supplierId ?? ""}`;

  if (currentPrefillKey !== prevPrefillKey) {
    setPrevPrefillKey(currentPrefillKey);
    if (prefilledOrder) {
      setSupplierId(prefilledOrder.supplierId);
      setPurchaseOrderId(prefilledOrder.id);
      setLines(
        prefilledOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.agreedUnitCost,
        })),
      );
      setLastReceipt(null);
      setError(null);
    }
    if (prefilledHeader) {
      setSupplierId(prefilledHeader.supplierId);
      setReceiptType(prefilledHeader.receiptType);
      setReceiptNumber(prefilledHeader.receiptNumber);
      setReceptionDate(prefilledHeader.receptionDate);
      setDeclaredTotal(
        prefilledHeader.declaredTotal
          ? String(prefilledHeader.declaredTotal)
          : "",
      );
      if (prefilledHeader.notes) setNotes(prefilledHeader.notes);
      setLastReceipt(null);
      setError(null);
    }
  }

  const supplierPendingOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.supplierId === supplierId && po.status === "Solicitada",
      ),
    [purchaseOrders, supplierId],
  );

  const selectedPurchaseOrder = useMemo(
    () =>
      purchaseOrderId !== "none"
        ? purchaseOrders.find((po) => po.id === purchaseOrderId) ?? null
        : null,
    [purchaseOrders, purchaseOrderId],
  );

  const supplierItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of activeSuppliers) {
      map[s.id] = `${s.businessName} (${formatCuit(s.cuit)})`;
    }
    return map;
  }, [activeSuppliers]);

  const poSelectItems = useMemo(() => {
    const map: Record<string, string> = {
      none: "Sin orden de compra previa (ingreso directo)",
    };
    for (const po of supplierPendingOrders) {
      map[po.id] = `${po.code} · ${po.items.length} ítem(s) · Est. ${formatPrice(
        po.total,
      )}`;
    }
    return map;
  }, [supplierPendingOrders]);

  const productSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of nonKitProducts) {
      map[p.id] = `${p.name} (Stock: ${p.effectiveStock} · Costo: ${formatPrice(
        p.effectiveCost,
      )})`;
    }
    return map;
  }, [nonKitProducts]);

  function handleSelectPurchaseOrder(poId: string) {
    setPurchaseOrderId(poId);
    if (poId === "none") return;
    const found = purchaseOrders.find((po) => po.id === poId);
    if (found) {
      setLines(
        found.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.agreedUnitCost,
        })),
      );
      toast.info(
        `Artículos pre-cargados desde la Orden de Compra ${found.code}.`,
      );
    }
  }

  function handleAddLine() {
    const product = nonKitProducts.find((p) => p.id === productToAddId);
    if (!product) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 5 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: 10,
          unitCost: product.effectiveCost,
        },
      ];
    });
  }

  const enrichedLines = useMemo(() => {
    return lines
      .map((line) => {
        const product = nonKitProducts.find((p) => p.id === line.productId);
        if (!product) return null;
        const previousStock = product.effectiveStock;
        const newStock = previousStock + line.quantity;
        const previousCost = product.effectiveCost;
        const costDeltaPct =
          previousCost > 0
            ? Math.round(((line.unitCost - previousCost) / previousCost) * 100)
            : 0;
        const salePrice = getFinalPrice(product);
        const newMarginPct =
          salePrice > 0
            ? Math.round(((salePrice - line.unitCost) / salePrice) * 100)
            : 0;
        const orderedQty = selectedPurchaseOrder?.items.find(
          (i) => i.productId === line.productId,
        )?.quantity;

        return {
          ...line,
          productName: product.name,
          unit: businessConfig.logistics.units[product.unit].short,
          previousStock,
          newStock,
          previousCost,
          costDeltaPct,
          salePrice,
          newMarginPct,
          orderedQty,
          subtotal: Math.round(line.quantity * line.unitCost),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [lines, nonKitProducts, selectedPurchaseOrder]);

  const calculatedTotal = useMemo(
    () => enrichedLines.reduce((acc, l) => acc + l.subtotal, 0),
    [enrichedLines],
  );

  const declaredTotalDiff = useMemo(() => {
    const declared = Number(declaredTotal);
    if (!declaredTotal || !Number.isFinite(declared) || declared <= 0) return 0;
    return calculatedTotal - declared;
  }, [declaredTotal, calculatedTotal]);

  function handleRequestConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Selecciona un proveedor válido.");
      return;
    }
    if (receiptNumber.trim().length < 2) {
      setError("Ingresa el número de factura o remito.");
      return;
    }
    if (enrichedLines.length === 0) {
      setError("Agrega al menos un artículo recibido.");
      return;
    }
    setConfirmOpen(true);
  }

  function handleConfirmReceipt() {
    setError(null);
    const result = receiveGoods({
      supplierId,
      purchaseOrderId: purchaseOrderId !== "none" ? purchaseOrderId : null,
      receiptType,
      receiptNumber: receiptNumber.trim(),
      receptionDate,
      items: enrichedLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitCost: l.unitCost,
      })),
      declaredTotal: declaredTotal ? Number(declaredTotal) : null,
      paymentCondition,
      paymentMethod: paymentCondition === "contado" ? paymentMethod : null,
      notes: notes.trim(),
    });

    if (!result.ok) {
      setConfirmOpen(false);
      setError(result.error);
      return;
    }

    setConfirmOpen(false);
    setLastReceipt(result.value);
    onClearPrefill();
    toast.success(
      `${result.value.receiptType} ${result.value.receiptNumber} procesado: stock y costos actualizados en tiempo real.`,
    );
  }

  if (lastReceipt) {
    const lastReceiptSupplier = suppliers.find(
      (s) => s.id === lastReceipt.supplierId,
    );
    return (
      <div className="bg-card space-y-6 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <PackageCheck className="size-6" />
            </span>
            <div>
              <h3 className="text-xl font-extrabold">
                Mercadería ingresada: {lastReceipt.receiptType}{" "}
                {lastReceipt.receiptNumber}
              </h3>
              <p className="text-muted-foreground text-sm">
                Proveedor:{" "}
                <strong>
                  {lastReceiptSupplier?.businessName ?? "Proveedor"}
                </strong>{" "}
                · Total: <strong>{formatPrice(lastReceipt.total)}</strong> (
                {lastReceipt.paymentCondition === "credito"
                  ? "A cuenta corriente"
                  : "Pagado al contado"}
                )
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onViewSupplierLedger(lastReceipt.supplierId)}
              className="h-10 rounded-xl font-semibold"
            >
              Ver cuenta corriente
            </Button>
            <Button
              type="button"
              onClick={() => {
                setLastReceipt(null);
                setReceiptNumber("");
                setPurchaseOrderId("none");
              }}
              className="h-10 rounded-xl font-bold"
            >
              Cargar otro remito
            </Button>
          </div>
        </div>

        {/* Tabla de impacto en stock, costos y márgenes */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold">
            Impacto aplicado en inventario y costos unitarios
          </h4>
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Ingresado</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Costo anterior → nuevo</TableHead>
                  <TableHead className="text-right">Nuevo margen</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastReceipt.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-semibold">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-center font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                      +{item.quantity}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs tabular-nums">
                      {item.previousStock} → <strong>{item.newStock}</strong>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatPrice(item.previousCost)} →{" "}
                      <strong>{formatPrice(item.newCost)}</strong>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="rounded-lg tabular-nums">
                        {item.newMarginPercent ?? 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatPrice(Math.round(item.quantity * item.unitCost))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Diferencias contra la Orden de Compra si las hubo */}
        {lastReceipt.differences.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-200">
              <AlertTriangle className="size-4" />
              Diferencias detectadas respecto a la Orden de Compra{" "}
              {lastReceipt.purchaseOrderCode}
            </p>
            <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-100">
              {lastReceipt.differences.map((disc) => (
                <li
                  key={disc.productId}
                  className="flex items-center justify-between"
                >
                  <span className="font-semibold">{disc.productName}</span>
                  <span className="font-mono">
                    Pedido: {disc.orderedQuantity} · Recibido:{" "}
                    {disc.receivedQuantity} · Costo pactado:{" "}
                    {formatPrice(disc.agreedUnitCost)} vs{" "}
                    {disc.billedUnitCost !== null
                      ? formatPrice(disc.billedUnitCost)
                      : "No recibido"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleRequestConfirm} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-2xl border p-4 text-sm font-medium"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(prefilledOrder || prefilledHeader) && (
        <div className="bg-primary/10 border-primary/30 flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3.5 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="text-primary size-4" />
            <span>
              {prefilledOrder
                ? `Pre-cargado desde la Orden de Compra ${prefilledOrder.code}.`
                : `Encabezado pre-cargado desde lectura verificada (${prefilledHeader?.receiptType} ${prefilledHeader?.receiptNumber}).`}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearPrefill}
            className="h-7 rounded-lg text-xs"
          >
            Limpiar pre-carga
          </Button>
        </div>
      )}

      {/* Paso 1 y 2: Proveedor, Orden vinculada y Datos del comprobante */}
      <div className="bg-card grid gap-5 rounded-2xl border p-5 shadow-sm lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-extrabold">
              1
            </span>
            <h3 className="font-bold">Proveedor y orden de compra vinculada</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-supplier">Proveedor que entrega</Label>
            <Select
              value={supplierId}
              items={supplierItems}
              onValueChange={(value) => {
                if (value) {
                  setSupplierId(value);
                  setPurchaseOrderId("none");
                }
              }}
            >
              <SelectTrigger id="receipt-supplier" className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.businessName} ({formatCuit(supplier.cuit)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-po">
              Vincular a Orden de Compra pendiente (opcional)
            </Label>
            <Select
              value={purchaseOrderId}
              items={poSelectItems}
              onValueChange={(value) => {
                if (value) handleSelectPurchaseOrder(value);
              }}
            >
              <SelectTrigger id="receipt-po" className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sin orden de compra previa (ingreso directo)
                </SelectItem>
                {supplierPendingOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.code} · {po.items.length} ítem(s) · Est.{" "}
                    {formatPrice(po.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-extrabold">
              2
            </span>
            <h3 className="font-bold">Datos del comprobante físico o electrónico</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="receipt-doc-type">Tipo</Label>
              <Select
                value={receiptType}
                items={DOC_TYPE_ITEMS}
                onValueChange={(value) => {
                  if (value) setReceiptType(value as ReceiptType);
                }}
              >
                <SelectTrigger id="receipt-doc-type" className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Factura">Factura de compra</SelectItem>
                  <SelectItem value="Remito">Remito de entrega</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="receipt-doc-number">Número de comprobante</Label>
              <Input
                id="receipt-doc-number"
                value={receiptNumber}
                onChange={(event) => setReceiptNumber(event.target.value)}
                placeholder="Ej.: 0004-00089920"
                className="h-11 rounded-xl font-mono"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="receipt-date">Fecha de recepción</Label>
              <Input
                id="receipt-date"
                type="date"
                value={receptionDate}
                onChange={(event) => setReceptionDate(event.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt-declared-total">
                Total impreso en papel (control opcional)
              </Label>
              <Input
                id="receipt-declared-total"
                type="number"
                min={0}
                value={declaredTotal}
                onChange={(event) => setDeclaredTotal(event.target.value)}
                placeholder="Opcional para verificar suma"
                className="h-11 rounded-xl tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Paso 3: Artículos recibidos e impacto en stock/costos */}
      <div className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-extrabold">
              3
            </span>
            <div>
              <h3 className="font-bold">
                Artículos recibidos, actualización de stock y costos unitarios
              </h3>
              <p className="text-muted-foreground text-xs">
                Revisa las cantidades reales entregadas y el nuevo costo unitario de
                factura.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select
              value={productToAddId}
              items={productSelectItems}
              onValueChange={(value) => {
                if (value) setProductToAddId(value);
              }}
            >
              <SelectTrigger
                aria-label="Producto para agregar al remito"
                className="h-10 w-full min-w-0 rounded-xl sm:w-64"
              >
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {nonKitProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Stock: {product.effectiveStock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddLine}
              className="h-10 shrink-0 gap-1.5 rounded-xl px-4 font-semibold"
            >
              <Plus className="size-4" />
              Agregar línea
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Producto</TableHead>
                {selectedPurchaseOrder && (
                  <TableHead className="text-center">Pedido OC</TableHead>
                )}
                <TableHead className="w-28 text-center">Cant. recibida</TableHead>
                <TableHead className="w-36 text-right">Costo unit. ($)</TableHead>
                <TableHead className="text-center">Impacto stock</TableHead>
                <TableHead className="text-center">Variación costo / Margen</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedLines.map((line) => (
                <TableRow key={line.productId}>
                  <TableCell className="font-semibold">
                    {line.productName}
                  </TableCell>
                  {selectedPurchaseOrder && (
                    <TableCell className="text-center font-mono text-xs tabular-nums">
                      {line.orderedQty !== undefined
                        ? `${line.orderedQty} ${line.unit}`
                        : "Fuera de OC"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => {
                        const qty = Math.max(1, Number(event.target.value) || 1);
                        setLines((prev) =>
                          prev.map((item) =>
                            item.productId === line.productId
                              ? { ...item, quantity: qty }
                              : item,
                          ),
                        );
                      }}
                      aria-label={`Cantidad recibida de ${line.productName}`}
                      className="mx-auto h-9 w-24 rounded-lg text-center font-bold tabular-nums"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(event) => {
                        const cost = Math.max(0, Number(event.target.value) || 0);
                        setLines((prev) =>
                          prev.map((item) =>
                            item.productId === line.productId
                              ? { ...item, unitCost: cost }
                              : item,
                          ),
                        );
                      }}
                      aria-label={`Costo unitario de ${line.productName}`}
                      className="ml-auto h-9 w-32 rounded-lg text-right font-bold tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs tabular-nums">
                    {line.previousStock} <ArrowRight className="inline size-3" />{" "}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      {line.newStock}
                    </strong>{" "}
                    {line.unit}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                          line.costDeltaPct > 0
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : line.costDeltaPct < 0
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {line.costDeltaPct > 0
                          ? `+${line.costDeltaPct}% costo`
                          : line.costDeltaPct < 0
                            ? `${line.costDeltaPct}% costo`
                            : "Igual costo"}
                      </span>
                      <Badge
                        variant="outline"
                        className="rounded-md text-xs tabular-nums"
                      >
                        Margen: {line.newMarginPct}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatPrice(line.subtotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((i) => i.productId !== line.productId),
                        )
                      }
                      aria-label={`Quitar ${line.productName}`}
                      className="text-muted-foreground hover:text-destructive size-8"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {declaredTotalDiff !== 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
            <span>
              Diferencia entre suma de líneas ({formatPrice(calculatedTotal)}) y total
              declarado en papel ({formatPrice(Number(declaredTotal))}):
            </span>
            <strong className="font-mono">
              {declaredTotalDiff > 0 ? "+" : ""}
              {formatPrice(declaredTotalDiff)}
            </strong>
          </div>
        )}
      </div>

      {/* Paso 4: Condición de pago y confirmación */}
      <div className="bg-card grid gap-5 rounded-2xl border p-5 shadow-sm lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs font-extrabold">
              4
            </span>
            <h3 className="font-bold">Condición de pago e impacto en cuenta corriente</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentCondition("credito")}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                paymentCondition === "credito"
                  ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                  : "hover:border-foreground/25",
              )}
            >
              <p className="text-sm font-bold">A cuenta corriente (deuda)</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Suma {formatPrice(calculatedTotal)} al saldo adeudado al proveedor para
                pagar más adelante.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentCondition("contado")}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                paymentCondition === "contado"
                  ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                  : "hover:border-foreground/25",
              )}
            >
              <p className="text-sm font-bold">Pagado en el acto (Al contado)</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Registra la factura y el pago simultáneamente dejando el saldo de esta
                compra en $0.
              </p>
            </button>
          </div>

          {paymentCondition === "contado" && (
            <div className="max-w-xs space-y-1.5 pt-1">
              <Label htmlFor="receipt-payment-method">Medio de pago utilizado</Label>
              <Select
                value={paymentMethod}
                items={PAYMENT_METHOD_ITEMS}
                onValueChange={(value) => {
                  if (value) setPaymentMethod(value as SupplierPaymentMethod);
                }}
              >
                <SelectTrigger
                  id="receipt-payment-method"
                  className="h-10 w-full rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="receipt-notes">Observaciones de recepción</Label>
            <Textarea
              id="receipt-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej.: Cadena de frío controlada (-18°C). Recibió encargado de turno mañana."
              rows={2}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="bg-muted/40 flex flex-col justify-between rounded-2xl border p-5">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Resumen de ingreso
            </p>
            <p className="font-heading text-3xl font-extrabold tabular-nums">
              {formatPrice(calculatedTotal)}
            </p>
            <p className="text-muted-foreground text-xs">
              {enrichedLines.length} producto(s) ·{" "}
              {enrichedLines.reduce((acc, l) => acc + l.quantity, 0)} unidades totales
              a sumar al stock.
            </p>
          </div>

          <Button
            type="submit"
            className="mt-6 h-12 w-full gap-2 rounded-xl text-base font-extrabold"
          >
            <ClipboardCheck className="size-5" />
            Procesar ingreso de mercadería
          </Button>
        </div>
      </div>

      {/* AlertDialog de confirmación antes de impactar */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ingreso de mercadería</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizará el stock físico y el costo unitario de{" "}
              {enrichedLines.length} producto(s) y se asentará el comprobante{" "}
              <strong>
                {receiptType} {receiptNumber}
              </strong>{" "}
              por <strong>{formatPrice(calculatedTotal)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted/40 space-y-1.5 rounded-xl border p-3.5 text-xs">
            <p>
              <strong>Condición:</strong>{" "}
              {paymentCondition === "credito"
                ? "A cuenta corriente (suma deuda al proveedor)"
                : "Pagado en el acto (Al contado)"}
            </p>
            {selectedPurchaseOrder && (
              <p>
                <strong>Orden de compra vinculada:</strong>{" "}
                {selectedPurchaseOrder.code} (pasará a estado Recibida)
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-xl">
              Revisar de nuevo
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReceipt}
              className="h-10 gap-2 rounded-xl font-bold"
            >
              <CheckCircle2 className="size-4" />
              Confirmar e impactar stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
