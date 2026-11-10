import type { ModuleId } from "@/config/panel";

/** Puesto de trabajo, con los módulos que se le dan por defecto. */
export type Role = {
  id: string;
  name: string;
  modules: ModuleId[];
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  roleId: string;
  /** Módulos que puede usar. Se precargan con los del rol y se pueden ajustar. */
  modules: ModuleId[];
  active: boolean;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export type EmployeeInput = Pick<Employee, "name" | "phone" | "roleId" | "modules" | "active"> & {
  username: string;
};

export type Team = {
  roles: Role[];
  employees: Employee[];
};
