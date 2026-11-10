import { createLocalStore } from "@/lib/local-store";
import type { Catalog, Category, Product, ProductInput } from "../types";
import { DEFAULT_CATALOG } from "./default-catalog";

/** Cantidad máxima de promos en el carrusel del inicio. */
export const MAX_FEATURED = 5;

/**
 * El catálogo se guarda en este navegador. Para compartirlo entre dispositivos,
 * reemplazá este servicio por una API o base de datos sin tocar la UI.
 */
export const catalogStore = createLocalStore<Catalog>("burger-vb:catalog-v3", DEFAULT_CATALOG);

type LegacyProduct = Omit<Product, "discountPercent"> & { compareAtPrice?: number };

/** Pasa el catálogo de la versión anterior (precio anterior) al formato con descuento. */
function migrateLegacyCatalog() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("burger-vb:catalog-v3") !== null) return;
    const raw = window.localStorage.getItem("burger-vb:catalog-v2");
    if (!raw) return;

    const legacy = JSON.parse(raw) as { categories: Category[]; products: LegacyProduct[] };
    const products: Product[] = legacy.products.map(({ compareAtPrice, ...product }) => {
      if (!compareAtPrice || compareAtPrice <= product.price) return product;
      return {
        ...product,
        price: compareAtPrice,
        discountPercent: Math.round((1 - product.price / compareAtPrice) * 100),
      };
    });
    catalogStore.set(() => ({ categories: legacy.categories, products }));
  } catch {
    // Si el formato anterior no se puede leer, se usa el menú de fábrica.
  }
}

migrateLegacyCatalog();

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueId(base: string, existing: { id: string }[]): string {
  const slug = slugify(base) || "item";
  const ids = new Set(existing.map((item) => item.id));
  if (!ids.has(slug)) return slug;
  let suffix = 2;
  while (ids.has(`${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("es");
}

// Categorías

export type CategoryResult = { ok: true; category: Category } | { ok: false; error: string };

export function createCategory(name: string): CategoryResult {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "El nombre es muy corto." };

  const { categories } = catalogStore.getSnapshot();
  if (categories.some((category) => normalizeName(category.name) === normalizeName(trimmed))) {
    return { ok: false, error: "Ya existe una categoría con ese nombre." };
  }

  const category: Category = { id: uniqueId(trimmed, categories), name: trimmed, visible: true };
  catalogStore.set((catalog) => ({ ...catalog, categories: [...catalog.categories, category] }));
  return { ok: true, category };
}

export function renameCategory(categoryId: string, name: string): CategoryResult {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "El nombre es muy corto." };

  const { categories } = catalogStore.getSnapshot();
  const duplicate = categories.some(
    (category) =>
      category.id !== categoryId && normalizeName(category.name) === normalizeName(trimmed),
  );
  if (duplicate) return { ok: false, error: "Ya existe una categoría con ese nombre." };

  const current = categories.find((category) => category.id === categoryId);
  if (!current) return { ok: false, error: "La categoría ya no existe." };

  const category = { ...current, name: trimmed };
  catalogStore.set((catalog) => ({
    ...catalog,
    categories: catalog.categories.map((item) => (item.id === categoryId ? category : item)),
  }));
  return { ok: true, category };
}

export function setCategoryVisibility(categoryId: string, visible: boolean) {
  catalogStore.set((catalog) => ({
    ...catalog,
    categories: catalog.categories.map((category) =>
      category.id === categoryId ? { ...category, visible } : category,
    ),
  }));
}

/** Solo se puede borrar una categoría vacía. Devuelve `false` si tiene productos. */
export function deleteCategory(categoryId: string): boolean {
  const { products } = catalogStore.getSnapshot();
  if (products.some((product) => product.categoryId === categoryId)) return false;

  catalogStore.set((catalog) => ({
    ...catalog,
    categories: catalog.categories.filter((category) => category.id !== categoryId),
  }));
  return true;
}

// Productos

export function createProduct(input: ProductInput): Product {
  const { products } = catalogStore.getSnapshot();
  const product: Product = { ...input, id: uniqueId(input.name, products) };
  catalogStore.set((catalog) => ({ ...catalog, products: [...catalog.products, product] }));
  return product;
}

export function updateProduct(productId: string, change: Partial<ProductInput>) {
  catalogStore.set((catalog) => ({
    ...catalog,
    products: catalog.products.map((product) =>
      product.id === productId ? { ...product, ...change } : product,
    ),
  }));
}

export function deleteProduct(productId: string) {
  catalogStore.set((catalog) => ({
    ...catalog,
    products: catalog.products.filter((product) => product.id !== productId),
  }));
}

/** Destaca o quita un producto del carrusel. Devuelve `false` si ya se llegó al máximo. */
export function setProductFeatured(productId: string, featured: boolean): boolean {
  const { products } = catalogStore.getSnapshot();
  const featuredCount = products.filter((product) => product.featured).length;
  if (featured && featuredCount >= MAX_FEATURED) return false;
  updateProduct(productId, { featured });
  return true;
}

export function countFeatured(): number {
  return catalogStore.getSnapshot().products.filter((product) => product.featured).length;
}

export function resetCatalog() {
  catalogStore.set(() => DEFAULT_CATALOG);
}
