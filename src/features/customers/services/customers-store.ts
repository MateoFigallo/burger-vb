import { businessConfig } from "@/config/business.config";
import { createId, normalizePhone, normalizeUsername } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import { hashPassword } from "@/lib/password";
import type { Customer, CustomerCreditMovement, CustomerInput } from "../types";
import { SAMPLE_CUSTOMERS } from "./sample-customers";

const INITIAL_CREDIT_MOVEMENTS: CustomerCreditMovement[] = [
  {
    id: "cc-01",
    customerId: "cli-ejemplo-02",
    customerName: "Martín Gómez",
    kind: "cargo_fiado",
    amount: 24500,
    reference: "Venta POS #VB-1042 · 2x Doble Bacon + Papas Cheddar",
    dueAt: "2026-11-22T23:59:59.000Z",
    createdAt: "2026-11-07T21:40:00.000Z",
    user: "Caja Mostrador",
  },
  {
    id: "cc-02",
    customerId: "cli-ejemplo-02",
    customerName: "Martín Gómez",
    kind: "pago_fiado",
    amount: -10000,
    method: "transferencia",
    reference: "Entrega parcial por transferencia",
    createdAt: "2026-11-09T20:15:00.000Z",
    user: "Encargado",
  },
  {
    id: "cc-03",
    customerId: "cli-ejemplo-04",
    customerName: "Diego Pérez",
    kind: "cargo_fiado",
    amount: 18900,
    reference: "Venta POS #VB-1038 · Combo Familiar Smash",
    dueAt: "2026-11-10T23:59:59.000Z",
    createdAt: "2026-10-28T22:40:00.000Z",
    user: "Caja Mostrador",
  },
];

/**
 * Los clientes se guardan en este navegador. Para compartirlos entre dispositivos,
 * reemplazá este servicio por una API o base de datos sin tocar la UI.
 */
export const customersStore = createLocalStore<Customer[]>("burger-vb:customers", SAMPLE_CUSTOMERS);

export const customerCreditStore = createLocalStore<CustomerCreditMovement[]>(
  "burger-vb:customer-credit-v1",
  INITIAL_CREDIT_MOVEMENTS,
);

export type AccountInput = { username: string; password: string };

function cleanInput(input: CustomerInput): CustomerInput {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    birthday: input.birthday,
    notes: input.notes.trim(),
    creditLimit:
      typeof input.creditLimit === "number" && input.creditLimit >= 0
        ? Math.round(input.creditLimit)
        : businessConfig.commercial.defaultCreditLimit,
    ivaCondition: input.ivaCondition?.trim() || "Consumidor Final",
    taxId: input.taxId?.trim() || "",
  };
}

export async function createCustomer(
  input: CustomerInput,
  account?: AccountInput,
): Promise<Customer> {
  const cleaned = cleanInput(input);
  const customer: Customer = {
    ...cleaned,
    id: createId("cli"),
    createdAt: new Date().toISOString(),
    lastOrderAt: null,
    totalOrders: 0,
    totalSpent: 0,
    stamps: 0,
    redeemedCount: 0,
    account: account
      ? {
          username: normalizeUsername(account.username),
          passwordHash: await hashPassword(account.password),
        }
      : null,
  };
  customersStore.set((customers) => [customer, ...customers]);
  return customer;
}

export function updateCustomer(customerId: string, change: Partial<Customer>) {
  customersStore.set((customers) =>
    customers.map((customer) =>
      customer.id === customerId ? { ...customer, ...change } : customer,
    ),
  );
}

export function updateCustomerProfile(customerId: string, input: CustomerInput) {
  updateCustomer(customerId, cleanInput(input));
}

/**
 * Crea, cambia o quita el acceso a la app.
 * Si `password` viene vacío y ya hay cuenta, se mantiene la contraseña actual.
 */
export async function setCustomerAccount(
  customerId: string,
  account: { username: string; password: string } | null,
) {
  const customer = findCustomer(customerId);
  if (!customer) return;

  if (!account) {
    updateCustomer(customerId, { account: null });
    return;
  }

  const passwordHash = account.password
    ? await hashPassword(account.password)
    : customer.account?.passwordHash;
  if (!passwordHash) return;

  updateCustomer(customerId, {
    account: { username: normalizeUsername(account.username), passwordHash },
  });
}

export function deleteCustomer(customerId: string) {
  customersStore.set((customers) => customers.filter((customer) => customer.id !== customerId));
}

export function setCustomerStamps(customerId: string, stamps: number) {
  updateCustomer(customerId, { stamps: Math.max(0, Math.round(stamps)) });
}

/** Descuenta sellos al canjear un premio. Devuelve `false` si no le alcanzan. */
export function redeemStamps(customerId: string, cost: number): boolean {
  const customer = findCustomer(customerId);
  if (!customer || customer.stamps < cost) return false;
  updateCustomer(customerId, {
    stamps: customer.stamps - cost,
    redeemedCount: customer.redeemedCount + 1,
  });
  return true;
}

type DeliveredOrder = {
  customerId: string | null;
  name: string;
  phone: string;
  total: number;
  deliveredAt: string;
};

/**
 * Registra un pedido entregado: suma un sello, el pedido y el gasto.
 * Si el cliente no existe, lo crea a partir del pedido. Devuelve su id.
 */
export function recordDeliveredOrder(order: DeliveredOrder): string {
  const customers = customersStore.getSnapshot();
  const phone = normalizePhone(order.phone);
  const existing =
    customers.find((customer) => customer.id === order.customerId) ??
    (phone ? customers.find((customer) => normalizePhone(customer.phone) === phone) : undefined);

  if (existing) {
    updateCustomer(existing.id, {
      stamps: existing.stamps + 1,
      totalOrders: existing.totalOrders + 1,
      totalSpent: existing.totalSpent + order.total,
      lastOrderAt: order.deliveredAt,
    });
    return existing.id;
  }

  const customer: Customer = {
    id: createId("cli"),
    name: order.name.trim() || "Cliente sin nombre",
    phone: order.phone.trim(),
    email: "",
    birthday: "",
    notes: "",
    createdAt: order.deliveredAt,
    lastOrderAt: order.deliveredAt,
    totalOrders: 1,
    totalSpent: order.total,
    stamps: 1,
    redeemedCount: 0,
    account: null,
    creditLimit: businessConfig.commercial.defaultCreditLimit,
  };
  customersStore.set((list) => [customer, ...list]);
  return customer.id;
}

export function findCustomer(customerId: string): Customer | undefined {
  return customersStore.getSnapshot().find((customer) => customer.id === customerId);
}

export function findCustomerByUsername(username: string): Customer | undefined {
  const normalized = normalizeUsername(username);
  return customersStore.getSnapshot().find((customer) => customer.account?.username === normalized);
}

// ============================================================================
// Cuenta Corriente / Fiado (Libro mayor inmutable de movimientos)
// ============================================================================

export function getCustomerDebt(customerId: string): number {
  const movements = customerCreditStore.getSnapshot();
  const balance = movements
    .filter((m) => m.customerId === customerId)
    .reduce((sum, m) => sum + m.amount, 0);
  return Math.max(0, Math.round(balance));
}

export function getCustomerCreditLimit(customer: Customer): number {
  return customer.creditLimit ?? businessConfig.commercial.defaultCreditLimit;
}

export function recordCustomerCreditCharge(input: {
  customerId: string;
  amount: number;
  reference: string;
  dueDays?: number;
  user?: string;
}): { ok: true; movement: CustomerCreditMovement } | { ok: false; error: string } {
  const customer = findCustomer(input.customerId);
  if (!customer) return { ok: false, error: "Cliente no encontrado." };
  const amount = Math.round(input.amount);
  if (amount <= 0) return { ok: false, error: "El importe a fiar debe ser mayor a cero." };

  const currentDebt = getCustomerDebt(customer.id);
  const limit = getCustomerCreditLimit(customer);
  if (currentDebt + amount > limit) {
    return {
      ok: false,
      error: `Supera el límite de crédito de ${customer.name} ($${limit.toLocaleString("es-AR")}). Disponible: $${Math.max(0, limit - currentDebt).toLocaleString("es-AR")}.`,
    };
  }

  const dueDays = input.dueDays ?? businessConfig.commercial.defaultFiadoDays;
  const dueDate = new Date(Date.now() + dueDays * 86_400_000).toISOString();

  const movement: CustomerCreditMovement = {
    id: createId("cc"),
    customerId: customer.id,
    customerName: customer.name,
    kind: "cargo_fiado",
    amount,
    reference: input.reference.trim() || "Cargo en cuenta corriente",
    dueAt: dueDate,
    createdAt: new Date().toISOString(),
    user: input.user ?? "Mostrador",
  };

  customerCreditStore.set((list) => [movement, ...list]);
  return { ok: true, movement };
}

export function recordCustomerCreditPayment(input: {
  customerId: string;
  amount: number;
  method: string;
  reference?: string;
  user?: string;
}): { ok: true; movement: CustomerCreditMovement } | { ok: false; error: string } {
  const customer = findCustomer(input.customerId);
  if (!customer) return { ok: false, error: "Cliente no encontrado." };
  const amount = Math.round(input.amount);
  if (amount <= 0) return { ok: false, error: "El monto del cobro debe ser mayor a cero." };

  const currentDebt = getCustomerDebt(customer.id);
  if (currentDebt <= 0) {
    return { ok: false, error: "Este cliente no registra deuda pendiente." };
  }
  const applied = Math.min(currentDebt, amount);

  const movement: CustomerCreditMovement = {
    id: createId("cc"),
    customerId: customer.id,
    customerName: customer.name,
    kind: "pago_fiado",
    amount: -applied,
    method: input.method,
    reference: input.reference?.trim() || `Cobro de cuenta corriente (${input.method})`,
    createdAt: new Date().toISOString(),
    user: input.user ?? "Mostrador",
  };

  customerCreditStore.set((list) => [movement, ...list]);
  return { ok: true, movement };
}
