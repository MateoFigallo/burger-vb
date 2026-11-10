"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteRole, createRole, updateRole, type Team } from "@/features/team";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { ModulePicker } from "./module-picker";

type RolesPanelProps = {
  team: Team;
};

export function RolesPanel({ team }: RolesPanelProps) {
  const [newRole, setNewRole] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = team.roles.find((role) => role.id === deletingId) ?? null;

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createRole(newRole, ["pedidos"]);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNewRole("");
    toast.success(`Creaste el rol ${result.value.name}`);
  }

  function handleRename(roleId: string, name: string, previous: string) {
    if (name.trim() === previous) return;
    const result = updateRole(roleId, { name });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Los roles agrupan a los empleados según lo que hacen. Los módulos del rol se marcan solos al
        crear un empleado.
      </p>

      <ul className="grid gap-4 xl:grid-cols-2">
        {team.roles.map((role) => {
          const count = team.employees.filter((employee) => employee.roleId === role.id).length;
          return (
            <li key={role.id} className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={role.name}
                  key={role.name}
                  aria-label={`Nombre del rol ${role.name}`}
                  className="h-11 font-semibold"
                  maxLength={32}
                  onBlur={(event) => handleRename(role.id, event.currentTarget.value, role.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span className="text-muted-foreground shrink-0 text-xs">
                  {count === 1 ? "1 empleado" : `${count} empleados`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-destructive size-11 shrink-0"
                  aria-label={`Eliminar rol ${role.name}`}
                  onClick={() =>
                    count > 0
                      ? toast.error("El rol tiene empleados. Cambiales el rol primero.")
                      : setDeletingId(role.id)
                  }
                >
                  <Trash className="size-4" />
                </Button>
              </div>
              <ModulePicker
                legend="Módulos del rol"
                compact
                value={role.modules}
                onChange={(modules) => updateRole(role.id, { modules })}
              />
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={handleCreate}
        className="bg-card flex max-w-xl gap-2 rounded-2xl border p-4 shadow-sm"
      >
        <Input
          value={newRole}
          onChange={(event) => setNewRole(event.target.value)}
          placeholder="Nuevo rol, por ejemplo: Ayudante de cocina"
          aria-label="Nombre del nuevo rol"
          className="h-11"
          maxLength={32}
        />
        <Button type="submit" className="h-11 shrink-0 rounded-xl" disabled={!newRole.trim()}>
          <Plus aria-hidden="true" className="size-4" />
          Agregar rol
        </Button>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={`¿Eliminar el rol ${deleting?.name ?? ""}?`}
        description="El rol se borra. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleting && deleteRole(deleting.id))
            toast.success(`Eliminaste el rol ${deleting.name}`);
        }}
      />
    </div>
  );
}
