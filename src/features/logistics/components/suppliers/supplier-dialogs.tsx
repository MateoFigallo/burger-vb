"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
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
import { Switch } from "@/components/ui/switch";
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
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import {
  cleanCuit,
  formatCuit,
  isValidCuit,
  parseArcaQrUrl,
  parseInvoiceText,
} from "../../services/cuit";
import {
  registerSupplierCreditNote,
  registerSupplierPayment,
  savePurchaseOrder,
  saveSupplier,
} from "../../services/logistics-store";
import type {
  GoodsReceipt,
  InventoryItem,
  IvaCondition,
  PurchaseOrder,
  PurchaseOrderItem,
  ReceiptType,
  Supplier,
  SupplierPaymentMethod,
} from "../../types";

export type PrefilledReceiptHeader = {
  supplierId: string;
  receiptType: ReceiptType;
  receiptNumber: string;
  receptionDate: string;
  declaredTotal?: number;
  notes?: string;
};

const IVA_CONDITIONS: readonly IvaCondition[] =
  businessConfig.logistics.ivaConditions;

const IVA_ITEMS: Record<IvaCondition, string> = {
  "Responsable Inscripto": "Responsable Inscripto",
  Monotributista: "Monotributista",
  Exento: "Exento",
};

const PAYMENT_METHOD_ITEMS: Record<SupplierPaymentMethod, string> = {
  efectivo: businessConfig.logistics.supplierPaymentMethods.efectivo,
  transferencia: businessConfig.logistics.supplierPaymentMethods.transferencia,
  cheque: businessConfig.logistics.supplierPaymentMethods.cheque,
  tarjeta: businessConfig.logistics.supplierPaymentMethods.tarjeta,
};

const DOC_LETTER_ITEMS: Record<string, string> = {
  "Factura A": "Factura A",
  "Factura B": "Factura B",
  "Factura C": "Factura C",
  "Factura M": "Factura M",
  "Remito X": "Remito X",
};

/* ============================================================================
 * 1. Sheet: Crear / Editar Proveedor
 * ========================================================================== */

type SupplierFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
};

export function SupplierFormSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierFormSheetProps) {
  const [businessName, setBusinessName] = useState(
    supplier?.businessName ?? "",
  );
  const [cuit, setCuit] = useState(
    supplier ? formatCuit(supplier.cuit) : "",
  );
  const [ivaCondition, setIvaCondition] = useState<IvaCondition>(
    supplier?.ivaCondition ?? "Responsable Inscripto",
  );
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [active, setActive] = useState(supplier?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const [prevKey, setPrevKey] = useState<string>("");
  const currentKey = `${open}-${supplier?.id ?? "new"}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setBusinessName(supplier?.businessName ?? "");
    setCuit(supplier ? formatCuit(supplier.cuit) : "");
    setIvaCondition(supplier?.ivaCondition ?? "Responsable Inscripto");
    setPhone(supplier?.phone ?? "");
    setEmail(supplier?.email ?? "");
    setAddress(supplier?.address ?? "");
    setActive(supplier?.active ?? true);
    setError(null);
  }

  const cuitDigits = cleanCuit(cuit);
  const cuitValid = cuitDigits.length === 0 ? null : isValidCuit(cuitDigits);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = saveSupplier({
      id: supplier?.id,
      businessName,
      cuit,
      ivaCondition,
      phone,
      email,
      address,
      active,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(
      supplier
        ? `Proveedor "${result.value.businessName}" actualizado.`
        : `Proveedor "${result.value.businessName}" dado de alta.`,
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {supplier
              ? `Editar proveedor: ${supplier.businessName}`
              : "Nuevo proveedor"}
          </SheetTitle>
          <SheetDescription>
            Registra la razón social y el CUIT con validación Módulo 11 de ARCA (ex AFIP).
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-6">
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="supplier-name">Razón social o nombre comercial</Label>
            <Input
              id="supplier-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Ej.: Frigorífico Los Pinos S.A."
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="supplier-cuit">CUIT (11 dígitos)</Label>
                {cuitValid !== null && (
                  <span
                    className={
                      cuitValid
                        ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                        : "text-destructive text-xs font-semibold"
                    }
                  >
                    {cuitValid ? "Módulo 11 válido" : "CUIT inválido"}
                  </span>
                )}
              </div>
              <Input
                id="supplier-cuit"
                value={cuit}
                onChange={(event) => setCuit(formatCuit(event.target.value))}
                placeholder="30-71124589-3"
                className="h-11 rounded-xl font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-iva">Condición frente al IVA</Label>
              <Select
                value={ivaCondition}
                items={IVA_ITEMS}
                onValueChange={(value) => {
                  if (value) setIvaCondition(value as IvaCondition);
                }}
              >
                <SelectTrigger id="supplier-iva" className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IVA_CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">Teléfono / WhatsApp</Label>
              <Input
                id="supplier-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+54 9 11 4412-8890"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-email">Correo electrónico</Label>
              <Input
                id="supplier-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pedidos@proveedor.com.ar"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-address">Dirección comercial / Depósito</Label>
            <Input
              id="supplier-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Av. Directorio 4820, CABA"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="bg-muted/40 flex items-center justify-between rounded-2xl border p-3.5">
            <div>
              <p className="text-sm font-semibold">Proveedor activo</p>
              <p className="text-muted-foreground text-xs">
                Los proveedores archivados conservan su historial de cuenta corriente.
              </p>
            </div>
            <Switch
              checked={active}
              onCheckedChange={setActive}
              aria-label="Proveedor activo"
            />
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 rounded-xl font-bold">
              {supplier ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================================
 * 2. Sheet: Crear / Editar Orden de Compra
 * ========================================================================== */

type PurchaseOrderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: InventoryItem[];
  orderToEdit: PurchaseOrder | null;
  defaultSupplierId?: string;
};

export function PurchaseOrderSheet({
  open,
  onOpenChange,
  suppliers,
  products,
  orderToEdit,
  defaultSupplierId,
}: PurchaseOrderSheetProps) {
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active),
    [suppliers],
  );
  const nonKitProducts = useMemo(
    () => products.filter((p) => !p.isKit && !p.archived),
    [products],
  );

  const [supplierId, setSupplierId] = useState<string>(
    orderToEdit?.supplierId ?? defaultSupplierId ?? activeSuppliers[0]?.id ?? "",
  );
  const [lines, setLines] = useState<PurchaseOrderItem[]>(
    orderToEdit?.items ?? [],
  );
  const [productToAddId, setProductToAddId] = useState<string>(
    nonKitProducts[0]?.id ?? "",
  );
  const [notes, setNotes] = useState<string>(orderToEdit?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const [prevKey, setPrevKey] = useState<string>("");
  const currentKey = `${open}-${orderToEdit?.id ?? "new"}-${defaultSupplierId ?? ""}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    const initialSupplier =
      orderToEdit?.supplierId ?? defaultSupplierId ?? activeSuppliers[0]?.id ?? "";
    setSupplierId(initialSupplier);
    setProductToAddId(nonKitProducts[0]?.id ?? "");
    setNotes(orderToEdit?.notes ?? "");
    setError(null);
    if (orderToEdit) {
      setLines(orderToEdit.items);
    } else if (nonKitProducts[0]) {
      setLines([
        {
          productId: nonKitProducts[0].id,
          productName: nonKitProducts[0].name,
          quantity: 10,
          agreedUnitCost: nonKitProducts[0].effectiveCost,
        },
      ]);
    } else {
      setLines([]);
    }
  }

  const supplierItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of activeSuppliers) {
      map[s.id] = `${s.businessName} (${formatCuit(s.cuit)})`;
    }
    return map;
  }, [activeSuppliers]);

  const productItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of nonKitProducts) {
      map[p.id] = `${p.name} (Stock: ${p.effectiveStock} · Costo: ${formatPrice(
        p.effectiveCost,
      )})`;
    }
    return map;
  }, [nonKitProducts]);

  function handleAddLine() {
    const product = nonKitProducts.find((p) => p.id === productToAddId);
    if (!product) return;
    setLines((prev) => {
      const exists = prev.find((l) => l.productId === product.id);
      if (exists) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 5 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 10,
          agreedUnitCost: product.effectiveCost,
        },
      ];
    });
  }

  const estimatedTotal = useMemo(
    () =>
      lines.reduce(
        (acc, l) => acc + Math.round(l.quantity * l.agreedUnitCost),
        0,
      ),
    [lines],
  );

  function handleSave(status: "Borrador" | "Solicitada") {
    setError(null);
    const result = savePurchaseOrder({
      id: orderToEdit?.id,
      supplierId,
      status,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        agreedUnitCost: l.agreedUnitCost,
      })),
      notes: notes.trim(),
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(
      status === "Solicitada"
        ? `Orden de compra ${result.value.code} marcada como Solicitada (${formatPrice(
            result.value.total,
          )}).`
        : `Borrador de orden ${result.value.code} guardado.`,
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {orderToEdit
              ? `Editar Orden de Compra ${orderToEdit.code}`
              : "Nueva Orden de Compra"}
          </SheetTitle>
          <SheetDescription>
            Las órdenes de compra no suman stock ni deuda hasta que registres la
            recepción real del remito o factura.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-4 pb-6">
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="po-supplier">Proveedor</Label>
            <Select
              value={supplierId}
              items={supplierItems}
              onValueChange={(value) => {
                if (value) setSupplierId(value);
              }}
            >
              <SelectTrigger id="po-supplier" className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.businessName} ({formatCuit(s.cuit)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Artículos a pedir</Label>
            <div className="flex gap-2">
              <Select
                value={productToAddId}
                items={productItems}
                onValueChange={(value) => {
                  if (value) setProductToAddId(value);
                }}
              >
                <SelectTrigger
                  aria-label="Producto para agregar a la orden"
                  className="h-11 flex-1 rounded-xl"
                >
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {nonKitProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.effectiveStock} · Costo:{" "}
                      {formatPrice(product.effectiveCost)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddLine}
                className="h-11 gap-1.5 rounded-xl px-4 font-semibold"
              >
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>

            {lines.length > 0 && (
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24 text-center">Cant.</TableHead>
                      <TableHead className="w-32 text-right">Costo pactado</TableHead>
                      <TableHead className="w-24 text-right">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.productId}>
                        <TableCell className="font-semibold">
                          {line.productName}
                        </TableCell>
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
                            aria-label={`Cantidad de ${line.productName}`}
                            className="h-9 rounded-lg text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={line.agreedUnitCost}
                            onChange={(event) => {
                              const cost = Math.max(
                                0,
                                Number(event.target.value) || 0,
                              );
                              setLines((prev) =>
                                prev.map((item) =>
                                  item.productId === line.productId
                                    ? { ...item, agreedUnitCost: cost }
                                    : item,
                                ),
                              );
                            }}
                            aria-label={`Costo pactado de ${line.productName}`}
                            className="h-9 rounded-lg text-right tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatPrice(
                            Math.round(line.quantity * line.agreedUnitCost),
                          )}
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
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="po-notes">Notas para el proveedor / recepción</Label>
            <Textarea
              id="po-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej.: Entregar viernes antes de las 10:30 hs."
              rows={2}
              className="rounded-xl"
            />
          </div>

          <div className="bg-muted/50 flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs">Total estimado de compra</p>
              <p className="font-heading text-2xl font-extrabold tabular-nums">
                {formatPrice(estimatedTotal)}
              </p>
            </div>
            <span className="text-muted-foreground text-xs">
              {lines.length} línea(s)
            </span>
          </div>

          <SheetFooter className="flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave("Borrador")}
              className="h-11 rounded-xl font-semibold"
            >
              Guardar como borrador
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("Solicitada")}
              className="h-11 rounded-xl font-bold"
            >
              Confirmar como Solicitada
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================================
 * 3. Sheet: Ver detalle de Orden de Compra
 * ========================================================================== */

type PurchaseOrderDetailSheetProps = {
  order: PurchaseOrder | null;
  supplierName: string;
  onOpenChange: (open: boolean) => void;
  onReceiveOrder: (order: PurchaseOrder) => void;
};

export function PurchaseOrderDetailDialog({
  order,
  supplierName,
  onOpenChange,
  onReceiveOrder,
}: PurchaseOrderDetailSheetProps) {
  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Orden de Compra {order?.code}</SheetTitle>
          <SheetDescription>
            Proveedor: <strong>{supplierName}</strong> · Emitida el{" "}
            {order ? formatDateTime(order.createdAt) : ""}
          </SheetDescription>
        </SheetHeader>

        {order && (
          <div className="mt-6 space-y-5 px-4 pb-6">
            <div className="overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad pedida</TableHead>
                    <TableHead className="text-right">Costo pactado</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-semibold">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(item.agreedUnitCost)}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatPrice(item.quantity * item.agreedUnitCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {order.notes && (
              <p className="text-muted-foreground rounded-xl border p-3 text-xs">
                <strong>Notas:</strong> {order.notes}
              </p>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <Badge variant="outline" className="rounded-lg">
                Estado: {order.status}
              </Badge>
              <p className="font-heading text-xl font-extrabold tabular-nums">
                Total est.: {formatPrice(order.total)}
              </p>
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl"
              >
                Cerrar
              </Button>
              {order.status === "Solicitada" && (
                <Button
                  type="button"
                  onClick={() => {
                    onReceiveOrder(order);
                    onOpenChange(false);
                  }}
                  className="h-11 rounded-xl font-bold"
                >
                  Recibir mercadería de esta orden
                </Button>
              )}
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================================
 * 4. Sheet: Registrar Pago a Proveedor
 * ========================================================================== */

type SupplierPaymentSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
};

export function SupplierPaymentSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierPaymentSheetProps) {
  const currentBalance = supplier?.balance ?? 0;
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] =
    useState<SupplierPaymentMethod>("transferencia");
  const [reference, setReference] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [prevKey, setPrevKey] = useState<string>("");
  const currentKey = `${open}-${supplier?.id ?? ""}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setAmount(currentBalance > 0 ? String(currentBalance) : "");
    setPaymentMethod("transferencia");
    setReference("");
    setReason("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplier) return;
    setError(null);

    const result = registerSupplierPayment({
      supplierId: supplier.id,
      amount: Number(amount),
      paymentMethod,
      reference,
      reason: reason.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(
      `Pago registrado a ${supplier.businessName} por ${formatPrice(
        result.value.amount,
      )}. Nuevo saldo: ${formatPrice(result.value.balanceAfter)}.`,
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Registrar pago a proveedor</SheetTitle>
          <SheetDescription>
            {supplier?.businessName} · Saldo actual en cuenta corriente:{" "}
            <strong>{formatPrice(currentBalance)}</strong>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-6">
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm font-medium"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-amount">Monto a pagar (ARS)</Label>
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(currentBalance))}
                  className="text-primary text-xs font-bold hover:underline"
                >
                  Saldar deuda total ({formatPrice(currentBalance)})
                </button>
              )}
            </div>
            <Input
              id="payment-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 rounded-xl font-bold tabular-nums"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Medio de pago</Label>
            <Select
              value={paymentMethod}
              items={PAYMENT_METHOD_ITEMS}
              onValueChange={(value) => {
                if (value) setPaymentMethod(value as SupplierPaymentMethod);
              }}
            >
              <SelectTrigger id="payment-method" className="h-11 w-full rounded-xl">
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

          <div className="space-y-2">
            <Label htmlFor="payment-reference">N.º de comprobante / transferencia</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ej.: TRF-998120"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Concepto / Observación</Label>
            <Input
              id="payment-notes"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej.: Cancelación parcial Factura A 0004-00089110"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="bg-muted/50 flex items-center justify-between rounded-2xl border p-4">
            <span className="text-muted-foreground text-xs">
              Saldo luego del pago
            </span>
            <span className="font-heading text-xl font-extrabold tabular-nums">
              {formatPrice(currentBalance - (Number(amount) || 0))}
            </span>
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 rounded-xl font-bold">
              Confirmar pago
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================================
 * 5. Sheet: Registrar Nota de Crédito de Proveedor
 * ========================================================================== */

type SupplierCreditNoteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
};

export function SupplierCreditNoteSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierCreditNoteSheetProps) {
  const currentBalance = supplier?.balance ?? 0;
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplier) return;
    setError(null);

    const result = registerSupplierCreditNote({
      supplierId: supplier.id,
      reference,
      amount: Number(amount),
      reason,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast.success(
      `Nota de crédito registrada para ${supplier.businessName}. Nuevo saldo: ${formatPrice(
        result.value.balanceAfter,
      )}.`,
    );
    setReference("");
    setAmount("");
    setReason("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Registrar nota de crédito</SheetTitle>
          <SheetDescription>
            Descuenta del saldo adeudado a <strong>{supplier?.businessName}</strong>{" "}
            por devoluciones, diferencias de precio o bonificaciones.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4 pb-6">
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm font-medium"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cn-doc">N.º de Nota de Crédito</Label>
            <Input
              id="cn-doc"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ej.: NC-A 0004-00001290"
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cn-amount">Monto a favor (ARS)</Label>
            <Input
              id="cn-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 rounded-xl font-bold tabular-nums"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cn-reason">Motivo (obligatorio)</Label>
            <Textarea
              id="cn-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej.: Bonificación por diferencia de peso en entrega del martes"
              rows={3}
              className="rounded-xl"
              required
            />
          </div>

          <div className="bg-muted/50 flex items-center justify-between rounded-2xl border p-4">
            <span className="text-muted-foreground text-xs">
              Saldo luego de la NC
            </span>
            <span className="font-heading text-xl font-extrabold tabular-nums">
              {formatPrice(currentBalance - (Number(amount) || 0))}
            </span>
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 rounded-xl font-bold">
              Aplicar nota de crédito
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================================
 * 6. Sheet: Lectura de Factura (Foto / PDF / QR ARCA) con Revisión Humana
 * ========================================================================== */

type InvoiceScanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  receipts: GoodsReceipt[];
  onApplyToReceipt: (prefill: PrefilledReceiptHeader) => void;
};

export function InvoiceScanSheet({
  open,
  onOpenChange,
  suppliers,
  receipts,
  onApplyToReceipt,
}: InvoiceScanSheetProps) {
  const [fileName, setFileName] = useState<string>("");
  const [rawInputText, setRawInputText] = useState<string>("");
  const [detectionSource, setDetectionSource] = useState<string>("");

  const [cuit, setCuit] = useState<string>("30-71234567-9");
  const [businessName, setBusinessName] = useState<string>(
    "Frigorífico Pampa Carnes S.A.",
  );
  const [docKind, setDocKind] = useState<string>("Factura A");
  const [pointOfSale, setPointOfSale] = useState<string>("0004");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("00090415");
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [netAmount, setNetAmount] = useState<string>("200000");
  const [vatAmount, setVatAmount] = useState<string>("42000");
  const [otherTaxes, setOtherTaxes] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);

  const calculatedTotal = useMemo(
    () =>
      Math.round(
        (Number(netAmount) || 0) +
          (Number(vatAmount) || 0) +
          (Number(otherTaxes) || 0),
      ),
    [netAmount, vatAmount, otherTaxes],
  );

  const formattedReceiptNumber = useMemo(() => {
    const pos = pointOfSale.replace(/\D/g, "").padStart(4, "0").slice(-4);
    const num = invoiceNumber.replace(/\D/g, "").padStart(8, "0").slice(-8);
    return `${pos}-${num}`;
  }, [pointOfSale, invoiceNumber]);

  const duplicateReceipt = useMemo(() => {
    return (
      receipts.find((r) => r.receiptNumber.includes(formattedReceiptNumber)) ??
      null
    );
  }, [receipts, formattedReceiptNumber]);

  const matchedSupplier = useMemo(() => {
    const digits = cleanCuit(cuit);
    if (!digits) return null;
    return suppliers.find((s) => cleanCuit(s.cuit) === digits) ?? null;
  }, [suppliers, cuit]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(`${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);

    const parsed = parseInvoiceText(file.name);
    if (parsed?.cuit) setCuit(formatCuit(parsed.cuit));
    if (parsed?.pointOfSale) setPointOfSale(parsed.pointOfSale);
    if (parsed?.number) setInvoiceNumber(parsed.number);
    setDetectionSource(
      `Archivo cargado: ${file.name}. Verifica los datos extraídos antes de continuar.`,
    );
  }

  function handleParseRawText() {
    if (!rawInputText.trim()) return;
    const qrData = parseArcaQrUrl(rawInputText);
    if (qrData) {
      if (qrData.cuit) {
        setCuit(formatCuit(qrData.cuit));
        const existing = suppliers.find(
          (s) => cleanCuit(s.cuit) === cleanCuit(qrData.cuit ?? ""),
        );
        if (existing) setBusinessName(existing.businessName);
      }
      if (qrData.letter) {
        setDocKind(`Factura ${qrData.letter}`);
      }
      if (qrData.pointOfSale) setPointOfSale(qrData.pointOfSale);
      if (qrData.number) setInvoiceNumber(qrData.number);
      if (qrData.issueDate) setIssueDate(qrData.issueDate);
      if (qrData.totalAmount) {
        const net = Math.round(qrData.totalAmount / 1.21);
        const vat = qrData.totalAmount - net;
        setNetAmount(String(net));
        setVatAmount(String(vat));
        setOtherTaxes("0");
      }
      setDetectionSource("QR oficial de ARCA (AFIP) decodificado con éxito.");
      toast.success("Datos del QR de ARCA decodificados.");
      return;
    }

    const textData = parseInvoiceText(rawInputText);
    if (textData) {
      if (textData.cuit) setCuit(formatCuit(textData.cuit));
      if (textData.letter) setDocKind(`Factura ${textData.letter}`);
      if (textData.pointOfSale) setPointOfSale(textData.pointOfSale);
      if (textData.number) setInvoiceNumber(textData.number);
      if (textData.issueDate) setIssueDate(textData.issueDate);
      if (textData.totalAmount) {
        const net = Math.round(textData.totalAmount / 1.21);
        const vat = textData.totalAmount - net;
        setNetAmount(String(net));
        setVatAmount(String(vat));
        setOtherTaxes("0");
      }
      setDetectionSource("Texto de factura analizado. Revisa cada campo.");
      toast.success("Datos extraídos del texto del comprobante.");
    }
  }

  function handleLoadDemoInvoice() {
    const sampleQrPayload = btoa(
      JSON.stringify({
        ver: 1,
        fecha: new Date().toISOString().slice(0, 10),
        cuit: 30712345679,
        ptoVta: 2,
        tipoCmp: 1,
        nroCmp: 45210,
        importe: 148500,
      }),
    );
    const url = `https://www.afip.gob.ar/fe/qr/?p=${sampleQrPayload}`;
    setRawInputText(url);
    const qrData = parseArcaQrUrl(url);
    if (qrData?.cuit) setCuit(formatCuit(qrData.cuit));
    const existing = suppliers[0];
    if (existing) {
      setCuit(formatCuit(existing.cuit));
      setBusinessName(existing.businessName);
    }
    setDocKind("Factura A");
    setPointOfSale("0002");
    setInvoiceNumber("00045210");
    setNetAmount("122727");
    setVatAmount("25773");
    setOtherTaxes("0");
    setDetectionSource(
      "Comprobante electrónico ARCA simulado (QR Ver. 1 decodificado).",
    );
  }

  function handleConfirmAndPassToReceipt(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    if (!isValidCuit(cuit)) {
      setError("El CUIT ingresado no supera la validación Módulo 11 de ARCA.");
      return;
    }

    let supplierId = matchedSupplier?.id;
    if (!supplierId) {
      const created = saveSupplier({
        businessName: businessName.trim() || `Proveedor ${formatCuit(cuit)}`,
        cuit,
        ivaCondition:
          docKind === "Factura C" ? "Monotributista" : "Responsable Inscripto",
        phone: "",
        email: "",
        address: "",
        active: true,
      });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      supplierId = created.value.id;
      toast.success(
        `Nuevo proveedor "${created.value.businessName}" dado de alta automáticamente.`,
      );
    }

    onApplyToReceipt({
      supplierId,
      receiptType: docKind === "Remito X" ? "Remito" : "Factura",
      receiptNumber: formattedReceiptNumber,
      receptionDate: issueDate,
      declaredTotal: calculatedTotal,
      notes: `Verificado desde comprobante (${fileName || docKind}). Neto: ${formatPrice(
        Number(netAmount) || 0,
      )} + IVA: ${formatPrice(Number(vatAmount) || 0)}.`,
    });

    toast.success(
      "Encabezado verificado y cargado en la pestaña 'Carga de remito'.",
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Cargar factura (Foto, PDF o QR ARCA)</SheetTitle>
          <SheetDescription>
            Sube el comprobante o pega el texto/QR de ARCA. Revisa siempre los datos
            extraídos antes de pasarlos a la recepción de mercadería.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleConfirmAndPassToReceipt}
          className="mt-6 space-y-5 px-4 pb-6"
        >
          {error && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bloque de captura / archivo / QR */}
          <div className="bg-muted/30 space-y-3 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Upload className="text-primary size-4" />
                <span>1. Captura o lectura asistida</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDemoInvoice}
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
              >
                <Sparkles className="size-3.5" />
                Probar factura de ejemplo (ARCA)
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="invoice-file-upload"
                  className="text-muted-foreground mb-1.5 block text-xs"
                >
                  Archivo adjunto (JPG, PNG, WEBP o PDF)
                </Label>
                <Input
                  id="invoice-file-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                  className="h-10 cursor-pointer rounded-xl text-xs"
                />
                {fileName && (
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                    <FileText className="size-3.5" />
                    {fileName}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="invoice-qr-input"
                  className="text-muted-foreground mb-1.5 block text-xs"
                >
                  Pegar URL QR ARCA o texto OCR de factura
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="invoice-qr-input"
                    value={rawInputText}
                    onChange={(event) => setRawInputText(event.target.value)}
                    placeholder="https://www.afip.gob.ar/fe/qr/?p=..."
                    className="h-10 rounded-xl text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleParseRawText}
                    className="h-10 shrink-0 gap-1 rounded-xl px-3 text-xs font-semibold"
                  >
                    <QrCode className="size-3.5" />
                    Leer
                  </Button>
                </div>
              </div>
            </div>

            {detectionSource && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5 shrink-0" />
                {detectionSource}
              </p>
            )}
          </div>

          {/* Bloque de revisión humana obligatoria */}
          <div className="space-y-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                2. Revisión humana obligatoria del encabezado
              </p>
              {matchedSupplier ? (
                <Badge
                  variant="secondary"
                  className="rounded-lg text-xs text-emerald-700 dark:text-emerald-300"
                >
                  Proveedor registrado: {matchedSupplier.businessName}
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-lg text-xs">
                  Se dará de alta como nuevo proveedor
                </Badge>
              )}
            </div>

            {duplicateReceipt && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-bold">Posible comprobante duplicado</p>
                  <p>
                    Ya existe un ingreso con número{" "}
                    <strong>{duplicateReceipt.receiptNumber}</strong> cargado el{" "}
                    {formatDate(duplicateReceipt.receptionDate)}.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scan-cuit">CUIT del emisor</Label>
                  <span
                    className={
                      isValidCuit(cuit)
                        ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                        : "text-destructive text-xs font-semibold"
                    }
                  >
                    {isValidCuit(cuit) ? "CUIT válido" : "CUIT inválido"}
                  </span>
                </div>
                <Input
                  id="scan-cuit"
                  value={cuit}
                  onChange={(event) => setCuit(formatCuit(event.target.value))}
                  className="h-10 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-name">Razón social del proveedor</Label>
                <Input
                  id="scan-name"
                  value={
                    matchedSupplier ? matchedSupplier.businessName : businessName
                  }
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="scan-kind">Tipo / Letra</Label>
                <Select
                  value={docKind}
                  items={DOC_LETTER_ITEMS}
                  onValueChange={(value) => {
                    if (value) setDocKind(value);
                  }}
                >
                  <SelectTrigger id="scan-kind" className="h-10 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Factura A">Factura A</SelectItem>
                    <SelectItem value="Factura B">Factura B</SelectItem>
                    <SelectItem value="Factura C">Factura C</SelectItem>
                    <SelectItem value="Factura M">Factura M</SelectItem>
                    <SelectItem value="Remito X">Remito X</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-pos">Pto. Venta</Label>
                <Input
                  id="scan-pos"
                  value={pointOfSale}
                  onChange={(event) => setPointOfSale(event.target.value)}
                  placeholder="0004"
                  className="h-10 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-num">Número</Label>
                <Input
                  id="scan-num"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="00090415"
                  className="h-10 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-date">Fecha emisión</Label>
                <Input
                  id="scan-date"
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="scan-net">Neto gravado ($)</Label>
                <Input
                  id="scan-net"
                  type="number"
                  min={0}
                  value={netAmount}
                  onChange={(event) => setNetAmount(event.target.value)}
                  className="h-10 rounded-xl tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-vat">IVA ($)</Label>
                <Input
                  id="scan-vat"
                  type="number"
                  min={0}
                  value={vatAmount}
                  onChange={(event) => setVatAmount(event.target.value)}
                  className="h-10 rounded-xl tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-taxes">Otros tributos ($)</Label>
                <Input
                  id="scan-taxes"
                  type="number"
                  min={0}
                  value={otherTaxes}
                  onChange={(event) => setOtherTaxes(event.target.value)}
                  className="h-10 rounded-xl tabular-nums"
                />
              </div>
            </div>

            <div className="bg-muted/50 flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <p className="text-muted-foreground text-xs">
                  Comprobante verificado
                </p>
                <p className="font-mono text-sm font-bold">
                  {docKind} {formattedReceiptNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">
                  Total factura (Neto + IVA + Tributos)
                </p>
                <p className="font-heading text-2xl font-extrabold tabular-nums">
                  {formatPrice(calculatedTotal)}
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 gap-2 rounded-xl font-bold">
              <FileCheck2 className="size-4" />
              Confirmar y pasar a Carga de remito
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
