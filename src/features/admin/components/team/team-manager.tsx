"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, LayoutGrid, Pencil, ShieldCheck, Trash, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { ALL_MODULES, PANEL_MODULES } from "@/config/panel";
import { deleteEmployee, setEmployeeActive, useTeam, type Employee } from "@/features/team";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { PageHeader } from "../shared/page-header";
import { SectionTabs } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";
import { EmployeeForm } from "./employee-form";
import { RolesPanel } from "./roles-panel";

type View = "employees" | "roles";
type FormTarget = { employee: Employee | null; key: number };

export function TeamManager() {
  const team = useTeam();
  const [view, setView] = useState<View>("employees");
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const roleNames = new Map(team.roles.map((role) => [role.id, role.name]));
  const activeCount = team.employees.filter((employee) => employee.active).length;

  const stats: Stat[] = [
    {
      label: "Empleados",
      value: String(team.employees.length),
      hint: "Con cuenta en el panel",
      icon: Users,
    },
    { label: "Activos", value: String(activeCount), hint: "Pueden entrar hoy", icon: BadgeCheck },
    {
      label: "Roles",
      value: String(team.roles.length),
      hint: "Puestos de trabajo",
      icon: ShieldCheck,
    },
    {
      label: "Módulos",
      value: String(ALL_MODULES.length),
      hint: "Para dar o quitar permisos",
      icon: LayoutGrid,
    },
  ];

  function openForm(employee: Employee | null) {
    setFormTarget((previous) => ({ employee, key: (previous?.key ?? 0) + 1 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description="Creá cuentas para tu equipo y elegí qué puede usar cada uno."
        actions={
          <Button
            className="h-11 rounded-xl font-semibold"
            onClick={() => openForm(null)}
            disabled={team.roles.length === 0}
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Nuevo empleado
          </Button>
        }
      />

      <StatCards stats={stats} />

      <SectionTabs
        id="team"
        label="Vista del equipo"
        value={view}
        onChange={setView}
        tabs={[
          { value: "employees", label: "Empleados", icon: Users, count: team.employees.length },
          { value: "roles", label: "Roles", icon: ShieldCheck, count: team.roles.length },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {view === "roles" ? (
            <RolesPanel team={team} />
          ) : team.employees.length === 0 ? (
            <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
              <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
                <Users aria-hidden="true" className="size-7" />
              </span>
              <p className="text-lg font-bold">Todavía no hay empleados</p>
              <p className="text-muted-foreground max-w-md text-sm">
                Creá una cuenta para cada persona del equipo y elegí a qué módulos puede entrar.
              </p>
              <Button className="mt-2 h-11 rounded-xl" onClick={() => openForm(null)}>
                <UserPlus aria-hidden="true" className="size-4" />
                Crear el primero
              </Button>
            </div>
          ) : (
            <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Empleado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="pr-5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.employees.map((employee) => (
                    <TableRow key={employee.id} className={employee.active ? "" : "opacity-60"}>
                      <TableCell className="pl-5">
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-muted-foreground text-xs">
                          @{employee.username}
                          {employee.phone && ` · ${employee.phone}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="h-6">
                          {roleNames.get(employee.roleId) ?? "Sin rol"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-72 flex-wrap gap-1 whitespace-normal">
                          {employee.modules.map((module) => (
                            <span
                              key={module}
                              className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-medium"
                            >
                              {PANEL_MODULES[module].label}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={employee.active}
                          onCheckedChange={(checked) => {
                            setEmployeeActive(employee.id, checked);
                            toast.success(
                              checked
                                ? `Activaste la cuenta de ${employee.name}`
                                : `Desactivaste la cuenta de ${employee.name}`,
                            );
                          }}
                          aria-label={`Cuenta activa de ${employee.name}`}
                        />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`Editar ${employee.name}`}
                            onClick={() => openForm(employee)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive size-11"
                            aria-label={`Eliminar ${employee.name}`}
                            onClick={() => setDeleting(employee)}
                          >
                            <Trash className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Sheet open={formTarget !== null} onOpenChange={(open) => !open && setFormTarget(null)}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4 pr-14">
            <SheetTitle className="text-lg font-bold">
              {formTarget?.employee ? `Editar ${formTarget.employee.name}` : "Nuevo empleado"}
            </SheetTitle>
            <SheetDescription>Rol, permisos y cuenta para entrar al panel.</SheetDescription>
          </SheetHeader>
          {formTarget && (
            <EmployeeForm
              key={formTarget.key}
              employee={formTarget.employee}
              roles={team.roles}
              onDone={() => setFormTarget(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar a ${deleting?.name ?? "este empleado"}?`}
        description="Se borra su cuenta y ya no va a poder entrar al panel. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (!deleting) return;
          deleteEmployee(deleting.id);
          toast.success(`Eliminaste a ${deleting.name}`);
        }}
      />
    </div>
  );
}
