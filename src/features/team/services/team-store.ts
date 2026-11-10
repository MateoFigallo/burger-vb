import type { ModuleId } from "@/config/panel";
import { createId, normalizeUsername } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import { hashPassword } from "@/lib/password";
import type { Employee, EmployeeInput, Role, Team } from "../types";

const DEFAULT_TEAM: Team = {
  roles: [
    {
      id: "encargado",
      name: "Encargado",
      modules: ["pedidos", "productos", "clientes", "campanas", "sellos"],
    },
    { id: "cajero", name: "Cajero", modules: ["pedidos", "clientes", "sellos"] },
    { id: "cocina", name: "Cocina", modules: ["pedidos"] },
    { id: "delivery", name: "Delivery", modules: ["pedidos"] },
    { id: "marketing", name: "Marketing", modules: ["clientes", "campanas", "sellos"] },
  ],
  employees: [],
};

/**
 * El equipo se guarda en este navegador. Para usarlo desde varios dispositivos,
 * reemplazá este servicio por una API con autenticación en el servidor.
 */
export const teamStore = createLocalStore<Team>("burger-vb:team", DEFAULT_TEAM);

export type TeamResult<T> = { ok: true; value: T } | { ok: false; error: string };

function sameName(a: string, b: string) {
  return a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
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
  const { employees } = teamStore.getSnapshot();
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
    id: createId("emp"),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  teamStore.set((team) => ({ ...team, employees: [...team.employees, employee] }));
  return employee;
}

/** Actualiza un empleado. Si `password` viene vacío, se mantiene la actual. */
export async function updateEmployee(
  employeeId: string,
  input: Partial<EmployeeInput>,
  password?: string,
) {
  const passwordHash = password ? await hashPassword(password) : undefined;
  teamStore.set((team) => ({
    ...team,
    employees: team.employees.map((employee) =>
      employee.id === employeeId
        ? {
            ...employee,
            ...input,
            ...(input.username !== undefined && { username: normalizeUsername(input.username) }),
            ...(passwordHash && { passwordHash }),
          }
        : employee,
    ),
  }));
}

export function setEmployeeActive(employeeId: string, active: boolean) {
  teamStore.set((team) => ({
    ...team,
    employees: team.employees.map((employee) =>
      employee.id === employeeId ? { ...employee, active } : employee,
    ),
  }));
}

export function deleteEmployee(employeeId: string) {
  teamStore.set((team) => ({
    ...team,
    employees: team.employees.filter((employee) => employee.id !== employeeId),
  }));
}

export function findEmployeeByUsername(username: string): Employee | undefined {
  const normalized = normalizeUsername(username);
  return teamStore.getSnapshot().employees.find((employee) => employee.username === normalized);
}

export function findEmployee(employeeId: string): Employee | undefined {
  return teamStore.getSnapshot().employees.find((employee) => employee.id === employeeId);
}
