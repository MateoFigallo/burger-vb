import type { Product } from "../types";

export const MAX_DISCOUNT = 90;

/** Normaliza un descuento: entero entre 1 y 90, o `undefined` si no hay. */
export function normalizeDiscount(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;
  return Math.min(rounded, MAX_DISCOUNT);
}

export function applyDiscount(price: number, discountPercent?: number): number {
  const discount = normalizeDiscount(discountPercent);
  return discount ? Math.round((price * (100 - discount)) / 100) : price;
}

/** Precio que paga el cliente, con el descuento aplicado. */
export function getFinalPrice(product: Pick<Product, "price" | "discountPercent">): number {
  return applyDiscount(product.price, product.discountPercent);
}
