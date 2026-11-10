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
};

export type CustomerInput = Pick<Customer, "name" | "phone" | "email" | "birthday" | "notes">;

export type CustomerSegment = "todos" | "cumpleanos" | "inactivos" | "canje" | "nuevos";

export type SegmentOptions = {
  now: Date;
  /** Días sin pedir para considerar a un cliente inactivo. */
  inactiveDays: number;
  stampsRequired: number;
};
