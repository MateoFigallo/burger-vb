export type Category = {
  id: string;
  name: string;
  /** Si la categoría se muestra en el menú de la página de inicio. */
  visible: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Descuento en porcentaje (1 a 90). El precio final se calcula con getFinalPrice. */
  discountPercent?: number;
  categoryId: string;
  /** URL remota o foto subida (data URL). Vacío muestra un ícono. */
  image: string;
  badge?: string;
  available: boolean;
  /** Si aparece en el carrusel de promos del inicio. */
  featured: boolean;
};

export type Catalog = {
  categories: Category[];
  products: Product[];
};

export type ProductInput = Omit<Product, "id">;

export type CategoryFilter = string;

export type CategoryOption = {
  id: CategoryFilter;
  label: string;
};
