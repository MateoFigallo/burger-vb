export type CustomerAccount = {
  username: string;
  passwordHash: string;
};

export type Customer = {
  id: string;
  name: string;
  /** Teléfono de WhatsApp, como lo cargó el cliente o el local. */
  phone: string;
  email: string;
  /** Fecha de nacimiento "AAAA-MM-DD", o vacío. */
  birthday: string;
  notes: string;
  createdAt: string;
  lastOrderAt: string | null;
  totalOrders: number;
  totalSpent: number;
  /** Sellos acumulados en la tarjeta. */
  stamps: number;
  /** Premios canjeados en total. */
  redeemedCount: number;
  /** Acceso a la app. `null` si el cliente no tiene usuario. */
  account: CustomerAccount | null;
  /** Límite de crédito para Cuenta Corriente / Fiado en ARS. */
  creditLimit?: number;
  /** Condición fiscal frente a ARCA (opcional). */
  ivaCondition?: string;
  /** CUIT / CUIL o DNI para facturación. */
  taxId?: string;
};

export type CustomerInput = Pick<Customer, "name" | "phone" | "email" | "birthday" | "notes"> & {
  creditLimit?: number;
  ivaCondition?: string;
  taxId?: string;
};

export type CustomerCreditMovement = {
  id: string;
  customerId: string;
  customerName: string;
  kind: "cargo_fiado" | "pago_fiado" | "ajuste";
  /** Positivo suma deuda (cargo), negativo descuenta deuda (pago). */
  amount: number;
  method?: string;
  reference: string;
  dueAt?: string;
  createdAt: string;
  user: string;
};

export type CustomerSegment = "todos" | "cumpleanos" | "inactivos" | "canje" | "nuevos" | "con_deuda";

export type SegmentOptions = {
  now: Date;
  /** Días sin pedir para considerar a un cliente inactivo. */
  inactiveDays: number;
  stampsRequired: number;
};
