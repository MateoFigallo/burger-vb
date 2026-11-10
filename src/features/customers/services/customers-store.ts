import { createId, normalizePhone, normalizeUsername } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import { hashPassword } from "@/lib/password";
import type { Customer, CustomerInput } from "../types";
import { SAMPLE_CUSTOMERS } from "./sample-customers";

/**
 * Los clientes se guardan en este navegador. Para compartirlos entre dispositivos,
 * reemplazá este servicio por una API o base de datos sin tocar la UI.
 */
export const customersStore = createLocalStore<Customer[]>("burger-vb:customers", SAMPLE_CUSTOMERS);

export type AccountInput = { username: string; password: string };

function cleanInput(input: CustomerInput): CustomerInput {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    birthday: input.birthday,
    notes: input.notes.trim(),
  };
}

export async function createCustomer(
  input: CustomerInput,
  account?: AccountInput,
): Promise<Customer> {
  const customer: Customer = {
    ...cleanInput(input),
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
