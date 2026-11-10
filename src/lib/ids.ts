/** Identificador corto y único para registros guardados en el navegador. */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

/** Normaliza un usuario para compararlo: sin espacios y en minúsculas. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Deja solo los dígitos de un teléfono. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
