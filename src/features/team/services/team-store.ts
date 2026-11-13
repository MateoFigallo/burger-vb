import { businessConfig } from "@/config/business.config";
import type { ModuleId } from "@/config/panel";
import { createId, normalizeUsername } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import { hashPassword } from "@/lib/password";
import type {
  AttendanceRecord,
  DailyTask,
  Employee,
  EmployeeInput,
  Role,
  SalaryAdvance,
  TaskFrequency,
  Team,
} from "../types";

export const DEFAULT_TEAM: Team = {
  roles: [
    {
      id: "encargado",
      name: "Encargado",
      modules: [
        "vender",
        "resumen",
        "pedidos",
        "caja",
        "productos",
        "web",
        "inventario",
        "mermas",
        "presupuestos",
        "proveedores",
        "clientes",
        "sellos",
        "monedero",
        "campanas",
        "equipo",
        "sistema",
        "importar",
      ],
    },
    {
      id: "cajero",
      name: "Cajero",
      modules: ["vender", "pedidos", "caja", "presupuestos", "clientes", "sellos", "monedero"],
    },
    { id: "cocina", name: "Cocina", modules: ["pedidos", "inventario", "mermas"] },
    { id: "delivery", name: "Delivery", modules: ["pedidos"] },
    {
      id: "marketing",
      name: "Marketing",
      modules: ["resumen", "clientes", "sellos", "monedero", "campanas", "web"],
    },
  ],
  employees: [
    {
      id: "emp-planchero-1",
      name: "Agustín Pereyra",
      phone: "5493875112233",
      roleId: "cocina",
      modules: ["pedidos", "inventario", "mermas"],
      active: true,
      username: "agustin.cocina",
      passwordHash: "demo-hash-1024",
      pinCode: "1024",
      shiftId: "noche",
      hourlyRate: 4800,
      createdAt: "2026-09-10T18:00:00.000Z",
    },
    {
      id: "emp-cajera-2",
      name: "Valentina Gómez",
      phone: "5493875445566",
      roleId: "cajero",
      modules: ["vender", "pedidos", "caja", "presupuestos", "clientes", "sellos", "monedero"],
      active: true,
      username: "vale.caja",
      passwordHash: "demo-hash-2048",
      pinCode: "2048",
      shiftId: "noche",
      hourlyRate: 4500,
      createdAt: "2026-09-15T18:00:00.000Z",
    },
    {
      id: "emp-encargado-3",
      name: "Tomás Sosa",
      phone: "5493875778899",
      roleId: "encargado",
      modules: [
        "vender",
        "resumen",
        "pedidos",
        "caja",
        "productos",
        "web",
        "inventario",
        "mermas",
        "presupuestos",
        "proveedores",
        "clientes",
        "sellos",
        "monedero",
        "campanas",
        "equipo",
      ],
      active: true,
      username: "tomas.salon",
      passwordHash: "demo-hash-3090",
      pinCode: "3090",
      shiftId: "mediodia",
      hourlyRate: 5600,
      createdAt: "2026-08-20T12:00:00.000Z",
    },
  ],
  attendance: [
    {
      id: "att-demo-1",
      employeeId: "emp-planchero-1",
      employeeName: "Agustín Pereyra",
      roleName: "Cocina",
      shiftId: "noche",
      checkInAt: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
      note: "Ingreso puntual · Plancha principal",
    },
    {
      id: "att-demo-2",
      employeeId: "emp-cajera-2",
      employeeName: "Valentina Gómez",
      roleName: "Cajero",
      shiftId: "noche",
      checkInAt: new Date(Date.now() - 4.2 * 3600 * 1000).toISOString(),
      note: "Apertura Caja 1 Mostrador",
    },
    {
      id: "att-demo-3",
      employeeId: "emp-encargado-3",
      employeeName: "Tomás Sosa",
      roleName: "Encargado",
      shiftId: "mediodia",
      checkInAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      checkOutAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
      hoursWorked: 6,
      note: "Turno completo mediodía + recepción de proveedores",
    },
  ],
  advances: [
    {
      id: "adv-demo-1",
      employeeId: "emp-planchero-1",
      employeeName: "Agustín Pereyra",
      amount: 15000,
      type: "adelanto",
      reason: "Vale de efectivo autorizado por encargado",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
    {
      id: "adv-demo-2",
      employeeId: "emp-cajera-2",
      employeeName: "Valentina Gómez",
      amount: 10000,
      type: "bono",
      reason: "Premio por arqueo perfecto de semana",
      createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    },
  ],
  tasks: businessConfig.teamOps.defaultTasks.map((item, index) => ({
    id: `tsk-default-${index + 1}`,
    title: item.title,
    roleName: item.roleName,
    frequency: item.frequency,
    completed: index < 2,
    completedBy: index < 2 ? "Agustín Pereyra" : undefined,
    completedAt: index < 2 ? new Date(Date.now() - 3 * 3600 * 1000).toISOString() : undefined,
    createdAt: "2026-10-01T12:00:00.000Z",
  })),
};

export const teamStore = createLocalStore<Team>("burger-vb:team", DEFAULT_TEAM);

export type TeamResult<T> = { ok: true; value: T } | { ok: false; error: string };

function sameName(a: string, b: string) {
  return a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
}

function getNormalizedSnapshot(team: Team): Required<Team> {
  return {
    roles: team.roles,
    employees:
      team.employees.length === 0 && team.tasks === undefined
        ? DEFAULT_TEAM.employees
        : team.employees,
    attendance: team.attendance ?? DEFAULT_TEAM.attendance ?? [],
    advances: team.advances ?? DEFAULT_TEAM.advances ?? [],
    tasks: team.tasks ?? DEFAULT_TEAM.tasks ?? [],
  };
}

// Roles

export function createRole(name: string, modules: ModuleId[]): TeamResult<Role> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "El nombre del rol es muy corto." };
  const { roles } = teamStore.getSnapshot();
  if (roles.some((role) => sameName(role.name, trimmed))) {
    return { ok: false, error: "Ya existe un rol con ese nombre." };
  }

  const role: Role = { id: createId("rol"), name: trimmed, modules };
  teamStore.set((team) => ({ ...team, roles: [...team.roles, role] }));
  return { ok: true, value: role };
}

export function updateRole(roleId: string, change: Partial<Omit<Role, "id">>): TeamResult<null> {
  const { roles } = teamStore.getSnapshot();
  if (change.name !== undefined) {
    const trimmed = change.name.trim();
    if (trimmed.length < 2) return { ok: false, error: "El nombre del rol es muy corto." };
    if (roles.some((role) => role.id !== roleId && sameName(role.name, trimmed))) {
      return { ok: false, error: "Ya existe un rol con ese nombre." };
    }
    change = { ...change, name: trimmed };
  }

  teamStore.set((team) => ({
    ...team,
    roles: team.roles.map((role) => (role.id === roleId ? { ...role, ...change } : role)),
  }));
  return { ok: true, value: null };
}

/** Solo se puede borrar un rol sin empleados asignados. */
export function deleteRole(roleId: string): boolean {
  const { employees } = getNormalizedSnapshot(teamStore.getSnapshot());
  if (employees.some((employee) => employee.roleId === roleId)) return false;
  teamStore.set((team) => ({ ...team, roles: team.roles.filter((role) => role.id !== roleId) }));
  return true;
}

// Empleados

export async function createEmployee(input: EmployeeInput, password: string): Promise<Employee> {
  const employee: Employee = {
    ...input,
    name: input.name.trim(),
    phone: input.phone.trim(),
    username: normalizeUsername(input.username),
    pinCode: input.pinCode?.trim() || "0000",
    shiftId: input.shiftId ?? "noche",
    hourlyRate: input.hourlyRate ?? 4500,
    id: createId("emp"),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return { ...current, employees: [...current.employees, employee] };
  });
  return employee;
}

/** Actualiza un empleado. Si `password` viene vacío, se mantiene la actual. */
export async function updateEmployee(
  employeeId: string,
  input: Partial<EmployeeInput>,
  password?: string,
) {
  const passwordHash = password ? await hashPassword(password) : undefined;
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              ...input,
              ...(input.username !== undefined && {
                username: normalizeUsername(input.username),
              }),
              ...(passwordHash && { passwordHash }),
            }
          : employee,
      ),
    };
  });
}

export function setEmployeeActive(employeeId: string, active: boolean) {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === employeeId ? { ...employee, active } : employee,
      ),
    };
  });
}

export function deleteEmployee(employeeId: string) {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      employees: current.employees.filter((employee) => employee.id !== employeeId),
    };
  });
}

export function findEmployeeByUsername(username: string): Employee | undefined {
  const normalized = normalizeUsername(username);
  return getNormalizedSnapshot(teamStore.getSnapshot()).employees.find(
    (employee) => employee.username === normalized,
  );
}

export function findEmployee(employeeId: string): Employee | undefined {
  return getNormalizedSnapshot(teamStore.getSnapshot()).employees.find(
    (employee) => employee.id === employeeId,
  );
}

// RRHH: Fichaje y Asistencia

export function clockInEmployee(
  employeeId: string,
  note?: string,
): TeamResult<AttendanceRecord> {
  const snapshot = getNormalizedSnapshot(teamStore.getSnapshot());
  const employee = snapshot.employees.find((e) => e.id === employeeId);
  if (!employee) return { ok: false, error: "Empleado no encontrado." };
  if (!employee.active) return { ok: false, error: "La cuenta del empleado está pausada." };

  const alreadyOpen = snapshot.attendance.find(
    (att) => att.employeeId === employee.id && !att.checkOutAt,
  );
  if (alreadyOpen) {
    return { ok: false, error: `${employee.name} ya tiene un turno en curso sin fichar salida.` };
  }

  const role = snapshot.roles.find((r) => r.id === employee.roleId);
  const record: AttendanceRecord = {
    id: createId("att"),
    employeeId: employee.id,
    employeeName: employee.name,
    roleName: role?.name ?? "Equipo",
    shiftId: employee.shiftId ?? "noche",
    checkInAt: new Date().toISOString(),
    note: note?.trim() || undefined,
  };

  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return { ...current, attendance: [record, ...current.attendance] };
  });

  return { ok: true, value: record };
}

export function clockInByPin(pinCode: string, note?: string): TeamResult<AttendanceRecord> {
  const cleanPin = pinCode.trim();
  if (!cleanPin) return { ok: false, error: "Ingresá un PIN de 4 dígitos." };
  const snapshot = getNormalizedSnapshot(teamStore.getSnapshot());
  const employee = snapshot.employees.find((e) => e.pinCode === cleanPin);
  if (!employee) return { ok: false, error: "PIN inválido. Verificá el código del empleado." };

  const openRecord = snapshot.attendance.find(
    (att) => att.employeeId === employee.id && !att.checkOutAt,
  );
  if (openRecord) {
    return clockOutAttendance(openRecord.id);
  }
  return clockInEmployee(employee.id, note);
}

export function clockOutAttendance(attendanceId: string): TeamResult<AttendanceRecord> {
  const snapshot = getNormalizedSnapshot(teamStore.getSnapshot());
  const target = snapshot.attendance.find((att) => att.id === attendanceId);
  if (!target) return { ok: false, error: "Registro de asistencia no encontrado." };
  if (target.checkOutAt) return { ok: false, error: "Este turno ya tiene salida registrada." };

  const checkOutAt = new Date().toISOString();
  const diffHours = Math.max(
    0.25,
    Math.round(((Date.parse(checkOutAt) - Date.parse(target.checkInAt)) / 3600000) * 10) / 10,
  );

  const updated: AttendanceRecord = {
    ...target,
    checkOutAt,
    hoursWorked: diffHours,
  };

  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      attendance: current.attendance.map((att) => (att.id === attendanceId ? updated : att)),
    };
  });

  return { ok: true, value: updated };
}

// RRHH: Adelantos, Bonos y Liquidaciones

export function createSalaryAdvance(input: {
  employeeId: string;
  amount: number;
  type: "adelanto" | "liquidacion" | "bono";
  reason: string;
}): TeamResult<SalaryAdvance> {
  const snapshot = getNormalizedSnapshot(teamStore.getSnapshot());
  const employee = snapshot.employees.find((e) => e.id === input.employeeId);
  if (!employee) return { ok: false, error: "Seleccioná un empleado válido." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "El monto debe ser mayor a $0." };
  }

  const record: SalaryAdvance = {
    id: createId("adv"),
    employeeId: employee.id,
    employeeName: employee.name,
    amount: Math.round(input.amount),
    type: input.type,
    reason: input.reason.trim() || "Movimiento de RRHH",
    createdAt: new Date().toISOString(),
  };

  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return { ...current, advances: [record, ...current.advances] };
  });

  return { ok: true, value: record };
}

export function deleteSalaryAdvance(advanceId: string) {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      advances: current.advances.filter((adv) => adv.id !== advanceId),
    };
  });
}

// Tareas Operativas del Día

export function createDailyTask(input: {
  title: string;
  roleName: string;
  frequency: TaskFrequency;
}): TeamResult<DailyTask> {
  const trimmed = input.title.trim();
  if (trimmed.length < 3) return { ok: false, error: "Describí la tarea con al menos 3 letras." };

  const task: DailyTask = {
    id: createId("tsk"),
    title: trimmed,
    roleName: input.roleName.trim() || "Cocina",
    frequency: input.frequency,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return { ...current, tasks: [task, ...current.tasks] };
  });

  return { ok: true, value: task };
}

export function toggleDailyTask(taskId: string, completedBy = "Encargado") {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          completedBy: nextCompleted ? completedBy : undefined,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }),
    };
  });
}

export function resetAllDailyTasks() {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      tasks: current.tasks.map((task) => ({
        ...task,
        completed: false,
        completedBy: undefined,
        completedAt: undefined,
      })),
    };
  });
}

export function deleteDailyTask(taskId: string) {
  teamStore.set((team) => {
    const current = getNormalizedSnapshot(team);
    return {
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    };
  });
}
