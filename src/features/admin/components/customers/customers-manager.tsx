"use client";

import { useState } from "react";
import {
  Banknote,
  Cake,
  FileText,
  MessageCircle,
  Moon,
  Plus,
  UserPlus,
  Users,
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
import { businessConfig } from "@/config/business.config";
import {
  DEFAULT_INACTIVE_DAYS,
  SEGMENTS,
  SEGMENT_LABELS,
  deleteCustomer,
  getCustomerCreditLimit,
  getCustomerDebt,
  isCustomerSegment,
  isInactive,
  matchesSegment,
  recordCustomerCreditCharge,
  recordCustomerCreditPayment,
  useCustomerCreditMovements,
  useCustomers,
  type Customer,
  type CustomerSegment,
} from "@/features/customers";
import { useLoyaltySettings } from "@/features/loyalty";
import { isBirthdayThisMonth, isSameMonth } from "@/lib/dates";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { normalizePhone } from "@/lib/ids";
import { RedeemDialog } from "../loyalty/redeem-dialog";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { PageHeader } from "../shared/page-header";
import { SearchInput } from "../shared/search-input";
import { SectionTabs, type SectionTab } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";
import { CustomerForm } from "./customer-form";
import { CustomersTable } from "./customers-table";

type FormTarget = { customer: Customer | null; key: number };
type CustomersTabId = "listado" | "fiado";

export function CustomersManager() {
  const customers = useCustomers();
  const creditMovements = useCustomerCreditMovements();
  const { stampsRequired } = useLoyaltySettings();
  const [now] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<CustomersTabId>("listado");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("todos");
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [redeeming, setRedeeming] = useState<Customer | null>(null);

  // Estados para Cuenta Corriente / Fiado
  const [ccCustomerId, setCcCustomerId] = useState<string>("");
  const [ccAction, setCcAction] = useState<"pago" | "cargo">("pago");
  const [ccAmount, setCcAmount] = useState<string>("");
  const [ccMethod, setCcMethod] = useState<string>("transferencia");
  const [ccReference, setCcReference] = useState<string>("");

  const segmentOptions = { now, inactiveDays: DEFAULT_INACTIVE_DAYS, stampsRequired };
  const withAccount = customers.filter((customer) => customer.account).length;

  const customersWithDebt = customers
    .map((c) => ({
      customer: c,
      debt: getCustomerDebt(c.id),
      limit: getCustomerCreditLimit(c),
    }))
    .filter((row) => row.debt > 0)
    .sort((a, b) => b.debt - a.debt);

  const totalFiadoDebt = customersWithDebt.reduce((acc, r) => acc + r.debt, 0);

  const stats: Stat[] = [
    {
      label: "Clientes registrados",
      value: String(customers.length),
      hint: `${withAccount} con acceso a la app`,
      icon: Users,
    },
    {
      label: "Por cobrar en Fiado / Cta. Cte.",
      value: formatCurrency(totalFiadoDebt),
      hint: `${customersWithDebt.length} clientes con saldo pendiente`,
      icon: FileText,
    },
    {
      label: "Cumplen este mes",
      value: String(
        customers.filter((customer) => isBirthdayThisMonth(customer.birthday, now)).length,
      ),
      hint: `${customers.filter((c) => isSameMonth(c.createdAt, now)).length} nuevos este mes`,
      icon: Cake,
    },
    {
      label: "Inactivos",
      value: String(customers.filter((customer) => isInactive(customer, segmentOptions)).length),
      hint: `Sin pedir hace más de ${DEFAULT_INACTIVE_DAYS} días`,
      icon: Moon,
    },
  ];

  const tabs: SectionTab<CustomersTabId>[] = [
    { value: "listado", label: "Directorio de clientes", count: customers.length },
    {
      value: "fiado",
      label: "Cuenta corriente y fiado",
      count: customersWithDebt.length,
    },
  ];

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const queryDigits = normalizePhone(query);
  const visibleCustomers = customers.filter((customer) => {
    if (!matchesSegment(customer, segment, segmentOptions)) return false;
    if (!normalizedQuery) return true;
    return (
      customer.name.toLocaleLowerCase("es").includes(normalizedQuery) ||
      customer.email.toLocaleLowerCase("es").includes(normalizedQuery) ||
      (queryDigits.length > 2 && normalizePhone(customer.phone).includes(queryDigits))
    );
  });

  function openForm(customer: Customer | null) {
    setFormTarget((previous) => ({ customer, key: (previous?.key ?? 0) + 1 }));
  }

  function handleCreditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetId = ccCustomerId || customers[0]?.id || "";
    const amount = Number(ccAmount) || 0;
    if (ccAction === "pago") {
      const res = recordCustomerCreditPayment({
        customerId: targetId,
        amount,
        method: ccMethod,
        reference: ccReference,
        user: "Encargado",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Cobro de ${formatCurrency(Math.abs(res.movement.amount))} registrado a ${res.movement.customerName}`,
      );
    } else {
      const res = recordCustomerCreditCharge({
        customerId: targetId,
        amount,
        reference: ccReference || "Cargo manual en cuenta corriente",
        user: "Encargado",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Cargo de ${formatCurrency(res.movement.amount)} sumado a ${res.movement.customerName}`,
      );
    }
    setCcAmount("");
    setCcReference("");
  }

  const customerItems = Object.fromEntries(
    customers.map((c) => [
      c.id,
      `${c.name} (Deuda: ${formatCurrency(getCustomerDebt(c.id))})`,
    ]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes y cuenta corriente"
        description="Administrá tus clientes, sus sellos, su acceso a la app y el libro de Fiado / Cuenta corriente."
        actions={
          <Button className="h-11 rounded-xl font-semibold" onClick={() => openForm(null)}>
            <UserPlus aria-hidden="true" className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <StatCards stats={stats} />

      <SectionTabs
        id="customers-tabs"
        label="Apartados de clientes"
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "listado" && (
        <section
          aria-labelledby="customers-title"
          className="bg-card min-w-0 rounded-2xl border shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="customers-title" className="text-lg font-bold">
              Listado{" "}
              <span className="text-muted-foreground text-sm font-normal">
                ({visibleCustomers.length})
              </span>
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                value={query}
                onChange={setQuery}
                label="Buscar por nombre, email o teléfono"
                className="sm:w-72"
              />
              <Select
                items={SEGMENT_LABELS}
                value={segment}
                onValueChange={(value) => setSegment(isCustomerSegment(value) ? value : "todos")}
              >
                <SelectTrigger className="h-11! w-full sm:w-60" aria-label="Filtrar clientes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SEGMENT_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CustomersTable
            customers={visibleCustomers}
            stampsRequired={stampsRequired}
            now={now}
            onEdit={(customer) => openForm(customer)}
            onDelete={setDeleting}
            onRedeem={setRedeeming}
          />
        </section>
      )}

      {activeTab === "fiado" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Formulario de cobro o cargo en cuenta corriente */}
            <form
              onSubmit={handleCreditSubmit}
              className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-5"
            >
              <div>
                <h2 className="text-base font-extrabold">
                  Registrar cobro o cargo en Cuenta Corriente
                </h2>
                <p className="text-muted-foreground text-xs">
                  También podés mandar una venta directo a Fiado desde Vender POS con el atajo F4.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={ccAction === "pago" ? "default" : "outline"}
                  className="h-10 rounded-xl font-bold"
                  onClick={() => setCcAction("pago")}
                >
                  <Banknote className="size-4" />
                  Cobrar saldo (Pago)
                </Button>
                <Button
                  type="button"
                  variant={ccAction === "cargo" ? "default" : "outline"}
                  className="h-10 rounded-xl font-bold"
                  onClick={() => setCcAction("cargo")}
                >
                  <Plus className="size-4" />
                  Sumar deuda (Cargo)
                </Button>
              </div>

              <div>
                <label className="text-xs font-semibold">Cliente</label>
                <Select
                  items={customerItems}
                  value={ccCustomerId || customers[0]?.id || ""}
                  onValueChange={(v) => typeof v === "string" && setCcCustomerId(v)}
                >
                  <SelectTrigger className="mt-1 h-10! w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (Deuda: {formatCurrency(getCustomerDebt(c.id))})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Importe ($)</label>
                  <Input
                    type="number"
                    value={ccAmount}
                    onChange={(e) => setCcAmount(e.target.value)}
                    placeholder="Ej. 10000"
                    className="mt-1 h-10"
                  />
                </div>
                {ccAction === "pago" && (
                  <div>
                    <label className="text-xs font-semibold">Medio de pago</label>
                    <Select
                      items={{
                        transferencia: "Transferencia",
                        efectivo: "Efectivo",
                        mercadopago: "Mercado Pago",
                        debito: "Débito",
                      }}
                      value={ccMethod}
                      onValueChange={(v) => typeof v === "string" && setCcMethod(v)}
                    >
                      <SelectTrigger className="mt-1 h-10! w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                        <SelectItem value="debito">Débito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold">Concepto / Referencia</label>
                <Input
                  value={ccReference}
                  onChange={(e) => setCcReference(e.target.value)}
                  placeholder={
                    ccAction === "pago"
                      ? "Ej. Entrega parcial por transferencia"
                      : "Ej. Pedido evento viernes"
                  }
                  className="mt-1 h-10"
                />
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                {ccAction === "pago" ? "Registrar cobro de deuda" : "Registrar cargo a fiado"}
              </Button>
            </form>

            {/* Clientes con saldo deudor y recordatorio WhatsApp */}
            <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-7">
              <div>
                <h2 className="text-base font-extrabold">
                  Saldos pendientes por cobrar ({customersWithDebt.length})
                </h2>
                <p className="text-muted-foreground text-xs">
                  Enviá el estado de cuenta por WhatsApp con un toque (el envío lo confirmás vos en
                  WhatsApp).
                </p>
              </div>

              {customersWithDebt.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  ¡Al día! Ningún cliente registra deuda en cuenta corriente.
                </p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {customersWithDebt.map(({ customer, debt, limit }) => {
                    const digits = normalizePhone(customer.phone);
                    const waText = `Hola ${customer.name.split(" ")[0]}, te escribimos de ${businessConfig.site.name}. Te recordamos que tu saldo pendiente en cuenta corriente es de ${formatCurrency(debt)}. Podés abonarlo por transferencia o en el local. ¡Muchas gracias!`;
                    return (
                      <div
                        key={customer.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-bold">{customer.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Límite: {formatCurrency(limit)} · Disponible:{" "}
                            {formatCurrency(Math.max(0, limit - debt))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs font-extrabold">
                            Debe {formatCurrency(debt)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => {
                              setCcCustomerId(customer.id);
                              setCcAction("pago");
                              setCcAmount(String(debt));
                            }}
                          >
                            Saldar
                          </Button>
                          {digits && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              nativeButton={false}
                              render={
                                <a
                                  href={`https://wa.me/${digits}?text=${encodeURIComponent(waText)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <MessageCircle className="size-3.5" />
                              WhatsApp
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Historial de movimientos de cuenta corriente */}
          <section className="bg-card rounded-2xl border shadow-sm">
            <div className="border-b px-5 py-4">
              <h3 className="text-base font-extrabold">
                Libro mayor de Cuenta Corriente / Fiado
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="pr-5 text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground pl-5 text-xs">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">{m.customerName}</TableCell>
                    <TableCell>
                      <Badge variant={m.amount > 0 ? "outline" : "secondary"}>
                        {m.amount > 0 ? "Cargo a Fiado" : `Pago (${m.method ?? "caja"})`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.reference}</TableCell>
                    <TableCell
                      className={`pr-5 text-right font-bold tabular-nums ${
                        m.amount > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {m.amount > 0 ? "+" : ""}
                      {formatCurrency(m.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      )}

      <Sheet open={formTarget !== null} onOpenChange={(open) => !open && setFormTarget(null)}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 pr-14">
            <SheetTitle className="text-lg font-bold">
              {formTarget?.customer ? `Editar ${formTarget.customer.name}` : "Nuevo cliente"}
            </SheetTitle>
            <SheetDescription>
              Podés crearle usuario y contraseña para que entre a la app.
            </SheetDescription>
          </SheetHeader>
          {formTarget && (
            <CustomerForm
              key={formTarget.key}
              customer={formTarget.customer}
              onDone={() => setFormTarget(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar a ${deleting?.name ?? "este cliente"}?`}
        description="Se borran sus datos, sus sellos y su acceso a la app. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (!deleting) return;
          deleteCustomer(deleting.id);
          toast.success(`Eliminaste a ${deleting.name}`);
        }}
      />

      <RedeemDialog customer={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} />
    </div>
  );
}
