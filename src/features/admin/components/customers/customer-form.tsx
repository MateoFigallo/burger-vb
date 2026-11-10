"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUsernameAvailability } from "@/features/auth";
import {
  createCustomer,
  setCustomerAccount,
  setCustomerStamps,
  updateCustomerProfile,
  type Customer,
  type CustomerInput,
} from "@/features/customers";
import { normalizePhone } from "@/lib/ids";
import {
  AccountFields,
  validateAccount,
  type AccountDraft,
  type AccountErrors,
} from "../shared/account-fields";

type ProfileErrors = Partial<Record<"name" | "phone", string>>;

type CustomerFormProps = {
  customer: Customer | null;
  onDone: () => void;
};

export function CustomerForm({ customer, onDone }: CustomerFormProps) {
  const isAvailable = useUsernameAvailability();
  const [profile, setProfile] = useState<CustomerInput>({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    birthday: customer?.birthday ?? "",
    notes: customer?.notes ?? "",
  });
  const [stamps, setStamps] = useState(customer?.stamps ?? 0);
  const [hasAccount, setHasAccount] = useState(Boolean(customer?.account));
  const [account, setAccount] = useState<AccountDraft>({
    username: customer?.account?.username ?? "",
    password: "",
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [saving, setSaving] = useState(false);

  const passwordOptional = Boolean(customer?.account);

  function updateProfile<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setProfile((previous) => ({ ...previous, [key]: value }));
    if (key in errors) setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProfileErrors = {};
    if (profile.name.trim().length < 2) nextErrors.name = "Ingresá el nombre del cliente.";
    if (normalizePhone(profile.phone).length < 8) {
      nextErrors.phone = "Ingresá el WhatsApp con código de área.";
    }
    const nextAccountErrors = hasAccount
      ? validateAccount(account, {
          isAvailable: (username) =>
            isAvailable(username, customer ? { kind: "customer", id: customer.id } : undefined),
          passwordOptional,
        })
      : {};

    setErrors(nextErrors);
    setAccountErrors(nextAccountErrors);
    const firstInvalid = [
      ...Object.keys(nextErrors).map((key) => `customer-${key}`),
      ...Object.keys(nextAccountErrors).map((key) => `customer-account-${key}`),
    ][0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSaving(true);
    const accountInput = hasAccount ? account : null;

    if (customer) {
      updateCustomerProfile(customer.id, profile);
      if (stamps !== customer.stamps) setCustomerStamps(customer.id, stamps);
      await setCustomerAccount(customer.id, accountInput);
      toast.success(`Guardaste los datos de ${profile.name.trim()}`);
    } else {
      const created = await createCustomer(profile, accountInput ?? undefined);
      if (stamps > 0) setCustomerStamps(created.id, stamps);
      toast.success(
        accountInput
          ? `Creaste a ${created.name} con acceso a la app`
          : `Agregaste a ${created.name} a tus clientes`,
      );
    }
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Nombre y apellido</Label>
          <Input
            id="customer-name"
            className="h-11"
            value={profile.name}
            onChange={(event) => updateProfile("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "customer-name-error" : undefined}
          />
          {errors.name && (
            <p id="customer-name-error" className="text-destructive text-sm">
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-phone">WhatsApp</Label>
            <Input
              id="customer-phone"
              type="tel"
              inputMode="tel"
              placeholder="5491155550101"
              className="h-11"
              value={profile.phone}
              onChange={(event) => updateProfile("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "customer-phone-error" : undefined}
            />
            {errors.phone && (
              <p id="customer-phone-error" className="text-destructive text-sm">
                {errors.phone}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email (opcional)</Label>
            <Input
              id="customer-email"
              type="email"
              className="h-11"
              value={profile.email}
              onChange={(event) => updateProfile("email", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-birthday">Cumpleaños (opcional)</Label>
            <Input
              id="customer-birthday"
              type="date"
              className="h-11"
              value={profile.birthday}
              onChange={(event) => updateProfile("birthday", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <span id="customer-stamps-label" className="text-sm font-medium">
              Sellos en la tarjeta
            </span>
            <div
              role="group"
              aria-labelledby="customer-stamps-label"
              className="flex h-11 items-center justify-between rounded-lg border"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Quitar un sello"
                disabled={stamps <= 0}
                onClick={() => setStamps((value) => Math.max(0, value - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="font-heading text-lg font-bold tabular-nums" aria-live="polite">
                {stamps}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Sumar un sello"
                onClick={() => setStamps((value) => value + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-notes">Notas (opcional)</Label>
          <Textarea
            id="customer-notes"
            rows={2}
            placeholder="Preferencias, alergias, dirección habitual…"
            value={profile.notes}
            onChange={(event) => updateProfile("notes", event.target.value)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Acceso a la app</span>
              <span className="text-muted-foreground block text-xs">
                Con usuario y contraseña ve sus sellos, premios y pedidos.
              </span>
            </span>
            <Switch
              checked={hasAccount}
              onCheckedChange={setHasAccount}
              aria-label="Acceso a la app"
            />
          </label>
          {hasAccount && (
            <AccountFields
              idPrefix="customer-account"
              draft={account}
              errors={accountErrors}
              passwordOptional={passwordOptional}
              onChange={(draft) => {
                setAccount(draft);
                setAccountErrors({});
              }}
            />
          )}
        </div>
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl font-semibold">
          {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
