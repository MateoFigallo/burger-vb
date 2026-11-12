"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { businessConfig } from "@/config/business.config";
import type { ModuleId } from "@/config/panel";
import { useUsernameAvailability } from "@/features/auth";
import {
  createEmployee,
  updateEmployee,
  type Employee,
  type Role,
  type ShiftId,
} from "@/features/team";
import {
  AccountFields,
  validateAccount,
  type AccountDraft,
  type AccountErrors,
} from "../shared/account-fields";
import { ModulePicker } from "./module-picker";

type EmployeeFormProps = {
  employee: Employee | null;
  roles: Role[];
  onDone: () => void;
};

export function EmployeeForm({ employee, roles, onDone }: EmployeeFormProps) {
  const isAvailable = useUsernameAvailability();
  const initialRole = roles.find((role) => role.id === employee?.roleId) ?? roles[0];

  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [roleId, setRoleId] = useState(initialRole?.id ?? "");
  const [modules, setModules] = useState<ModuleId[]>(
    employee?.modules ?? initialRole?.modules ?? [],
  );
  const [active, setActive] = useState(employee?.active ?? true);
  const [pinCode, setPinCode] = useState(employee?.pinCode ?? "1234");
  const [shiftId, setShiftId] = useState<ShiftId>(employee?.shiftId ?? "noche");
  const [hourlyRate, setHourlyRate] = useState(String(employee?.hourlyRate ?? 4500));
  const [account, setAccount] = useState<AccountDraft>({
    username: employee?.username ?? "",
    password: "",
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [saving, setSaving] = useState(false);

  const roleItems = Object.fromEntries(roles.map((role) => [role.id, role.name]));

  function handleRoleChange(nextRoleId: string) {
    setRoleId(nextRoleId);
    const role = roles.find((item) => item.id === nextRoleId);
    if (role) setModules(role.modules);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNameError = name.trim().length < 2 ? "Ingresá el nombre del empleado." : null;
    const nextModulesError = modules.length === 0 ? "Elegí al menos un módulo." : null;
    const nextAccountErrors = validateAccount(account, {
      isAvailable: (username) =>
        isAvailable(username, employee ? { kind: "employee", id: employee.id } : undefined),
      passwordOptional: Boolean(employee),
    });

    setNameError(nextNameError);
    setModulesError(nextModulesError);
    setAccountErrors(nextAccountErrors);
    if (nextNameError) {
      document.getElementById("employee-name")?.focus();
      return;
    }
    if (nextModulesError) return;
    const firstAccountError = Object.keys(nextAccountErrors)[0];
    if (firstAccountError) {
      document.getElementById(`employee-account-${firstAccountError}`)?.focus();
      return;
    }

    setSaving(true);
    const input = {
      name,
      phone,
      roleId,
      modules,
      active,
      username: account.username,
      pinCode: pinCode.trim() || "0000",
      shiftId,
      hourlyRate: Math.max(0, Number(hourlyRate) || 0),
    };
    if (employee) {
      await updateEmployee(employee.id, input, account.password);
      toast.success(`Guardaste los datos de ${name.trim()}`);
    } else {
      await createEmployee(input, account.password);
      toast.success(`Creaste la cuenta de ${name.trim()}`);
    }
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee-name">Nombre</Label>
            <Input
              id="employee-name"
              className="h-11"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "employee-name-error" : undefined}
            />
            {nameError && (
              <p id="employee-name-error" className="text-destructive text-sm">
                {nameError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-phone">Teléfono (opcional)</Label>
            <Input
              id="employee-phone"
              type="tel"
              inputMode="tel"
              className="h-11"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-role">Rol</Label>
          <Select
            items={roleItems}
            value={roleId}
            onValueChange={(value) => typeof value === "string" && handleRoleChange(value)}
          >
            <SelectTrigger id="employee-role" className="h-11! w-full">
              <SelectValue placeholder="Elegí un rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Al elegir el rol se marcan sus módulos. Después podés ajustarlos.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="employee-pin">PIN de fichaje (4 dígitos)</Label>
            <Input
              id="employee-pin"
              maxLength={6}
              inputMode="numeric"
              className="h-10 font-mono"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              placeholder="1024"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employee-shift">Turno habitual</Label>
            <select
              id="employee-shift"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value as ShiftId)}
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 text-sm"
            >
              {businessConfig.teamOps.shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employee-rate">Valor hora ($ ARS)</Label>
            <Input
              id="employee-rate"
              type="number"
              min={0}
              step={100}
              className="h-10"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <ModulePicker
            legend="Módulos que puede usar"
            value={modules}
            onChange={(next) => {
              setModules(next);
              setModulesError(null);
            }}
          />
          {modulesError && <p className="text-destructive text-sm">{modulesError}</p>}
        </div>

        <div className="space-y-4 rounded-2xl border p-4">
          <div>
            <p className="text-sm font-medium">Cuenta para entrar al panel</p>
            <p className="text-muted-foreground text-xs">
              Ingresa desde &quot;Ingresar&quot; en la tienda con este usuario.
            </p>
          </div>
          <AccountFields
            idPrefix="employee-account"
            draft={account}
            errors={accountErrors}
            passwordOptional={Boolean(employee)}
            onChange={(draft) => {
              setAccount(draft);
              setAccountErrors({});
            }}
          />
          <label className="flex cursor-pointer items-center justify-between gap-4 border-t pt-4">
            <span>
              <span className="block text-sm font-medium">Cuenta activa</span>
              <span className="text-muted-foreground block text-xs">
                Si la desactivás, no puede entrar hasta que la vuelvas a activar.
              </span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Cuenta activa" />
          </label>
        </div>
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl font-semibold">
          {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {employee ? "Guardar cambios" : "Crear empleado"}
        </Button>
      </div>
    </form>
  );
}
