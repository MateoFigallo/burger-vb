"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  KeyRound,
  LayoutGrid,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ALL_MODULES, PANEL_MODULES } from "@/config/panel";
import {
  clockInByPin,
  clockInEmployee,
  clockOutAttendance,
  createDailyTask,
  createSalaryAdvance,
  deleteDailyTask,
  deleteEmployee,
  deleteSalaryAdvance,
  resetAllDailyTasks,
  setEmployeeActive,
  toggleDailyTask,
  useTeam,
  type Employee,
  type TaskFrequency,
} from "@/features/team";
import { formatCurrency, formatDate } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { PageHeader } from "../shared/page-header";
import { SectionTabs } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";
import { EmployeeForm } from "./employee-form";
import { RolesPanel } from "./roles-panel";

type View = "employees" | "roles" | "rrhh" | "tareas";
type FormTarget = { employee: Employee | null; key: number };

export function TeamManager() {
  const isHydrated = useIsClient();
  const team = useTeam();
  const { roles, employees, attendance, advances, tasks } = team;
  const [view, setView] = useState<View>("employees");
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  // Estado RRHH (Fichaje y Adelantos)
  const [pinInput, setPinInput] = useState("");
  const [pinNote, setPinNote] = useState("");
  const [advEmployeeId, setAdvEmployeeId] = useState("");
  const [advAmount, setAdvAmount] = useState("");
  const [advType, setAdvType] = useState<"adelanto" | "liquidacion" | "bono">("adelanto");
  const [advReason, setAdvReason] = useState("");

  // Estado Tareas del día
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRole, setTaskRole] = useState("Cocina");
  const [taskFreq, setTaskFreq] = useState<TaskFrequency>("diaria");
  const [roleFilter, setRoleFilter] = useState<string>("all");

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

  const activeCount = employees.filter((employee) => employee.active).length;
  const openShiftsCount = attendance.filter((att) => !att.checkOutAt).length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const roleById = new Map(roles.map((role) => [role.id, role]));

  const stats: Stat[] = [
    {
      label: "Equipo activo",
      value: `${activeCount} / ${employees.length}`,
      hint: `${roles.length} roles configurados`,
      icon: Users,
    },
    {
      label: "En turno ahora",
      value: String(openShiftsCount),
      hint: openShiftsCount > 0 ? "Personal fichado en local" : "Sin turnos abiertos",
      icon: Clock,
    },
    {
      label: "Checklist operativo",
      value: `${completedTasksCount} / ${tasks.length}`,
      hint:
        tasks.length > 0
          ? `${Math.round((completedTasksCount / tasks.length) * 100)}% completado hoy`
          : "Sin tareas",
      icon: ClipboardCheck,
    },
    {
      label: "Módulos del sistema",
      value: String(ALL_MODULES.length),
      hint: "Permisos granulares por puesto",
      icon: LayoutGrid,
    },
  ];

  function openCreate() {
    setFormTarget({ employee: null, key: Date.now() });
  }

  function openEdit(employee: Employee) {
    setFormTarget({ employee, key: Date.now() });
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    deleteEmployee(deleting.id);
    toast.success(`Eliminaste a ${deleting.name}`);
    setDeleting(null);
  }

  function handlePinSubmit(e: FormEvent) {
    e.preventDefault();
    const res = clockInByPin(pinInput, pinNote);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.value.checkOutAt) {
      toast.success(
        `Salida fichada: ${res.value.employeeName} (${res.value.hoursWorked ?? 0} hs trabajadas)`,
      );
    } else {
      toast.success(`Entrada fichada: ${res.value.employeeName}`);
    }
    setPinInput("");
    setPinNote("");
  }

  function handleQuickClockIn(empId: string) {
    const res = clockInEmployee(empId, "Fichaje directo desde panel");
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Entrada registrada para ${res.value.employeeName}`);
  }

  function handleQuickClockOut(attendanceId: string) {
    const res = clockOutAttendance(attendanceId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      `Salida registrada para ${res.value.employeeName} (${res.value.hoursWorked ?? 0} hs)`,
    );
  }

  function handleCreateAdvance(e: FormEvent) {
    e.preventDefault();
    const targetEmpId = advEmployeeId || employees[0]?.id || "";
    const res = createSalaryAdvance({
      employeeId: targetEmpId,
      amount: Number(advAmount),
      type: advType,
      reason: advReason,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Movimiento de RRHH registrado para ${res.value.employeeName}`);
    setAdvAmount("");
    setAdvReason("");
  }

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const res = createDailyTask({
      title: taskTitle,
      roleName: taskRole,
      frequency: taskFreq,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Tarea agregada al checklist operativo");
    setTaskTitle("");
  }

  const filteredTasks =
    roleFilter === "all" ? tasks : tasks.filter((t) => t.roleName === roleFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo, fichaje y tareas"
        description="Administrá cuentas y permisos por módulo, reloj de asistencia por PIN, adelantos de sueldo y el checklist diario de cocina y salón."
        actions={
          <Button className="h-11 rounded-xl px-4 font-semibold" onClick={openCreate}>
            <UserPlus aria-hidden="true" className="size-4" />
            Nuevo empleado
          </Button>
        }
      />

      <StatCards stats={stats} />

      <SectionTabs<View>
        id="team"
        label="Secciones de equipo y RRHH"
        value={view}
        onChange={setView}
        tabs={[
          {
            value: "employees",
            label: "Empleados y cuentas",
            icon: Users,
            count: employees.length,
          },
          { value: "roles", label: "Roles y permisos", icon: ShieldCheck, count: roles.length },
          {
            value: "rrhh",
            label: "RRHH, fichaje y adelantos",
            icon: Clock,
            count: openShiftsCount,
          },
          {
            value: "tareas",
            label: "Tareas operativas del día",
            icon: ClipboardCheck,
            count: tasks.length - completedTasksCount,
          },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        {view === "roles" && (
          <motion.div
            key="roles"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <RolesPanel team={team} />
          </motion.div>
        )}

        {view === "employees" && (
          <motion.div
            key="employees"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {employees.length === 0 ? (
              <div className="bg-background rounded-2xl border p-10 text-center">
                <Users aria-hidden="true" className="text-muted-foreground mx-auto size-10" />
                <p className="mt-3 font-semibold">Todavía no agregaste empleados</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
                  Creá una cuenta para cada persona del equipo, elegí su rol, PIN de fichaje y qué
                  partes del panel puede usar.
                </p>
                <Button className="mt-5 h-11 rounded-xl px-5 font-semibold" onClick={openCreate}>
                  <UserPlus aria-hidden="true" className="size-4" />
                  Crear el primer empleado
                </Button>
              </div>
            ) : (
              <div className="bg-background overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5">Empleado</TableHead>
                      <TableHead>Rol y turno</TableHead>
                      <TableHead className="hidden md:table-cell">PIN / Valor hora</TableHead>
                      <TableHead className="hidden lg:table-cell">Permisos</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="pr-5 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const role = roleById.get(employee.roleId);
                      const shiftLabel =
                        businessConfig.teamOps.shifts.find((s) => s.id === employee.shiftId)
                          ?.label ?? "Turno Noche";
                      return (
                        <TableRow key={employee.id} className="group">
                          <TableCell className="pl-5">
                            <p className="font-semibold">{employee.name}</p>
                            <p className="text-muted-foreground text-xs">
                              @{employee.username}
                              {employee.phone && ` · ${employee.phone}`}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full">
                              {role?.name ?? "Sin rol"}
                            </Badge>
                            <p className="text-muted-foreground mt-1 text-xs">{shiftLabel}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                PIN {employee.pinCode ?? "0000"}
                              </Badge>
                              <span className="text-muted-foreground text-xs font-medium">
                                {formatCurrency(employee.hourlyRate ?? 4500)}/h
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {employee.modules.slice(0, 4).map((module) => (
                                <Badge key={module} variant="outline" className="rounded-full">
                                  {PANEL_MODULES[module]?.shortLabel ??
                                    PANEL_MODULES[module]?.label ??
                                    module}
                                </Badge>
                              ))}
                              {employee.modules.length > 4 && (
                                <Badge variant="secondary" className="rounded-full text-xs">
                                  +{employee.modules.length - 4} más
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={employee.active}
                              onCheckedChange={(checked) => setEmployeeActive(employee.id, checked)}
                              aria-label={`Activar cuenta de ${employee.name}`}
                            />
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar a ${employee.name}`}
                                onClick={() => openEdit(employee)}
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Eliminar a ${employee.name}`}
                                onClick={() => setDeleting(employee)}
                              >
                                <Trash aria-hidden="true" className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        )}

        {view === "rrhh" && (
          <motion.div
            key="rrhh"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Reloj de Fichaje por PIN */}
              <div className="bg-background min-w-0 space-y-4 rounded-2xl border p-5 lg:col-span-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-primary text-xs font-bold tracking-wider uppercase">
                      Reloj de asistencia
                    </span>
                    <h3 className="text-lg font-bold">Fichaje rápido por PIN</h3>
                    <p className="text-muted-foreground text-xs">
                      Ingresá el PIN del empleado (ej. 1024, 2048, 3090) para fichar entrada o
                      salida automáticamente.
                    </p>
                  </div>
                  <KeyRound className="text-primary size-6 shrink-0" />
                </div>

                <form onSubmit={handlePinSubmit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="rrhh-pin">PIN (4 dígitos)</Label>
                      <Input
                        id="rrhh-pin"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="Ej: 1024"
                        className="h-11 font-mono text-base font-bold tracking-widest"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rrhh-pin-note">Nota del turno (opcional)</Label>
                      <Input
                        id="rrhh-pin-note"
                        value={pinNote}
                        onChange={(e) => setPinNote(e.target.value)}
                        placeholder="Ej: Plancha 1 / Apertura"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="h-11 w-full rounded-xl font-bold">
                    <Clock className="size-4" />
                    Fichar entrada / salida con PIN
                  </Button>
                </form>

                <div className="space-y-2 border-t pt-3">
                  <p className="text-muted-foreground text-xs font-semibold uppercase">
                    Fichaje manual por empleado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((emp) => {
                      const openAtt = attendance.find(
                        (a) => a.employeeId === emp.id && !a.checkOutAt,
                      );
                      return (
                        <Button
                          key={emp.id}
                          type="button"
                          size="sm"
                          variant={openAtt ? "default" : "outline"}
                          className="rounded-xl text-xs"
                          onClick={() =>
                            openAtt
                              ? handleQuickClockOut(openAtt.id)
                              : handleQuickClockIn(emp.id)
                          }
                        >
                          {openAtt ? (
                            <LogOut className="size-3.5" />
                          ) : (
                            <LogIn className="size-3.5" />
                          )}
                          {emp.name.split(" ")[0]} ({emp.pinCode ?? "0000"})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Registro de Adelantos, Vales y Liquidaciones */}
              <div className="bg-background min-w-0 space-y-4 rounded-2xl border p-5 lg:col-span-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-primary text-xs font-bold tracking-wider uppercase">
                      Vales, premios y liquidación
                    </span>
                    <h3 className="text-lg font-bold">Adelantos de sueldo y bonos</h3>
                    <p className="text-muted-foreground text-xs">
                      Registrá vales de caja para el personal, premios por productividad o pagos de
                      quincena/turno.
                    </p>
                  </div>
                  <DollarSign className="text-primary size-6 shrink-0" />
                </div>

                <form onSubmit={handleCreateAdvance} className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label htmlFor="adv-emp">Empleado</Label>
                    <select
                      id="adv-emp"
                      value={advEmployeeId || employees[0]?.id || ""}
                      onChange={(e) => setAdvEmployeeId(e.target.value)}
                      className="border-input bg-background flex h-10 w-full rounded-md border px-3 text-sm"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="adv-type">Tipo</Label>
                    <select
                      id="adv-type"
                      value={advType}
                      onChange={(e) =>
                        setAdvType(e.target.value as "adelanto" | "liquidacion" | "bono")
                      }
                      className="border-input bg-background flex h-10 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="adelanto">Adelanto / Vale</option>
                      <option value="bono">Bono / Premio</option>
                      <option value="liquidacion">Liquidación turno</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="adv-amount">Monto ($)</Label>
                    <Input
                      id="adv-amount"
                      type="number"
                      min={1}
                      placeholder="15000"
                      value={advAmount}
                      onChange={(e) => setAdvAmount(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="adv-reason">Detalle</Label>
                    <Input
                      id="adv-reason"
                      placeholder="Vale efectivo"
                      value={advReason}
                      onChange={(e) => setAdvReason(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <Button type="submit" variant="secondary" className="h-10 rounded-xl font-bold">
                      <Plus className="size-4" />
                      Registrar movimiento de sueldo
                    </Button>
                  </div>
                </form>

                {advances.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {advances.map((adv) => (
                          <TableRow key={adv.id}>
                            <TableCell className="font-medium">
                              {adv.employeeName}
                              <span className="text-muted-foreground block text-[11px]">
                                {formatDate(adv.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={adv.type === "bono" ? "default" : "outline"}
                                className="mr-1.5 rounded-full text-[10px] uppercase"
                              >
                                {adv.type}
                              </Badge>
                              <span className="text-xs">{adv.reason}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(adv.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar registro"
                                onClick={() => {
                                  deleteSalaryAdvance(adv.id);
                                  toast.success("Registro eliminado");
                                }}
                              >
                                <Trash className="text-destructive size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Asistencia y Horas Trabajadas */}
            <div className="bg-background overflow-hidden rounded-2xl border">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h3 className="font-bold">Planilla de asistencia y cálculo de turnos</h3>
                  <p className="text-muted-foreground text-xs">
                    Cálculo automático de horas trabajadas y liquidación estimada según el valor
                    hora de cada puesto.
                  </p>
                </div>
              </div>
              {attendance.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Todavía no hay fichajes registrados en este turno.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Empleado</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida / Estado</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Liquidación est.</TableHead>
                      <TableHead className="pr-5 text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((att) => {
                      const emp = employees.find((e) => e.id === att.employeeId);
                      const rate = emp?.hourlyRate ?? 4500;
                      const estimatedPay = att.hoursWorked ? Math.round(att.hoursWorked * rate) : 0;
                      return (
                        <TableRow key={att.id}>
                          <TableCell className="pl-5">
                            <p className="font-semibold">{att.employeeName}</p>
                            <p className="text-muted-foreground text-xs">
                              {att.roleName}
                              {att.note ? ` · ${att.note}` : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(att.checkInAt)}</TableCell>
                          <TableCell>
                            {att.checkOutAt ? (
                              <span className="text-muted-foreground text-xs">
                                {formatDate(att.checkOutAt)}
                              </span>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                En turno activo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {att.hoursWorked ? `${att.hoursWorked} hs` : "En curso"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {estimatedPay > 0 ? formatCurrency(estimatedPay) : "—"}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            {!att.checkOutAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-xs"
                                onClick={() => handleQuickClockOut(att.id)}
                              >
                                <LogOut className="size-3.5" />
                                Cerrar turno
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}

        {view === "tareas" && (
          <motion.div
            key="tareas"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="bg-background space-y-4 rounded-2xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Checklist operativo de cocina y local</h3>
                  <p className="text-muted-foreground text-xs">
                    Estandarizá la apertura, el control de bromatología/frío y el cierre de
                    planchas y freidoras.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    resetAllDailyTasks();
                    toast.success("Checklist reiniciado para el nuevo turno");
                  }}
                >
                  <RotateCcw className="size-4" />
                  Reiniciar turno
                </Button>
              </div>

              <form onSubmit={handleAddTask} className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6">
                  <Label htmlFor="task-title" className="sr-only">
                    Nueva tarea operativa
                  </Label>
                  <Input
                    id="task-title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ej: Limpieza de campana extractora y desengrasado de filtros..."
                    className="h-11"
                  />
                </div>
                <div className="sm:col-span-2">
                  <select
                    aria-label="Rol responsable"
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value)}
                    className="border-input bg-background flex h-11 w-full rounded-md border px-3 text-sm"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <select
                    aria-label="Frecuencia de la tarea"
                    value={taskFreq}
                    onChange={(e) => setTaskFreq(e.target.value as TaskFrequency)}
                    className="border-input bg-background flex h-11 w-full rounded-md border px-3 text-sm"
                  >
                    {Object.entries(businessConfig.teamOps.taskFrequencies).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="h-11 w-full rounded-xl font-semibold">
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                {["all", ...roles.map((r) => r.name)].map((rName) => (
                  <Button
                    key={rName}
                    type="button"
                    size="sm"
                    variant={roleFilter === rName ? "default" : "outline"}
                    className="rounded-full text-xs"
                    onClick={() => setRoleFilter(rName)}
                  >
                    {rName === "all" ? "Todos los puestos" : rName}
                  </Button>
                ))}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="bg-background rounded-2xl border p-10 text-center">
                <ClipboardCheck className="text-muted-foreground mx-auto size-10" />
                <p className="mt-3 font-semibold">No hay tareas para este filtro</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Agregá una tarea arriba o cambiá el puesto seleccionado.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-background flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors"
                  >
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => {
                          toggleDailyTask(task.id, employees[0]?.name ?? "Encargado");
                          toast.success(
                            task.completed
                              ? "Tarea marcada como pendiente"
                              : "¡Tarea operativa completada!",
                          );
                        }}
                        className="accent-primary mt-1 size-5 rounded"
                      />
                      <div className="space-y-1">
                        <p
                          className={
                            task.completed
                              ? "text-muted-foreground font-semibold line-through"
                              : "font-semibold"
                          }
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full text-[11px]">
                            {task.roleName}
                          </Badge>
                          <Badge variant="outline" className="rounded-full text-[11px]">
                            {businessConfig.teamOps.taskFrequencies[task.frequency]}
                          </Badge>
                          {task.completed && task.completedBy && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" />
                              Hecho por {task.completedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar tarea ${task.title}`}
                      onClick={() => {
                        deleteDailyTask(task.id);
                        toast.success("Tarea eliminada");
                      }}
                    >
                      <Trash className="text-destructive size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-background flex items-start gap-3 rounded-2xl border p-4">
        <BadgeCheck aria-hidden="true" className="text-primary mt-0.5 size-5 shrink-0" />
        <p className="text-muted-foreground text-sm">
          Los empleados ingresan desde el botón <strong className="text-foreground">Ingresar</strong>{" "}
          de la tienda usando su usuario y contraseña, o fichan su asistencia rápida en el mostrador
          con su <strong className="text-foreground">PIN de 4 dígitos</strong>.
        </p>
      </div>

      <Sheet
        open={Boolean(formTarget)}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>
              {formTarget?.employee ? `Editar a ${formTarget.employee.name}` : "Nuevo empleado"}
            </SheetTitle>
            <SheetDescription>
              Elegí su rol, PIN de asistencia, valor hora y los módulos que puede usar.
            </SheetDescription>
          </SheetHeader>
          {formTarget && (
            <EmployeeForm
              key={formTarget.key}
              employee={formTarget.employee}
              roles={roles}
              onDone={() => setFormTarget(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? `¿Eliminar a ${deleting.name}?` : ""}
        description="Ya no va a poder entrar al panel con su usuario."
        confirmLabel="Sí, eliminar"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
