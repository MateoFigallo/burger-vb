import { getPanelHome } from "@/config/panel";
import { findCustomerByUsername } from "@/features/customers";
import { findEmployeeByUsername } from "@/features/team";
import { normalizeUsername } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import { verifyPassword } from "@/lib/password";

/**
 * Acceso de demostración: todo se valida en el navegador, así que no es seguro para producción.
 * Para un sitio real, reemplazá este servicio por autenticación en el servidor.
 */
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "1234";

export type Session =
  | { kind: "admin" }
  | { kind: "employee"; employeeId: string }
  | { kind: "customer"; customerId: string };

export const sessionStore = createLocalStore<Session | null>("burger-vb:session", null);

export type SignInResult =
  { ok: true; redirectTo: string; greeting: string } | { ok: false; error: string };

const INVALID_CREDENTIALS = "El usuario o la contraseña no son correctos.";

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const normalized = normalizeUsername(username);

  if (normalized === ADMIN_USERNAME) {
    if (password !== ADMIN_PASSWORD) return { ok: false, error: INVALID_CREDENTIALS };
    sessionStore.set(() => ({ kind: "admin" }));
    return { ok: true, redirectTo: "/dashboard", greeting: "Bienvenido, administrador" };
  }

  const employee = findEmployeeByUsername(normalized);
  if (employee && (await verifyPassword(password, employee.passwordHash))) {
    if (!employee.active) {
      return { ok: false, error: "Tu cuenta está desactivada. Hablá con el encargado." };
    }
    const home = getPanelHome(employee.modules);
    if (!home) return { ok: false, error: "Tu cuenta todavía no tiene módulos habilitados." };
    sessionStore.set(() => ({ kind: "employee", employeeId: employee.id }));
    return { ok: true, redirectTo: home, greeting: `¡Hola, ${employee.name.split(" ")[0]}!` };
  }

  const customer = findCustomerByUsername(normalized);
  if (customer?.account && (await verifyPassword(password, customer.account.passwordHash))) {
    sessionStore.set(() => ({ kind: "customer", customerId: customer.id }));
    return {
      ok: true,
      redirectTo: "/mi-cuenta",
      greeting: `¡Hola, ${customer.name.split(" ")[0]}!`,
    };
  }

  return { ok: false, error: INVALID_CREDENTIALS };
}

export function signOut() {
  sessionStore.set(() => null);
}

export function isReservedUsername(username: string): boolean {
  return normalizeUsername(username) === ADMIN_USERNAME;
}
