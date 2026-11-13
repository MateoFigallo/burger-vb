import type { WebMenuConfig } from "../types";

function stripHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

export function getInstagramUrl(handle: string): string | null {
  const clean = stripHandle(handle);
  return clean ? `https://www.instagram.com/${clean}` : null;
}

export function getTiktokUrl(handle: string): string | null {
  const clean = stripHandle(handle);
  return clean ? `https://www.tiktok.com/@${clean}` : null;
}

export function getMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getMapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Link para dejar reseña: el configurado en el panel o, si falta, la ficha de Maps por dirección. */
export function getGoogleReviewUrl(web: Pick<WebMenuConfig, "googleReviewUrl" | "address" | "storeName">) {
  return web.googleReviewUrl.trim() || getMapsSearchUrl(`${web.storeName} ${web.address}`);
}
