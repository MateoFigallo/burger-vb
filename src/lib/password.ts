const PREFIX = "burger-vb:";

/**
 * Guarda las contraseñas como hash SHA-256 en vez de texto plano.
 * Es una protección básica: en un sitio real, las cuentas se validan en el servidor.
 */
export async function hashPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return `plain:${password}`;

  const data = new TextEncoder().encode(PREFIX + password);
  const digest = await subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("plain:")) return storedHash === `plain:${password}`;
  return (await hashPassword(password)) === storedHash;
}

export const MIN_PASSWORD_LENGTH = 4;
