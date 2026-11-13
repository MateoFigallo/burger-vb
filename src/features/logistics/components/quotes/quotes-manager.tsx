"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Info,
  MessageCircle,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
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
import { PageHeader } from "@/features/admin";
import { useSession } from "@/features/auth";
import { useCustomers } from "@/features/customers";
import { getFinalPrice } from "@/features/menu";
import {
  DELIVERY_LABELS,
  PAYMENT_LABELS,
  type DeliveryMethod,
  type PaymentMethod,
} from "@/features/orders";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLogistics } from "../../hooks/use-logistics";
import { foldText } from "../../schemas/logistics.schema";
import { downloadCsv } from "../../services/csv-export";
import {
  convertQuoteToOrder,
  createQuote,
  getQuoteEffectiveStatus,
  inspectQuoteForConversion,
  voidQuote,
} from "../../services/logistics-store";
import type { Quote, QuoteStatus } from "../../types";
import {
  LogisticsErrorState,
  LogisticsLoadingSkeleton,
} from "../logistics-nav";

const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  vigente:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  vencido:
    "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  convertido: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  anulado: "border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const DELIVERY_ITEMS: Record<DeliveryMethod, string> = {
  retiro: DELIVERY_LABELS.retiro,
  delivery: DELIVERY_LABELS.delivery,
};

const PAYMENT_ITEMS: Record<PaymentMethod, string> = {
  efectivo: PAYMENT_LABELS.efectivo,
  transferencia: PAYMENT_LABELS.transferencia,
  "mercado-pago": PAYMENT_LABELS["mercado-pago"],
};

type DraftQuoteLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export function QuotesManager() {
  const { isReady, quotes, items } = useLogistics();
  const customers = useCustomers();
  const { viewer } = useSession();

  const activeProducts = useMemo(
    () => items.filter((item) => !item.archived && item.available),
    [items],
  );

  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Sheet: Nuevo presupuesto
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("custom");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [validDays, setValidDays] = useState<string>(
    String(businessConfig.logistics.quoteDefaultDays),
  );
  const [draftLines, setDraftLines] = useState<DraftQuoteLine[]>([]);
  const [productToAddId, setProductToAddId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Sheet: Vista previa / Impresión A4
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  // Sheet: Convertir en pedido
  const [convertTarget, setConvertTarget] = useState<Quote | null>(null);
  const [useCurrentPrices, setUseCurrentPrices] = useState<boolean>(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("retiro");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [convertError, setConvertError] = useState<string | null>(null);

  // Sheet: Anular presupuesto
  const [voidTarget, setVoidTarget] = useState<Quote | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  const quotesWithEffectiveStatus = useMemo(
    () =>
      quotes.map((quote) => ({
        ...quote,
        effectiveStatus: getQuoteEffectiveStatus(quote),
      })),
    [quotes],
  );

  const countsByStatus = useMemo(() => {
    const result: Record<QuoteStatus, { count: number; total: number }> = {
      vigente: { count: 0, total: 0 },
      vencido: { count: 0, total: 0 },
      convertido: { count: 0, total: 0 },
      anulado: { count: 0, total: 0 },
    };
    for (const q of quotesWithEffectiveStatus) {
      result[q.effectiveStatus].count += 1;
      result[q.effectiveStatus].total += q.total;
    }
    return result;
  }, [quotesWithEffectiveStatus]);

  const filteredQuotes = useMemo(() => {
    const q = foldText(searchQuery);
    return quotesWithEffectiveStatus.filter((quote) => {
      if (statusFilter !== "all" && quote.effectiveStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        foldText(quote.number).includes(q) ||
        foldText(quote.customerName).includes(q) ||
        foldText(quote.customerPhone ?? "").includes(q) ||
        quote.lines.some((line) => foldText(line.productName).includes(q))
      );
    });
  }, [quotesWithEffectiveStatus, statusFilter, searchQuery]);

  const customerSelectItems = useMemo(() => {
    const map: Record<string, string> = {
      custom: "Cargar cliente manualmente",
    };
    for (const customer of customers) {
      map[customer.id] = `${customer.name} (${customer.phone})`;
    }
    return map;
  }, [customers]);

  const productSelectItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of activeProducts) {
      map[product.id] = `${product.name} (${formatPrice(getFinalPrice(product))})`;
    }
    return map;
  }, [activeProducts]);

  function openNewQuoteSheet() {
    const firstProduct = activeProducts[0];
    setSelectedCustomerId("custom");
    setCustomerName("");
    setCustomerPhone("");
    setValidDays(String(businessConfig.logistics.quoteDefaultDays));
    setProductToAddId(firstProduct?.id ?? "");
    setDraftLines(
      firstProduct
        ? [
            {
              productId: firstProduct.id,
              productName: firstProduct.name,
              quantity: 2,
              unitPrice: getFinalPrice(firstProduct),
            },
          ]
        : [],
    );
    setNotes("");
    setFormError(null);
    setNewSheetOpen(true);
  }

  function handleAddLine() {
    const product = activeProducts.find((p) => p.id === productToAddId);
    if (!product) return;
    setDraftLines((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: getFinalPrice(product),
        },
      ];
    });
  }

  const draftTotal = useMemo(
    () =>
      draftLines.reduce(
        (acc, line) => acc + Math.round(line.quantity * line.unitPrice),
        0,
      ),
    [draftLines],
  );

  function handleCreateQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = createQuote({
      customerId: selectedCustomerId !== "custom" ? selectedCustomerId : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      validDays: Number(validDays) || businessConfig.logistics.quoteDefaultDays,
      lines: draftLines,
      notes: notes.trim(),
      createdBy: viewer?.name ?? "Administrador",
    });

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    toast.success(
      `Presupuesto ${result.value.number} creado para ${result.value.customerName} (${formatPrice(
        result.value.total,
      )}).`,
    );
    setNewSheetOpen(false);
  }

  const conversionInspection = useMemo(() => {
    if (!convertTarget) return null;
    return inspectQuoteForConversion(convertTarget.id);
  }, [convertTarget]);

  function openConvertSheet(quote: Quote) {
    setConvertTarget(quote);
    setUseCurrentPrices(false);
    setDeliveryMethod("retiro");
    setDeliveryAddress("");
    setPaymentMethod("transferencia");
    setConvertError(null);
  }

  function handleConfirmConversion() {
    if (!convertTarget) return;
    setConvertError(null);

    const result = convertQuoteToOrder({
      quoteId: convertTarget.id,
      useCurrentPrices,
      deliveryMethod,
      address: deliveryAddress.trim() || undefined,
      paymentMethod,
    });

    if (!result.ok) {
      setConvertError(result.error);
      return;
    }

    toast.success(
      `Presupuesto ${result.value.quote.number} convertido en el Pedido ${result.value.order.id}. El stock ya fue descontado.`,
    );
    setConvertTarget(null);
  }

  function openVoidSheet(quote: Quote) {
    setVoidTarget(quote);
    setVoidReason("");
    setVoidError(null);
  }

  function handleConfirmVoid(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voidTarget) return;
    setVoidError(null);

    const result = voidQuote(voidTarget.id, voidReason);
    if (!result.ok) {
      setVoidError(result.error);
      return;
    }

    toast.success(`Presupuesto ${result.value.number} anulado correctamente.`);
    setVoidTarget(null);
  }

  function handleSendWhatsApp(quote: Quote) {
    const digits = (quote.customerPhone ?? "").replace(/\D/g, "");
    const linesText = quote.lines
      .map(
        (item) =>
          `• ${item.quantity}x ${item.productName}: ${formatPrice(
            item.quantity * item.unitPrice,
          )}`,
      )
      .join("\n");

    const message = [
      `Hola *${quote.customerName}*, te enviamos el *Presupuesto ${quote.number}* de *${businessConfig.site.name}*:`,
      "",
      linesText,
      "",
      `*Total:* ${formatPrice(quote.total)}`,
      `*Válido hasta:* ${formatDate(quote.expiresAt)}`,
      quote.notes ? `*Notas:* ${quote.notes}` : "",
      "",
      "Avísanos si deseas confirmarlo para pasarlo a preparación.",
    ]
      .filter(Boolean)
      .join("\n");

    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Abriendo WhatsApp con el presupuesto ${quote.number}.`);
  }

  function handlePrintQuote(quote: Quote) {
    setPreviewQuote(quote);
  }

  function handleExportCsv() {
    if (filteredQuotes.length === 0) {
      toast.error("No hay presupuestos en la vista actual para exportar.");
      return;
    }
    try {
      downloadCsv(
        `presupuestos-burger-vb-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "N.º",
          "Fecha",
          "Cliente",
          "Teléfono",
          "Artículos",
          "Total",
          "Válido hasta",
          "Estado",
          "Notas",
        ],
        filteredQuotes.map((quote) => [
          quote.number,
          formatDateTime(quote.createdAt),
          quote.customerName,
          quote.customerPhone ?? "",
          quote.lines.map((i) => `${i.quantity}x ${i.productName}`).join(" | "),
          quote.total,
          formatDate(quote.expiresAt),
          businessConfig.logistics.quoteStatuses[quote.effectiveStatus],
          quote.notes ?? "",
        ]),
      );
      toast.success(`CSV exportado (${filteredQuotes.length} presupuesto(s)).`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al exportar CSV.";
      setRuntimeError(message);
    }
  }

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
        title="Presupuestos y cotizaciones"
        description="Arma cotizaciones para eventos, empresas o pedidos grandes sin comprometer stock hasta que el cliente confirme."
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
              onClick={openNewQuoteSheet}
              className="h-11 gap-2 rounded-xl px-5 font-bold"
            >
              <Plus className="size-4" />
              + Nuevo presupuesto
            </Button>
          </>
        }
      />

      {/* Aviso operativo */}
      <div className="bg-card flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-xs">
        <Info className="text-primary mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">
            Los presupuestos no descuentan stock ni suman como venta hasta convertirlos en
            pedido.
          </p>
          <p className="text-muted-foreground text-xs">
            Al convertir un presupuesto, el sistema verifica automáticamente si venció o si
            cambiaron los precios del menú y te permite elegir cuál precio aplicar.
          </p>
        </div>
      </div>

      {/* Tarjetas de estado interactivas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["vigente", "vencido", "convertido", "anulado"] as QuoteStatus[]).map(
          (status) => {
            const summary = countsByStatus[status];
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setStatusFilter((current) => (current === status ? "all" : status))
                }
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
                      "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold",
                      QUOTE_STATUS_STYLES[status],
                    )}
                  >
                    {businessConfig.logistics.quoteStatuses[status]}
                  </span>
                  <span className="text-muted-foreground text-xs font-bold tabular-nums">
                    {summary.count}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="font-heading text-2xl font-extrabold tabular-nums">
                    {formatPrice(summary.total)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {summary.count === 1
                      ? "1 presupuesto"
                      : `${summary.count} presupuestos`}
                  </p>
                </div>
              </button>
            );
          },
        )}
      </div>

      {/* Buscador y filtro activo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por N.º, cliente, teléfono o producto..."
            aria-label="Buscar presupuestos"
            className="h-11 rounded-xl pl-10"
          />
        </div>

        {statusFilter !== "all" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-9 rounded-lg text-xs font-semibold"
          >
            Mostrando: {businessConfig.logistics.quoteStatuses[statusFilter]} (ver todos)
          </Button>
        )}
      </div>

      {/* Tabla de presupuestos */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
          <div className="bg-muted mb-3 grid size-12 place-items-center rounded-2xl">
            <FileSpreadsheet className="text-muted-foreground size-6" />
          </div>
          <h3 className="text-lg font-bold">Sin presupuestos para mostrar</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Crea una cotización con validez en días, compártela por WhatsApp o imprímela en
            A4 y conviértela en pedido con un clic cuando el cliente confirme.
          </p>
          <Button
            type="button"
            onClick={openNewQuoteSheet}
            className="mt-4 h-10 gap-2 rounded-xl px-4 font-semibold"
          >
            <Plus className="size-4" />
            Crear nuevo presupuesto
          </Button>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-5">N.º</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Artículos cotizados</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => {
                const canAct =
                  quote.effectiveStatus === "vigente" ||
                  quote.effectiveStatus === "vencido";
                return (
                  <TableRow key={quote.id}>
                    <TableCell className="pl-5 font-mono font-extrabold">
                      {quote.number}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(quote.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{quote.customerName}</p>
                      <p className="text-muted-foreground text-xs">
                        {quote.customerPhone ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {quote.lines.map((item) => (
                          <Badge
                            key={`${quote.id}-${item.productId}`}
                            variant="secondary"
                            className="rounded-lg text-xs"
                          >
                            {item.quantity}x {item.productName}
                          </Badge>
                        ))}
                      </div>
                      {quote.notes && (
                        <p className="text-muted-foreground mt-1 max-w-xs truncate text-xs">
                          {quote.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatPrice(quote.total)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="text-muted-foreground size-3.5" />
                        {formatDate(quote.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold",
                            QUOTE_STATUS_STYLES[quote.effectiveStatus],
                          )}
                        >
                          {businessConfig.logistics.quoteStatuses[quote.effectiveStatus]}
                        </span>
                        {quote.convertedOrderId && (
                          <span className="text-muted-foreground font-mono text-[11px]">
                            Pedido {quote.convertedOrderId}
                          </span>
                        )}
                        {quote.voidReason && (
                          <span className="text-muted-foreground max-w-36 truncate text-[11px]">
                            Motivo: {quote.voidReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintQuote(quote)}
                          title="Ver comprobante A4 / Imprimir"
                          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                        >
                          <Printer className="size-3.5" />
                          A4
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendWhatsApp(quote)}
                          title="Enviar presupuesto por WhatsApp"
                          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </Button>
                        {canAct && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openConvertSheet(quote)}
                              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-bold"
                            >
                              <ShoppingBag className="size-3.5" />
                              Convertir
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openVoidSheet(quote)}
                              title="Anular presupuesto"
                              className="text-destructive hover:text-destructive h-8 rounded-lg px-2"
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          </>
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

      {/* Sheet: Nuevo presupuesto */}
      <Sheet open={newSheetOpen} onOpenChange={setNewSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Nuevo presupuesto</SheetTitle>
            <SheetDescription>
              Cotiza productos con precios congelados o personalizados sin descontar stock.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreateQuote} className="mt-6 space-y-5 px-4 pb-6">
            {formError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="quote-customer-select">Autocompletar desde clientes</Label>
              <Select
                value={selectedCustomerId}
                items={customerSelectItems}
                onValueChange={(value) => {
                  if (!value) return;
                  setSelectedCustomerId(value);
                  if (value === "custom") return;
                  const found = customers.find((c) => c.id === value);
                  if (found) {
                    setCustomerName(found.name);
                    setCustomerPhone(found.phone);
                  }
                }}
              >
                <SelectTrigger
                  id="quote-customer-select"
                  className="h-11 w-full rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Cargar cliente manualmente</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="quote-customer-name">Cliente o empresa</Label>
                <Input
                  id="quote-customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Ej.: Estudio Creativo Sur (Evento 15 personas)"
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-valid-days">Validez (días)</Label>
                <Input
                  id="quote-valid-days"
                  type="number"
                  min={businessConfig.logistics.quoteMinDays}
                  max={businessConfig.logistics.quoteMaxDays}
                  value={validDays}
                  onChange={(event) => setValidDays(event.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-customer-phone">WhatsApp / Teléfono</Label>
              <Input
                id="quote-customer-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Ej.: +54 9 11 5555-0192"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Selector para agregar líneas */}
            <div className="space-y-3">
              <Label>Artículos a cotizar</Label>
              <div className="flex gap-2">
                <Select
                  value={productToAddId}
                  items={productSelectItems}
                  onValueChange={(value) => {
                    if (value) setProductToAddId(value);
                  }}
                >
                  <SelectTrigger
                    aria-label="Producto para agregar al presupuesto"
                    className="h-11 flex-1 rounded-xl"
                  >
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({formatPrice(getFinalPrice(product))})
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

              {draftLines.length > 0 && (
                <div className="overflow-hidden rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-20 text-center">Cant.</TableHead>
                        <TableHead className="w-28 text-right">Precio unit.</TableHead>
                        <TableHead className="w-24 text-right">Subtotal</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftLines.map((line) => (
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
                                setDraftLines((prev) =>
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
                              value={line.unitPrice}
                              onChange={(event) => {
                                const price = Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                );
                                setDraftLines((prev) =>
                                  prev.map((item) =>
                                    item.productId === line.productId
                                      ? { ...item, unitPrice: price }
                                      : item,
                                  ),
                                );
                              }}
                              aria-label={`Precio unitario de ${line.productName}`}
                              className="h-9 rounded-lg text-right tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {formatPrice(Math.round(line.quantity * line.unitPrice))}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDraftLines((prev) =>
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
              <Label htmlFor="quote-notes">Notas o condiciones comerciales</Label>
              <Textarea
                id="quote-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej.: Entrega programada viernes 13:00 hs. Incluye servilletas y salsas individuales."
                rows={2}
                className="rounded-xl"
              />
            </div>

            <div className="bg-muted/50 flex items-center justify-between rounded-2xl border p-4">
              <div>
                <p className="text-muted-foreground text-xs">Total presupuestado</p>
                <p className="font-heading text-2xl font-extrabold tabular-nums">
                  {formatPrice(draftTotal)}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">
                Válido por {Number(validDays) || 7} día(s)
              </span>
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewSheetOpen(false)}
                className="h-11 rounded-xl"
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-11 rounded-xl font-bold">
                Guardar presupuesto
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Convertir presupuesto en pedido */}
      <Sheet
        open={Boolean(convertTarget && conversionInspection)}
        onOpenChange={(open) => {
          if (!open) setConvertTarget(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              Convertir Presupuesto {convertTarget?.number} en Pedido
            </SheetTitle>
            <SheetDescription>
              Al confirmar, se generará un pedido activo en cocina y se descontará el stock
              correspondiente.
            </SheetDescription>
          </SheetHeader>

          {convertTarget && conversionInspection && (
            <div className="mt-6 space-y-5 px-4 pb-6">
              {convertError && (
                <div
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
                >
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{convertError}</span>
                </div>
              )}

              {conversionInspection.isExpired && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-bold">Este presupuesto está vencido</p>
                    <p>
                      Venció el {formatDate(convertTarget.expiresAt)}. Puedes convertirlo
                      igualmente respetando el precio cotizado o actualizando al menú
                      vigente.
                    </p>
                  </div>
                </div>
              )}

              {conversionInspection.hasPriceChanges && (
                <div className="space-y-2.5 rounded-2xl border p-3.5">
                  <p className="text-xs font-bold">
                    Variaciones detectadas respecto al menú actual:
                  </p>
                  <ul className="space-y-1 text-xs">
                    {conversionInspection.changedItems.map((line) => (
                      <li
                        key={line.productName}
                        className="flex items-center justify-between"
                      >
                        <span>{line.productName}</span>
                        <span className="font-mono tabular-nums">
                          Cotizado: {formatPrice(line.quotedPrice)} → Actual:{" "}
                          {formatPrice(line.currentPrice)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="grid gap-2 pt-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setUseCurrentPrices(false)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        !useCurrentPrices
                          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                          : "hover:border-foreground/30",
                      )}
                    >
                      <p className="text-xs font-bold">Respetar presupuesto</p>
                      <p className="font-heading mt-1 text-lg font-extrabold tabular-nums">
                        {formatPrice(conversionInspection.quotedTotal)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseCurrentPrices(true)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        useCurrentPrices
                          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                          : "hover:border-foreground/30",
                      )}
                    >
                      <p className="text-xs font-bold">Precios actuales del menú</p>
                      <p className="font-heading mt-1 text-lg font-extrabold tabular-nums">
                        {formatPrice(conversionInspection.currentTotal)}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="convert-delivery">Modalidad de entrega</Label>
                  <Select
                    value={deliveryMethod}
                    items={DELIVERY_ITEMS}
                    onValueChange={(value) => {
                      if (value) setDeliveryMethod(value as DeliveryMethod);
                    }}
                  >
                    <SelectTrigger id="convert-delivery" className="h-11 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retiro">{DELIVERY_LABELS.retiro}</SelectItem>
                      <SelectItem value="delivery">{DELIVERY_LABELS.delivery}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="convert-payment">Medio de pago</Label>
                  <Select
                    value={paymentMethod}
                    items={PAYMENT_ITEMS}
                    onValueChange={(value) => {
                      if (value) setPaymentMethod(value as PaymentMethod);
                    }}
                  >
                    <SelectTrigger id="convert-payment" className="h-11 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">{PAYMENT_LABELS.efectivo}</SelectItem>
                      <SelectItem value="transferencia">
                        {PAYMENT_LABELS.transferencia}
                      </SelectItem>
                      <SelectItem value="mercado-pago">
                        {PAYMENT_LABELS["mercado-pago"]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {deliveryMethod === "delivery" && (
                <div className="space-y-1.5">
                  <Label htmlFor="convert-address">Dirección de entrega</Label>
                  <Input
                    id="convert-address"
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    placeholder="Ej.: Av. Libertador 2250, Piso 4"
                    className="h-11 rounded-xl"
                  />
                </div>
              )}

              <SheetFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConvertTarget(null)}
                  className="h-11 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmConversion}
                  className="h-11 gap-2 rounded-xl font-bold"
                >
                  <CheckCircle2 className="size-4" />
                  Confirmar y crear pedido
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Anular presupuesto */}
      <Sheet
        open={Boolean(voidTarget)}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Anular Presupuesto {voidTarget?.number}</SheetTitle>
            <SheetDescription>
              El presupuesto quedará marcado como anulado en el historial y no podrá
              convertirse en pedido.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleConfirmVoid} className="mt-6 space-y-4 px-4 pb-6">
            {voidError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm font-medium"
              >
                {voidError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="void-reason">Motivo de anulación (obligatorio)</Label>
              <Input
                id="void-reason"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Ej.: Cliente postergó la fecha del evento"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidTarget(null)}
                className="h-11 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="h-11 rounded-xl font-bold"
              >
                Anular presupuesto
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Vista previa A4 / Impresión */}
      <Sheet
        open={Boolean(previewQuote)}
        onOpenChange={(open) => {
          if (!open) setPreviewQuote(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              Comprobante de Presupuesto {previewQuote?.number}
            </SheetTitle>
            <SheetDescription>
              Vista previa lista para imprimir en hoja A4 o guardar como PDF.
            </SheetDescription>
          </SheetHeader>

          {previewQuote && (
            <div className="mt-6 space-y-5 px-4 pb-6">
              <div className="bg-background space-y-5 rounded-2xl border p-6 text-sm shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <p className="font-heading text-xl font-extrabold">
                      {businessConfig.site.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {businessConfig.site.address} ·{" "}
                      {businessConfig.site.whatsappNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                      DOCUMENTO NO VÁLIDO COMO FACTURA
                    </Badge>
                    <p className="mt-1 font-bold">PRESUPUESTO {previewQuote.number}</p>
                    <p className="text-muted-foreground text-xs">
                      Emitido: {formatDateTime(previewQuote.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/40 grid gap-3 rounded-xl p-3.5 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Para:</p>
                    <p className="font-bold">{previewQuote.customerName}</p>
                    <p className="text-muted-foreground text-xs">
                      {previewQuote.customerPhone ?? ""}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-muted-foreground text-xs">Validez de la oferta:</p>
                    <p className="font-bold">
                      Hasta el {formatDate(previewQuote.expiresAt)}
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Unitario</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewQuote.lines.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatPrice(item.quantity * item.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-muted-foreground max-w-sm text-xs">
                    {previewQuote.notes || "Precios expresados en ARS."}
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Total presupuestado</p>
                    <p className="font-heading text-2xl font-extrabold tabular-nums">
                      {formatPrice(previewQuote.total)}
                    </p>
                  </div>
                </div>
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewQuote(null)}
                  className="h-11 rounded-xl"
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="h-11 gap-2 rounded-xl font-bold"
                >
                  <Printer className="size-4" />
                  Imprimir / Guardar PDF
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
