"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Database,
  FileSpreadsheet,
  Lock,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { businessConfig } from "@/config/business.config";
import { PageHeader, SectionTabs, StatCards, type Stat } from "@/features/admin";
import { formatDate } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { useSystem } from "../hooks/use-system";
import { systemFiscalSchema } from "../schemas/system.schema";
import {
  getLocalStorageModulesSummary,
  recordAuditEntry,
  updateSystemFiscalConfig,
} from "../services/system-store";
import type { AuditCategory } from "../types";

type SystemTab = "config" | "auditoria";

function SystemManagerContent() {
  const isHydrated = useIsClient();
  const { fiscal, auditLog } = useSystem();
  const [tab, setTab] = useState<SystemTab>("config");

  // Estado Configuración Fiscal y Comercial
  const [businessLegalName, setBusinessLegalName] = useState(fiscal.businessLegalName);
  const [cuit, setCuit] = useState(fiscal.cuit);
  const [ivaCondition, setIvaCondition] = useState(fiscal.ivaCondition);
  const [arcaPointOfSale, setArcaPointOfSale] = useState(fiscal.arcaPointOfSale);
  const [ticketFooter, setTicketFooter] = useState(fiscal.ticketFooter);
  const [printQrOnTicket, setPrintQrOnTicket] = useState(fiscal.printQrOnTicket);
  const [cashDiscountPct, setCashDiscountPct] = useState(String(fiscal.cashDiscountPct));
  const [transferDiscountPct, setTransferDiscountPct] = useState(
    String(fiscal.transferDiscountPct),
  );
  const [creditSurchargePct, setCreditSurchargePct] = useState(String(fiscal.creditSurchargePct));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(fiscal.lowStockThreshold));
  const [fiadoDefaultDays, setFiadoDefaultDays] = useState(String(fiscal.fiadoDefaultDays));
  const [allowNegativeStock, setAllowNegativeStock] = useState(fiscal.allowNegativeStock);

  // Estado Auditoría
  const [auditSearch, setAuditSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "ALL">("ALL");
  const [manualAuditAction, setManualAuditAction] = useState("");
  const [manualAuditDetail, setManualAuditDetail] = useState("");
  const [manualAuditCat, setManualAuditCat] = useState<AuditCategory>("SISTEMA_CONFIG");

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLog.filter((entry) => {
      if (categoryFilter !== "ALL" && entry.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.detail.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q)
      );
    });
  }, [auditLog, auditSearch, categoryFilter]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const localStores = getLocalStorageModulesSummary();
  const totalBytes = localStores.reduce((sum, item) => sum + item.sizeBytes, 0);
  const warningAudits = auditLog.filter((a) => a.severity !== "info").length;

  const stats: Stat[] = [
    {
      label: "Punto de venta ARCA",
      value: `PV ${fiscal.arcaPointOfSale}`,
      hint: `${fiscal.ivaCondition} · CUIT ${fiscal.cuit}`,
      icon: Printer,
    },
    {
      label: "Reglas de cobro",
      value: `-${fiscal.cashDiscountPct}% Efvo`,
      hint: `+${fiscal.creditSurchargePct}% Crédito · -${fiscal.transferDiscountPct}% Transf.`,
      icon: Settings,
    },
    {
      label: "Eventos en bitácora",
      value: String(auditLog.length),
      hint: warningAudits > 0 ? `${warningAudits} alertas de supervisión` : "Trazabilidad completa",
      icon: ShieldCheck,
    },
    {
      label: "Almacenamiento local",
      value: `${Math.max(1, Math.round(totalBytes / 1024))} KB`,
      hint: `${localStores.length} módulos sincronizados`,
      icon: Database,
    },
  ];

  function handleSaveFiscal(e: FormEvent) {
    e.preventDefault();
    const parsed = systemFiscalSchema.safeParse({
      businessLegalName,
      cuit,
      ivaCondition,
      arcaPointOfSale,
      ticketFooter,
      printQrOnTicket,
      cashDiscountPct: Number(cashDiscountPct) || 0,
      transferDiscountPct: Number(transferDiscountPct) || 0,
      creditSurchargePct: Number(creditSurchargePct) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      fiadoDefaultDays: Number(fiadoDefaultDays) || 15,
      allowNegativeStock,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos fiscales y comerciales.");
      return;
    }

    updateSystemFiscalConfig(parsed.data);
    toast.success("Configuración comercial, fiscal ARCA y ticket 80mm guardada");
  }

  function handleAddManualAudit(e: FormEvent) {
    e.preventDefault();
    if (manualAuditAction.trim().length < 3) {
      toast.error("Describí la novedad de supervisión que querés asentar.");
      return;
    }
    recordAuditEntry({
      category: manualAuditCat,
      action: manualAuditAction.trim(),
      detail: manualAuditDetail.trim() || "Registro manual de supervisión en bitácora",
      actor: "Administrador / Encargado",
      severity: "info",
    });
    setManualAuditAction("");
    setManualAuditDetail("");
    toast.success("Entrada sellada en la bitácora de auditoría");
  }

  function handleExportAuditCsv() {
    const header = "Fecha,Categoría,Acción,Detalle,Usuario,Severidad\n";
    const rows = filteredAudit
      .map((entry) =>
        [
          entry.createdAt,
          entry.category,
          `"${entry.action.replace(/"/g, '""')}"`,
          `"${entry.detail.replace(/"/g, '""')}"`,
          `"${entry.actor.replace(/"/g, '""')}"`,
          entry.severity,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditoria-burger-vb-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Bitácora de auditoría exportada en CSV");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistema y auditoría"
        description="Ajustá parámetros fiscales ARCA, descuentos por medio de pago, ticket térmico de 80 mm y bitácora de auditoría inmutable."
      />

      <StatCards stats={stats} />

      <SectionTabs<SystemTab>
        id="system-tabs"
        label="Secciones de sistema"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "config", label: "Configuración comercial y fiscal", icon: Settings },
          {
            value: "auditoria",
            label: "Auditoría inmutable",
            icon: ShieldCheck,
            count: auditLog.length,
          },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        {tab === "config" && (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-12"
          >
            <form
              onSubmit={handleSaveFiscal}
              className="bg-background min-w-0 space-y-5 rounded-2xl border p-5 lg:col-span-7"
            >
              <div>
                <h3 className="text-lg font-bold">Datos fiscales ARCA y reglas operativas</h3>
                <p className="text-muted-foreground text-xs">
                  Definí los parámetros que se imprimen en los comprobantes de mostrador, recargos o
                  descuentos por medio de pago y umbrales de control.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sys-legal-name">Razón social / Titular</Label>
                  <Input
                    id="sys-legal-name"
                    value={businessLegalName}
                    onChange={(e) => setBusinessLegalName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sys-cuit">CUIT del comercio</Label>
                  <Input
                    id="sys-cuit"
                    value={cuit}
                    onChange={(e) => setCuit(e.target.value)}
                    className="h-11 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sys-iva">Condición frente al IVA</Label>
                  <select
                    id="sys-iva"
                    value={ivaCondition}
                    onChange={(e) =>
                      setIvaCondition(
                        e.target.value as "Responsable Inscripto" | "Monotributista" | "Exento",
                      )
                    }
                    className="border-input bg-background flex h-11 w-full rounded-md border px-3 text-sm"
                  >
                    {businessConfig.logistics.ivaConditions.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sys-ptovta">Punto de venta ARCA (4 dígitos)</Label>
                  <Input
                    id="sys-ptovta"
                    value={arcaPointOfSale}
                    onChange={(e) => setArcaPointOfSale(e.target.value)}
                    maxLength={5}
                    className="h-11 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-sm font-bold">
                  Descuentos y recargos sugeridos por medio de pago
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="sys-cash-disc" className="text-xs">
                      Desc. Efectivo (%)
                    </Label>
                    <Input
                      id="sys-cash-disc"
                      type="number"
                      min={0}
                      max={50}
                      value={cashDiscountPct}
                      onChange={(e) => setCashDiscountPct(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sys-transf-disc" className="text-xs">
                      Desc. Transferencia (%)
                    </Label>
                    <Input
                      id="sys-transf-disc"
                      type="number"
                      min={0}
                      max={50}
                      value={transferDiscountPct}
                      onChange={(e) => setTransferDiscountPct(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sys-cred-sur" className="text-xs">
                      Recargo Crédito (%)
                    </Label>
                    <Input
                      id="sys-cred-sur"
                      type="number"
                      min={0}
                      max={100}
                      value={creditSurchargePct}
                      onChange={(e) => setCreditSurchargePct(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sys-low-stock">Umbral de alerta de stock bajo (und)</Label>
                  <Input
                    id="sys-low-stock"
                    type="number"
                    min={1}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sys-fiado-days">Plazo de vencimiento de fiado (días)</Label>
                  <Input
                    id="sys-fiado-days"
                    type="number"
                    min={1}
                    value={fiadoDefaultDays}
                    onChange={(e) => setFiadoDefaultDays(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sys-footer">Mensaje al pie del ticket térmico (80 mm)</Label>
                  <Input
                    id="sys-footer"
                    value={ticketFooter}
                    onChange={(e) => setTicketFooter(e.target.value)}
                    className="h-10"
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <p className="text-sm font-medium">Imprimir QR del Club Burger en el ticket</p>
                    <p className="text-muted-foreground text-xs">
                      Permite al cliente escanear el comprobante para ver sus sellos y monedero.
                    </p>
                  </div>
                  <Switch checked={printQrOnTicket} onCheckedChange={setPrintQrOnTicket} />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <p className="text-sm font-medium">Permitir vender con stock negativo en POS</p>
                    <p className="text-muted-foreground text-xs">
                      Evita frenar la fila en hora pico aunque falte cargar un remito de pan o carne.
                    </p>
                  </div>
                  <Switch checked={allowNegativeStock} onCheckedChange={setAllowNegativeStock} />
                </label>
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                Guardar configuración del sistema
              </Button>
            </form>

            {/* Vista previa Ticket Térmico 80mm */}
            <div className="min-w-0 lg:col-span-5">
              <div className="bg-background rounded-2xl border p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider uppercase">
                    Simulación Ticket Térmico 80 mm
                  </span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    ARCA PV {arcaPointOfSale}
                  </Badge>
                </div>

                <div className="mx-auto max-w-xs rounded-xl border border-dashed bg-amber-50/40 p-4 font-mono text-xs leading-relaxed dark:bg-zinc-900">
                  <p className="text-center text-sm font-extrabold">{businessConfig.site.name}</p>
                  <p className="text-center text-[11px]">{businessLegalName}</p>
                  <p className="text-center text-[11px]">
                    CUIT: {cuit} · {ivaCondition}
                  </p>
                  <p className="text-muted-foreground text-center text-[10px]">
                    {businessConfig.site.address}
                  </p>
                  <div className="my-2 border-t border-dashed" />
                  <p className="flex justify-between">
                    <span>TIQUE FACTURA B</span>
                    <span>N° {arcaPointOfSale}-00014820</span>
                  </p>
                  <div className="my-2 border-t border-dashed" />
                  <p className="flex justify-between">
                    <span>2x Doble Smash Cheddar</span>
                    <span>$23.600</span>
                  </p>
                  <p className="flex justify-between">
                    <span>1x Papas Bacon & Cheddar</span>
                    <span>$7.900</span>
                  </p>
                  <div className="my-2 border-t border-dashed" />
                  <p className="flex justify-between text-sm font-extrabold">
                    <span>TOTAL</span>
                    <span>$31.500</span>
                  </p>
                  {Number(cashDiscountPct) > 0 && (
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      * Abonando en efectivo: -{cashDiscountPct}% de descuento
                    </p>
                  )}
                  <div className="my-2 border-t border-dashed" />
                  <p className="text-center text-[11px]">{ticketFooter}</p>
                  {printQrOnTicket && (
                    <p className="mt-2 text-center text-[10px] font-bold">
                      [ QR CLUB BURGER · CAE 74192837491823 ]
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "auditoria" && (
          <motion.div
            key="auditoria"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="bg-background space-y-4 rounded-2xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">
                    Bitácora de auditoría inmutable y supervisión
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Cada cierre Z, ajuste de stock, adelanto de sueldo o cambio fiscal queda sellado
                    con fecha, hora y responsable.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={handleExportAuditCsv}
                >
                  <FileSpreadsheet className="size-4" />
                  Exportar CSV
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="relative sm:col-span-6">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                  <Input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Buscar por acción, comprobante, empleado o detalle..."
                    className="h-11 pl-10"
                  />
                </div>
                <div className="sm:col-span-6">
                  <select
                    aria-label="Filtrar por categoría de auditoría"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as AuditCategory | "ALL")}
                    className="border-input bg-background flex h-11 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="ALL">Todas las categorías ({auditLog.length})</option>
                    {Object.entries(businessConfig.system.auditCategories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form
                onSubmit={handleAddManualAudit}
                className="bg-muted/30 grid gap-2 rounded-xl border p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-3">
                  <select
                    aria-label="Categoría de nota"
                    value={manualAuditCat}
                    onChange={(e) => setManualAuditCat(e.target.value as AuditCategory)}
                    className="border-input bg-background flex h-10 w-full rounded-md border px-2.5 text-xs"
                  >
                    {Object.entries(businessConfig.system.auditCategories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <Input
                    placeholder="Novedad (ej. Control de balanza y cámaras OK)"
                    value={manualAuditAction}
                    onChange={(e) => setManualAuditAction(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Observación o turno..."
                    value={manualAuditDetail}
                    onChange={(e) => setManualAuditDetail(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="secondary" className="h-10 w-full rounded-xl text-xs font-bold">
                    <Plus className="size-3.5" />
                    Asentar
                  </Button>
                </div>
              </form>
            </div>

            {filteredAudit.length === 0 ? (
              <div className="bg-background rounded-2xl border p-10 text-center">
                <Lock className="text-muted-foreground mx-auto size-10" />
                <p className="mt-3 font-semibold">No se encontraron eventos con ese filtro</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Probá limpiar la búsqueda o elegir todas las categorías.
                </p>
              </div>
            ) : (
              <div className="bg-background overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Fecha y hora</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Evento y detalle</TableHead>
                      <TableHead className="pr-5 text-right">Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="pl-5 font-mono text-xs whitespace-nowrap">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.severity === "critical"
                                ? "destructive"
                                : entry.severity === "warning"
                                  ? "default"
                                  : "secondary"
                            }
                            className="rounded-full text-[10px]"
                          >
                            {businessConfig.system.auditCategories[entry.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold">{entry.action}</p>
                          <p className="text-muted-foreground text-xs">{entry.detail}</p>
                        </TableCell>
                        <TableCell className="pr-5 text-right text-xs font-medium">
                          {entry.actor}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Monta el formulario recién después de hidratar, para que arranque con los datos guardados. */
export function SystemManager() {
  const isHydrated = useIsClient();
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  return <SystemManagerContent />;
}
