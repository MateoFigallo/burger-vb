import type { ModuleId } from "@/config/panel";

export type ShiftId = "mediodia" | "noche" | "franquero";
export type TaskFrequency = "diaria" | "semanal" | "apertura" | "cierre";

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
  /** PIN rápido de 4 dígitos para fichaje de entrada/salida en mostrador o cocina. */
  pinCode?: string;
  /** Turno asignado habitualmente. */
  shiftId?: ShiftId;
  /** Valor hora en ARS para cálculo de liquidación de turno. */
  hourlyRate?: number;
};

export type EmployeeInput = Pick<Employee, "name" | "phone" | "roleId" | "modules" | "active"> & {
  username: string;
  pinCode?: string;
  shiftId?: ShiftId;
  hourlyRate?: number;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  roleName: string;
  shiftId: ShiftId;
  checkInAt: string;
  checkOutAt?: string;
  hoursWorked?: number;
  note?: string;
};

export type SalaryAdvance = {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  type: "adelanto" | "liquidacion" | "bono";
  reason: string;
  createdAt: string;
};

export type DailyTask = {
  id: string;
  title: string;
  roleName: string;
  frequency: TaskFrequency;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
};

export type Team = {
  roles: Role[];
  employees: Employee[];
  attendance?: AttendanceRecord[];
  advances?: SalaryAdvance[];
  tasks?: DailyTask[];
};
