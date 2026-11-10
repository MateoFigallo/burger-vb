"use client";

import { useState } from "react";
import { Cake, Moon, UserPlus, Users, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DEFAULT_INACTIVE_DAYS,
  SEGMENTS,
  SEGMENT_LABELS,
  deleteCustomer,
  isCustomerSegment,
  isInactive,
  matchesSegment,
  useCustomers,
  type Customer,
  type CustomerSegment,
} from "@/features/customers";
import { useLoyaltySettings } from "@/features/loyalty";
import { isBirthdayThisMonth, isSameMonth } from "@/lib/dates";
import { normalizePhone } from "@/lib/ids";
import { RedeemDialog } from "../loyalty/redeem-dialog";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { PageHeader } from "../shared/page-header";
import { SearchInput } from "../shared/search-input";
import { StatCards, type Stat } from "../shared/stat-cards";
import { CustomerForm } from "./customer-form";
import { CustomersTable } from "./customers-table";

type FormTarget = { customer: Customer | null; key: number };

export function CustomersManager() {
  const customers = useCustomers();
  const { stampsRequired } = useLoyaltySettings();
  const [now] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("todos");
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [redeeming, setRedeeming] = useState<Customer | null>(null);

  const segmentOptions = { now, inactiveDays: DEFAULT_INACTIVE_DAYS, stampsRequired };
  const withAccount = customers.filter((customer) => customer.account).length;

  const stats: Stat[] = [
    {
      label: "Clientes",
      value: String(customers.length),
      hint: `${withAccount} con acceso a la app`,
      icon: Users,
    },
    {
      label: "Nuevos este mes",
      value: String(customers.filter((customer) => isSameMonth(customer.createdAt, now)).length),
      hint: "Registrados en el mes",
      icon: UserRoundPlus,
    },
    {
      label: "Cumplen este mes",
      value: String(
        customers.filter((customer) => isBirthdayThisMonth(customer.birthday, now)).length,
      ),
      hint: "Ideal para una campaña",
      icon: Cake,
    },
    {
      label: "Inactivos",
      value: String(customers.filter((customer) => isInactive(customer, segmentOptions)).length),
      hint: `Sin pedir hace más de ${DEFAULT_INACTIVE_DAYS} días`,
      icon: Moon,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Tus clientes, sus sellos y su acceso a la app."
        actions={
          <Button className="h-11 rounded-xl font-semibold" onClick={() => openForm(null)}>
            <UserPlus aria-hidden="true" className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <StatCards stats={stats} />

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
