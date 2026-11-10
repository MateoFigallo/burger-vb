"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Star, Trash } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MAX_FEATURED,
  getFinalPrice,
  deleteProduct,
  setProductFeatured,
  updateProduct,
  type Category,
  type Product,
} from "@/features/menu";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { formatPrice } from "@/lib/format";
import { InlinePercentEditor, InlinePriceEditor } from "../shared/price-field";

const ALL_CATEGORIES = "todas";

type ProductsTableProps = {
  categories: Category[];
  products: Product[];
  onEdit: (product: Product) => void;
};

export function ProductsTable({ categories, products, onEdit }: ProductsTableProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filterItems = {
    [ALL_CATEGORIES]: "Todas las categorías",
    ...Object.fromEntries(categories.map((category) => [category.id, category.name])),
  };
  const activeFilter = categoryNames.has(categoryFilter) ? categoryFilter : ALL_CATEGORIES;

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleProducts = products.filter(
    (product) =>
      (activeFilter === ALL_CATEGORIES || product.categoryId === activeFilter) &&
      (!normalizedQuery || product.name.toLocaleLowerCase("es").includes(normalizedQuery)),
  );

  function toggleFeatured(product: Product) {
    const next = !product.featured;
    if (!setProductFeatured(product.id, next)) {
      toast.error(`Podés destacar hasta ${MAX_FEATURED} productos en el inicio.`);
      return;
    }
    toast.success(
      next
        ? `${product.name} aparece en las promos del inicio`
        : `Quitaste ${product.name} de las promos`,
    );
  }

  return (
    <section
      aria-labelledby="products-title"
      className="bg-card min-w-0 rounded-2xl border shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="products-title" className="text-lg font-bold">
          Listado
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto"
              aria-label="Buscar producto"
              className="h-11 pl-9 sm:w-52"
            />
          </div>
          <Select
            items={filterItems}
            value={activeFilter}
            onValueChange={(value) =>
              setCategoryFilter(typeof value === "string" ? value : ALL_CATEGORIES)
            }
          >
            <SelectTrigger className="h-11! w-full sm:w-52" aria-label="Filtrar por categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <p className="text-muted-foreground px-5 py-12 text-center text-sm">
          No hay productos que coincidan con la búsqueda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead className="text-center">Promo</TableHead>
              <TableHead className="pr-5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map((product) => (
              <TableRow key={product.id} className={product.available ? "" : "opacity-60"}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-xl">
                      <ProductImage src={product.image} alt="" sizes="48px" />
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-56 truncate font-semibold">{product.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">
                          {categoryNames.get(product.categoryId) ?? "Sin categoría"}
                        </span>
                        {product.badge && (
                          <Badge variant="secondary" className="h-5 text-[11px]">
                            {product.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <InlinePriceEditor
                    price={product.price}
                    label={`Precio de ${product.name}`}
                    onSave={(price) => {
                      updateProduct(product.id, { price });
                      toast.success(`Actualizaste el precio de ${product.name}`);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <InlinePercentEditor
                    value={product.discountPercent}
                    label={`Descuento de ${product.name}`}
                    onSave={(discountPercent) => {
                      updateProduct(product.id, { discountPercent });
                      toast.success(
                        discountPercent
                          ? `${product.name} tiene ${discountPercent}% de descuento`
                          : `Quitaste el descuento de ${product.name}`,
                      );
                    }}
                  />
                </TableCell>
                <TableCell className="font-heading font-bold tabular-nums">
                  {product.discountPercent ? (
                    <span className="text-brand">{formatPrice(getFinalPrice(product))}</span>
                  ) : (
                    <span className="text-muted-foreground font-sans font-normal">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={product.available}
                    onCheckedChange={(checked) => updateProduct(product.id, { available: checked })}
                    aria-label={`Disponibilidad de ${product.name}`}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-pressed={product.featured}
                    aria-label={`Destacar ${product.name} en el inicio`}
                    onClick={() => toggleFeatured(product)}
                  >
                    <Star
                      className={cn(
                        "size-5 transition-colors",
                        product.featured
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={`Editar ${product.name}`}
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-destructive size-11"
                      aria-label={`Eliminar ${product.name}`}
                      onClick={() => setDeleting(product)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar ${deleting?.name ?? "el producto"}?`}
        description="El producto se borra del menú. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (!deleting) return;
          deleteProduct(deleting.id);
          toast.success(`Eliminaste ${deleting.name}`);
        }}
      />
    </section>
  );
}
