"use client";

import { useMemo } from "react";
import { ALL_MODULES, type ModuleId } from "@/config/panel";
import { useCustomers, type Customer } from "@/features/customers";
import { useTeam } from "@/features/team";
import { normalizeUsername } from "@/lib/ids";
import { useIsClient, useLocalStore } from "@/lib/use-local-store";
import { isReservedUsername, sessionStore } from "../services/auth-service";

export type Viewer =
  | { kind: "admin"; name: string; roleName: string; modules: ModuleId[] }
  | { kind: "employee"; id: string; name: string; roleName: string; modules: ModuleId[] }
  | { kind: "customer"; id: string; name: string; customer: Customer };

type SessionState = {
  /** `false` hasta que se lee la sesión en el navegador. */
  isReady: boolean;
  viewer: Viewer | null;
};

/** Quién está usando la app. Si su cuenta se borró o se desactivó, queda sin sesión. */
export function useSession(): SessionState {
  const session = useLocalStore(sessionStore);
  const team = useTeam();
  const customers = useCustomers();
  const isReady = useIsClient();

  const viewer = useMemo<Viewer | null>(() => {
    if (!session) return null;

    if (session.kind === "admin") {
      return {
        kind: "admin",
        name: "Administrador",
        roleName: "Administrador",
        modules: ALL_MODULES,
      };
    }

    if (session.kind === "employee") {
      const employee = team.employees.find((item) => item.id === session.employeeId);
      if (!employee || !employee.active) return null;
      const role = team.roles.find((item) => item.id === employee.roleId);
      return {
        kind: "employee",
        id: employee.id,
        name: employee.name,
        roleName: role?.name ?? "Empleado",
        modules: employee.modules,
      };
    }

    const customer = customers.find((item) => item.id === session.customerId);
    if (!customer?.account) return null;
    return { kind: "customer", id: customer.id, name: customer.name, customer };
  }, [session, team, customers]);

  return { isReady, viewer };
}

export function canUseModule(viewer: Viewer | null, module: ModuleId): boolean {
  return viewer !== null && viewer.kind !== "customer" && viewer.modules.includes(module);
}

type UsernameOwner = { kind: "employee" | "customer"; id: string };

/** Revisa que nadie más use ese usuario (admin, empleados y clientes). */
export function useUsernameAvailability() {
  const team = useTeam();
  const customers = useCustomers();

  return (username: string, owner?: UsernameOwner): boolean => {
    const normalized = normalizeUsername(username);
    if (!normalized || isReservedUsername(normalized)) return false;
    const takenByEmployee = team.employees.some(
      (employee) =>
        employee.username === normalized &&
        !(owner?.kind === "employee" && owner.id === employee.id),
    );
    const takenByCustomer = customers.some(
      (customer) =>
        customer.account?.username === normalized &&
        !(owner?.kind === "customer" && owner.id === customer.id),
    );
    return !takenByEmployee && !takenByCustomer;
  };
}
