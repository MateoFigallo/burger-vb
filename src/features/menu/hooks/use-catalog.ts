"use client";

import { useMemo } from "react";
import { useLocalStore } from "@/lib/use-local-store";
import { catalogStore } from "../services/catalog-store";
import type { Catalog, Category, Product } from "../types";

/** Catálogo completo, para el panel de administración. */
export function useCatalog(): Catalog {
  return useLocalStore(catalogStore);
}

type Storefront = {
  /** Categorías visibles que tienen al menos un producto. */
  categories: Category[];
  /** Productos de las categorías visibles. */
  products: Product[];
  /** Promos destacadas y disponibles, para el carrusel del inicio. */
  featured: Product[];
};

/** Lo que ven los clientes en la tienda. */
export function useStorefront(): Storefront {
  const catalog = useLocalStore(catalogStore);

  return useMemo(() => {
    const visibleIds = new Set(
      catalog.categories.filter((category) => category.visible).map((category) => category.id),
    );
    const products = catalog.products.filter((product) => visibleIds.has(product.categoryId));
    const usedIds = new Set(products.map((product) => product.categoryId));

    return {
      categories: catalog.categories.filter((category) => usedIds.has(category.id)),
      products,
      featured: catalog.products.filter((product) => product.featured && product.available),
    };
  }, [catalog]);
}
