export type { Catalog, Category, Product, ProductInput } from "./types";
export {
  MAX_FEATURED,
  catalogStore,
  countFeatured,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  renameCategory,
  resetCatalog,
  setCategoryVisibility,
  setProductFeatured,
  updateProduct,
} from "./services/catalog-store";
export { useCatalog, useStorefront } from "./hooks/use-catalog";
export { MenuSection } from "./components/menu-section";
export { DiscountBadge, ProductPrice } from "./components/product-price";
export { MAX_DISCOUNT, applyDiscount, getFinalPrice, normalizeDiscount } from "./services/pricing";
