"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Calculator,
  CheckCircle2,
  Copy,
  FileCheck2,
  Lock,
  Plus,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Unlock,
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
import { PageHeader, SectionTabs, StatCards, type SectionTab, type Stat } from "@/features/admin";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { useCommercial } from "../../hooks/use-commercial";
import {
  addCashMovement,
  closeCashSessionWithArqueo,
  createCashCutX,
  createCashRegister,
  createFundTransfer,
  openCashSession,
  setActiveRegister,
} from "../../services/commercial-store";
import type { CashMovementKind, PosPaymentMethod } from "../../types";

type CashTabId = "actual" | "arqueo" | "cierres" | "sucursales";

const PAYMENT_LABELS = businessConfig.commercial.posPaymentMethods;

export function CashManager() {
  const { state, openSession, openSessionSummary } = useCommercial();
  const isHydrated = useIsClient();
  const [activeTab, setActiveTab] = useState<CashTabId>("actual");

  // Estados de apertura de turno
  const [openingAmountInput, setOpeningAmountInput] = useState("45000");
  const [openingNotesInput, setOpeningNotesInput] = useState("");

  // Estados de ingreso / egreso manual
  const [movementKind, setMovementKind] = useState<CashMovementKind>("egreso");
  const [movementRubro, setMovementRubro] = useState<string>("insumos_cocina");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [movementConcept, setMovementConcept] = useState<string>("");

  // Estados de arqueo y cierre Z
  const [countedCashInput, setCountedCashInput] = useState<string>("");
  const [closeNotesInput, setCloseNotesInput] = useState<string>("");

  // Estados de nueva caja y traspaso de fondos
  const [newRegName, setNewRegName] = useState("");
  const [newRegBranch, setNewRegBranch] = useState("Sucursal Centro");
  const [trfFrom, setTrfFrom] = useState("caja-mostrador-1");
  const [trfTo, setTrfTo] = useState("caja-delivery-2");
  const [trfAmount, setTrfAmount] = useState("");
  const [trfConcept, setTrfConcept] = useState("");

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const closedSessions = state.sessions.filter((s) => s.status === "cerrada");
  const currentMovements = openSession
    ? state.movements.filter((m) => m.sessionId === openSession.id)
    : state.movements.slice(0, 10);

  const tabs: SectionTab<CashTabId>[] = [
    { value: "actual", label: "Caja actual y movimientos", count: currentMovements.length },
    { value: "arqueo", label: "Arqueo y cierre (Z)" },
    { value: "cierres", label: "Historial cerrado (Z)", count: closedSessions.length },
    {
      value: "sucursales",
      label: "Cajas y traspasos",
      count: state.registers.length,
    },
  ];

  const stats: Stat[] = [
    {
      label: "Efectivo esperado en cajón",
      value: openSessionSummary ? formatCurrency(openSessionSummary.expectedCash) : "$0",
      hint: openSession
        ? `Fondo ${formatCurrency(openSession.openingAmount)} + efectivo neto`
        : "Caja cerrada",
      icon: Banknote,
    },
    {
      label: "Ventas totales del turno",
      value: openSessionSummary ? formatCurrency(openSessionSummary.totalSales) : "$0",
      hint: openSessionSummary ? `${openSessionSummary.salesCount} tickets cobrados` : "Sin turno",
      icon: ShoppingBag,
    },
    {
      label: "Medios digitales del turno",
      value: openSessionSummary ? formatCurrency(openSessionSummary.digitalSales) : "$0",
      hint: "Tarjetas, transferencia y QR MP",
      icon: Wallet,
    },
    {
      label: "Ingresos / Egresos manuales",
      value: openSessionSummary
        ? `${formatCurrency(openSessionSummary.cashIn)} / -${formatCurrency(openSessionSummary.cashOut)}`
        : "$0 / $0",
      hint: `${state.cutsX.length} Cortes X emitidos`,
      icon: Calculator,
    },
  ];

  const rubrosForKind = businessConfig.commercial.cashRubros[movementKind];
  const rubroItems = Object.fromEntries(rubrosForKind.map((r) => [r.id, r.label]));

  const registerItems = Object.fromEntries(
    state.registers.map((r) => [r.id, `${r.name} (${r.branch})`]),
  );

  function handleOpenSession() {
    const res = openCashSession({
      registerId: state.activeRegisterId,
      openingAmount: Number(openingAmountInput) || 0,
      notes: openingNotesInput,
      user: "Encargado",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Caja abierta · Turno #${res.value.number}`);
    setOpeningNotesInput("");
  }

  function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    const res = addCashMovement({
      kind: movementKind,
      rubroId: movementRubro,
      amount: Number(movementAmount) || 0,
      concept: movementConcept,
      user: "Encargado",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `${movementKind === "ingreso" ? "Ingreso" : "Egreso"} registrado por ${formatCurrency(res.value.amount)}`,
    );
    setMovementAmount("");
    setMovementConcept("");
  }

  function handleEmitCorteX() {
    const res = createCashCutX("Encargado");
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Corte X #${res.value.number} emitido · Efectivo esperado: ${formatCurrency(res.value.expectedCash)}`,
    );
  }

  const expectedCash = openSessionSummary?.expectedCash ?? 0;
  const countedCashVal =
    countedCashInput.trim() === "" ? expectedCash : Math.round(Number(countedCashInput) || 0);
  const cashDifference = countedCashVal - expectedCash;

  function buildWhatsAppCloseSummary(): string {
    if (!openSession || !openSessionSummary) return "";
    return [
      `🍔 *CIERRE DE CAJA · ${businessConfig.site.name.toUpperCase()}*`,
      `Caja: ${openSession.registerName} (Turno #${openSession.number})`,
      `Ventas totales: ${formatCurrency(openSessionSummary.totalSales)} (${openSessionSummary.salesCount} tickets)`,
      `• Efectivo ventas: ${formatCurrency(openSessionSummary.cashSales)}`,
      `• Digital (MP/Tarjetas/Transf): ${formatCurrency(openSessionSummary.digitalSales)}`,
      `• Fiado / Cta. Cte.: ${formatCurrency(openSessionSummary.creditSales)}`,
      `Fondo inicial: ${formatCurrency(openSessionSummary.openingAmount)}`,
      `Ingresos manuales: +${formatCurrency(openSessionSummary.cashIn)}`,
      `Egresos / Gastos: -${formatCurrency(openSessionSummary.cashOut)}`,
      `Efectivo esperado: ${formatCurrency(expectedCash)}`,
      `Efectivo contado: ${formatCurrency(countedCashVal)}`,
      `Diferencia: ${cashDifference === 0 ? "Exacto ($0)" : formatCurrency(cashDifference)}`,
    ].join("\n");
  }

  function handleCloseSessionZ() {
    const res = closeCashSessionWithArqueo({
      countedCash: countedCashVal,
      notes: closeNotesInput,
      user: "Dueño",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Corte Z #${res.value.number} sellado con SHA-256 (${res.value.sealHash?.slice(0, 10)}...)`,
    );
    setCountedCashInput("");
    setCloseNotesInput("");
    setActiveTab("cierres");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de caja y arqueo"
        description="Control de turno en 4 pasos, ingresos/egresos de cajón, Cortes X y Cierre Z sellado con SHA-256."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={registerItems}
              value={state.activeRegisterId}
              onValueChange={(v) => typeof v === "string" && setActiveRegister(v)}
            >
              <SelectTrigger className="h-10! w-64 text-xs font-semibold" aria-label="Caja activa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.registers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.branch})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-10 rounded-xl font-semibold"
              nativeButton={false}
              render={<Link href="/dashboard/vender" />}
            >
              <ShoppingBag className="size-4" />
              Ir a Vender POS (F1)
            </Button>
          </div>
        }
      />

      {/* Tablero guiado del turno de 4 pasos (inspirado en raveV2) */}
      <div className="bg-card rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            {openSession ? (
              <Badge className="bg-emerald-600 text-white">
                <Unlock className="mr-1 size-3" /> Turno #{openSession.number} abierto
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Lock className="mr-1 size-3" /> Caja cerrada
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {openSession
                ? `Abierta el ${formatDateTime(openSession.openedAt)} por ${openSession.openedBy}`
                : "Abrí la caja con el cambio inicial para habilitar las ventas en mostrador."}
            </span>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-4">
          <div
            className={`rounded-xl border p-3 ${
              !openSession ? "border-primary bg-primary/5" : "bg-muted/30"
            }`}
          >
            <p className="text-xs font-extrabold">1. Abrir caja</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {openSession
                ? `Fondo inicial: ${formatCurrency(openSession.openingAmount)}`
                : "Declarar fondo de cambio"}
            </p>
          </div>
          <Link
            href="/dashboard/vender"
            className="hover:border-primary/50 bg-muted/30 block rounded-xl border p-3 transition-colors"
          >
            <p className="text-xs font-extrabold">2. Vender y cobrar →</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {openSessionSummary
                ? `${openSessionSummary.salesCount} ventas · ${formatCurrency(openSessionSummary.totalSales)}`
                : "Mostrador POS y comandas"}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => setActiveTab("actual")}
            className={`rounded-xl border p-3 text-left transition-colors ${
              activeTab === "actual" && openSession
                ? "border-primary bg-primary/5"
                : "bg-muted/30"
            }`}
          >
            <p className="text-xs font-extrabold">3. Ingresos y egresos</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Gastos de cocina, cadetería o refuerzo de cambio
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("arqueo")}
            className={`rounded-xl border p-3 text-left transition-colors ${
              activeTab === "arqueo" ? "border-primary bg-primary/5" : "bg-muted/30"
            }`}
          >
            <p className="text-xs font-extrabold">4. Arqueo y cierre Z</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Contar billetes, comparar esperado y sellar turno
            </p>
          </button>
        </div>
      </div>

      <StatCards stats={stats} />

      <SectionTabs
        id="cash-tabs"
        label="Apartados de gestión de caja"
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* APARTADO 1: CAJA ACTUAL Y MOVIMIENTOS */}
      {activeTab === "actual" && (
        <div className="space-y-6">
          {!openSession ? (
            <section className="bg-card rounded-2xl border p-6 shadow-sm">
              <h2 className="text-lg font-extrabold">Abrir nuevo turno de caja</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Indicá el dinero físico con el que arranca el cajón para calcular el arqueo exacto
                al final de la noche.
              </p>
              <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold">Fondo inicial en efectivo ($)</label>
                  <Input
                    type="number"
                    value={openingAmountInput}
                    onChange={(e) => setOpeningAmountInput(e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Observación de apertura</label>
                  <Input
                    value={openingNotesInput}
                    onChange={(e) => setOpeningNotesInput(e.target.value)}
                    placeholder="Ej. Turno noche viernes"
                    className="mt-1 h-11"
                  />
                </div>
              </div>
              <Button className="mt-4 h-11 rounded-xl font-bold" onClick={handleOpenSession}>
                <Unlock className="size-4" />
                Abrir caja ahora
              </Button>
            </section>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Formulario de Ingreso / Egreso de Caja */}
              <form
                onSubmit={handleAddMovement}
                className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold">Registrar movimiento de cajón</h2>
                    <p className="text-muted-foreground text-xs">
                      Toda entrada o salida de billetes que no sea una venta directa.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={movementKind === "egreso" ? "default" : "outline"}
                    className="h-10 rounded-xl font-bold"
                    onClick={() => {
                      setMovementKind("egreso");
                      setMovementRubro(businessConfig.commercial.cashRubros.egreso[0].id);
                    }}
                  >
                    <ArrowUpRight className="size-4" />
                    Egreso / Gasto
                  </Button>
                  <Button
                    type="button"
                    variant={movementKind === "ingreso" ? "default" : "outline"}
                    className="h-10 rounded-xl font-bold"
                    onClick={() => {
                      setMovementKind("ingreso");
                      setMovementRubro(businessConfig.commercial.cashRubros.ingreso[0].id);
                    }}
                  >
                    <ArrowDownLeft className="size-4" />
                    Ingreso de efectivo
                  </Button>
                </div>

                <div>
                  <label className="text-xs font-semibold">Rubro del movimiento</label>
                  <Select
                    items={rubroItems}
                    value={movementRubro}
                    onValueChange={(v) => typeof v === "string" && setMovementRubro(v)}
                  >
                    <SelectTrigger className="mt-1 h-10! w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rubrosForKind.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Importe en efectivo ($)</label>
                  <Input
                    type="number"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="Ej. 8500"
                    className="mt-1 h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Detalle / Comprobante</label>
                  <Input
                    value={movementConcept}
                    onChange={(e) => setMovementConcept(e.target.value)}
                    placeholder="Ej. Pago cadete lluvia / Hielo y pan"
                    className="mt-1 h-10"
                  />
                </div>

                <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                  <Plus className="size-4" />
                  Guardar {movementKind === "ingreso" ? "ingreso" : "egreso"}
                </Button>
              </form>

              {/* Listado de Movimientos + Cortes X */}
              <div className="space-y-6 lg:col-span-7">
                <section className="bg-card rounded-2xl border shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
                    <div>
                      <h2 className="text-base font-extrabold">Movimientos manuales del turno</h2>
                      <p className="text-muted-foreground text-xs">
                        Impactan directamente sobre el efectivo esperado en el cajón.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl font-semibold"
                      onClick={handleEmitCorteX}
                    >
                      <Printer className="size-4" />
                      Emitir Corte X parcial
                    </Button>
                  </div>

                  {currentMovements.length === 0 ? (
                    <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                      No hay ingresos ni egresos manuales en este turno.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-5">Hora</TableHead>
                          <TableHead>Tipo / Rubro</TableHead>
                          <TableHead>Detalle</TableHead>
                          <TableHead className="pr-5 text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentMovements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-muted-foreground pl-5 text-xs">
                              {formatDateTime(m.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={m.kind === "ingreso" ? "secondary" : "outline"}
                                className="mr-1.5"
                              >
                                {m.kind === "ingreso" ? "Ingreso" : "Egreso"}
                              </Badge>
                              <span className="text-xs font-medium">{m.rubroLabel}</span>
                            </TableCell>
                            <TableCell className="text-xs">{m.concept}</TableCell>
                            <TableCell
                              className={`pr-5 text-right font-bold tabular-nums ${
                                m.kind === "ingreso" ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {m.kind === "ingreso" ? "+" : "-"}
                              {formatCurrency(m.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>

                {/* Cortes X emitidos */}
                {state.cutsX.length > 0 && (
                  <section className="bg-card rounded-2xl border p-5 shadow-sm">
                    <h3 className="text-sm font-extrabold">
                      Lecturas parciales (Cortes X) sin cierre
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {state.cutsX.slice(0, 4).map((cut) => (
                        <div
                          key={cut.id}
                          className="bg-muted/30 flex items-center justify-between rounded-xl border p-3 text-xs"
                        >
                          <div>
                            <p className="font-bold">
                              Corte X #{cut.number} · {cut.salesCount} ventas
                            </p>
                            <p className="text-muted-foreground">
                              {formatDateTime(cut.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold">
                              {formatCurrency(cut.expectedCash)}
                            </p>
                            <span className="text-muted-foreground text-[10px]">
                              Efectivo esperado
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* APARTADO 2: ARQUEO DE UN SOLO DUEÑO Y CIERRE Z */}
      {activeTab === "arqueo" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="bg-card space-y-5 rounded-2xl border p-6 shadow-sm lg:col-span-7">
            <div>
              <Badge variant="outline" className="mb-2">
                Modo un solo dueño · Vista transparente
              </Badge>
              <h2 className="text-xl font-extrabold">Arqueo de efectivo y Cierre de Caja (Z)</h2>
              <p className="text-muted-foreground text-sm">
                Compará el efectivo que calcula el sistema contra los billetes reales del cajón y
                sellá el turno con huella criptográfica SHA-256.
              </p>
            </div>

            {!openSession || !openSessionSummary ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-bold">La caja ya está cerrada</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Podés consultar todos los cierres anteriores en la pestaña Historial cerrado (Z).
                </p>
              </div>
            ) : (
              <>
                <div className="bg-muted/30 space-y-2 rounded-2xl border p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1. Fondo inicial de apertura</span>
                    <span className="font-semibold tabular-nums">
                      +{formatCurrency(openSessionSummary.openingAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      2. Ventas cobradas en efectivo (neto de vuelto)
                    </span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      +{formatCurrency(openSessionSummary.cashSales)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">3. Ingresos manuales al cajón</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      +{formatCurrency(openSessionSummary.cashIn)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">4. Egresos / pagos por caja</span>
                    <span className="font-semibold text-rose-600 tabular-nums">
                      -{formatCurrency(openSessionSummary.cashOut)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-base font-extrabold">
                    <span>Efectivo esperado en el cajón</span>
                    <span className="text-primary tabular-nums">
                      {formatCurrency(expectedCash)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold">
                      Efectivo físico contado en cajón ($)
                    </label>
                    <Input
                      type="number"
                      value={countedCashInput}
                      onChange={(e) => setCountedCashInput(e.target.value)}
                      placeholder={String(expectedCash)}
                      className="mt-1.5 h-11 text-base font-bold"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div
                      className={`flex h-11 items-center justify-between rounded-xl border px-4 font-bold ${
                        cashDifference === 0
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                          : cashDifference > 0
                            ? "border-blue-500/40 bg-blue-500/10 text-blue-700"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-700"
                      }`}
                    >
                      <span className="text-xs">
                        {cashDifference === 0
                          ? "✔ Cuadra exacto"
                          : cashDifference > 0
                            ? "Sobrante de caja"
                            : "Faltante de caja"}
                      </span>
                      <span className="tabular-nums">
                        {cashDifference > 0 ? "+" : ""}
                        {formatCurrency(cashDifference)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold">Nota de cierre / observaciones</label>
                  <Textarea
                    value={closeNotesInput}
                    onChange={(e) => setCloseNotesInput(e.target.value)}
                    placeholder="Ej. Se retiraron $80.000 para sobre fuerte, quedan $30.000 de cambio."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="h-12 flex-1 rounded-xl font-extrabold"
                    onClick={handleCloseSessionZ}
                  >
                    <ShieldCheck className="size-5" />
                    Cerrar y sellar turno (Corte Z)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl font-semibold"
                    onClick={() => {
                      navigator.clipboard.writeText(buildWhatsAppCloseSummary());
                      toast.success("Resumen de cierre copiado para pegar en WhatsApp");
                    }}
                  >
                    <Copy className="size-4" />
                    Copiar resumen WhatsApp
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* Desglose por medio de pago del turno */}
          <section className="bg-card space-y-4 rounded-2xl border p-6 shadow-sm lg:col-span-5">
            <h3 className="text-base font-extrabold">Desglose por medio de cobro</h3>
            <p className="text-muted-foreground text-xs">
              Conciliá tus terminales Posnet, Mercado Pago y transferencias antes de cerrar.
            </p>
            {openSessionSummary ? (
              <div className="divide-y rounded-xl border">
                {(Object.keys(PAYMENT_LABELS) as PosPaymentMethod[]).map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium">{PAYMENT_LABELS[method]}</span>
                    <span className="font-bold tabular-nums">
                      {formatCurrency(openSessionSummary.byMethod[method] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Sin turno abierto en este momento.
              </p>
            )}
          </section>
        </div>
      )}

      {/* APARTADO 3: HISTORIAL DE CIERRES Z SELLADOS */}
      {activeTab === "cierres" && (
        <section className="bg-card rounded-2xl border shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-extrabold">
              Cierres de caja sellados (Cortes Z inmutables)
            </h2>
            <p className="text-muted-foreground text-xs">
              Cada cierre genera un sello criptográfico SHA-256 sobre los importes esperados,
              contados y ventas del turno.
            </p>
          </div>

          {closedSessions.length === 0 ? (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              Todavía no hay turnos cerrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Turno / Caja</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead className="text-right">Ventas Totales</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead className="pr-5">Sello SHA-256</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedSessions.map((sess) => {
                  const diff = sess.differenceAtClose ?? 0;
                  return (
                    <TableRow key={sess.id}>
                      <TableCell className="pl-5">
                        <p className="font-bold">Corte Z #{sess.number}</p>
                        <p className="text-muted-foreground text-xs">{sess.registerName}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{sess.closedAt ? formatDateTime(sess.closedAt) : "—"}</p>
                        <p className="text-muted-foreground">Por {sess.closedBy}</p>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {formatCurrency(sess.totalSalesAtClose ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sess.expectedCashAtClose ?? 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(sess.countedCashAtClose ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            diff === 0 ? "secondary" : diff > 0 ? "outline" : "destructive"
                          }
                        >
                          {diff === 0 ? "Exacto" : formatCurrency(diff)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center gap-1.5">
                          <FileCheck2 className="size-4 text-emerald-600" />
                          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                            {sess.sealHash?.slice(0, 14)}…
                          </code>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      {/* APARTADO 4: CAJAS, SUCURSALES Y TRASPASOS DE FONDOS */}
      {activeTab === "sucursales" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-6">
            <div className="flex items-center gap-2">
              <Building2 className="text-primary size-5" />
              <div>
                <h2 className="text-base font-extrabold">Cajas y puntos de cobro</h2>
                <p className="text-muted-foreground text-xs">
                  Administrá cajas de mostrador, barra o expedición de delivery.
                </p>
              </div>
            </div>

            <div className="divide-y rounded-xl border">
              {state.registers.map((reg) => {
                const isActive = reg.id === state.activeRegisterId;
                return (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-bold">{reg.name}</p>
                      <p className="text-muted-foreground text-xs">{reg.branch}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="h-8 rounded-lg text-xs"
                      onClick={() => {
                        setActiveRegister(reg.id);
                        toast.success(`Caja activa cambiada a ${reg.name}`);
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> En uso
                        </>
                      ) : (
                        "Seleccionar"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-bold uppercase">Agregar nueva caja</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input
                  value={newRegName}
                  onChange={(e) => setNewRegName(e.target.value)}
                  placeholder="Nombre (ej. Caja 3 · Foodtruck)"
                  className="h-9 text-xs"
                />
                <Input
                  value={newRegBranch}
                  onChange={(e) => setNewRegBranch(e.target.value)}
                  placeholder="Sucursal"
                  className="h-9 text-xs"
                />
              </div>
              <Button
                size="sm"
                className="mt-2 h-9 rounded-xl text-xs font-bold"
                onClick={() => {
                  const res = createCashRegister({ name: newRegName, branch: newRegBranch });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`Caja ${res.value.name} creada`);
                  setNewRegName("");
                }}
              >
                <Plus className="size-3.5" />
                Crear caja
              </Button>
            </div>
          </section>

          <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-6">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="text-primary size-5" />
              <div>
                <h2 className="text-base font-extrabold">
                  Boleta de Movimiento de Fondos (BMF)
                </h2>
                <p className="text-muted-foreground text-xs">
                  Traspaso trazable de efectivo entre cajas o hacia tesorería.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Desde caja (Origen)</label>
                <Select
                  items={registerItems}
                  value={trfFrom}
                  onValueChange={(v) => typeof v === "string" && setTrfFrom(v)}
                >
                  <SelectTrigger className="mt-1 h-9! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.registers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">Hacia caja (Destino)</label>
                <Select
                  items={registerItems}
                  value={trfTo}
                  onValueChange={(v) => typeof v === "string" && setTrfTo(v)}
                >
                  <SelectTrigger className="mt-1 h-9! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.registers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold">Importe ($)</label>
                <Input
                  type="number"
                  value={trfAmount}
                  onChange={(e) => setTrfAmount(e.target.value)}
                  placeholder="Ej. 15000"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Motivo / Concepto</label>
                <Input
                  value={trfConcept}
                  onChange={(e) => setTrfConcept(e.target.value)}
                  placeholder="Cambio para cadetería"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <Button
              size="sm"
              className="h-9 rounded-xl text-xs font-bold"
              onClick={() => {
                const res = createFundTransfer({
                  fromRegisterId: trfFrom,
                  toRegisterId: trfTo,
                  amount: Number(trfAmount) || 0,
                  concept: trfConcept,
                  user: "Encargado",
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`Boleta ${res.value.number} emitida correctamente`);
                setTrfAmount("");
                setTrfConcept("");
              }}
            >
              Emitir Boleta de Traspaso
            </Button>

            <div className="divide-y rounded-xl border">
              {state.transfers.map((trf) => (
                <div
                  key={trf.id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-bold">
                      {trf.number} · {trf.fromRegisterName} → {trf.toRegisterName}
                    </p>
                    <p className="text-muted-foreground">
                      {trf.concept} · {formatDateTime(trf.createdAt)}
                    </p>
                  </div>
                  <span className="font-extrabold tabular-nums">
                    {formatCurrency(trf.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
