"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_DISCOUNT,
  MAX_FEATURED,
  applyDiscount,
  countFeatured,
  createProduct,
  updateProduct,
  type Category,
  type Product,
  type ProductInput,
} from "@/features/menu";
import { formatPrice } from "@/lib/format";
import { ImagePicker } from "../shared/image-picker";
import { PercentField, PriceField, parsePrice } from "../shared/price-field";

type FormState = {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  discount: string;
  badge: string;
  image: string;
  available: boolean;
  featured: boolean;
};

type FormErrors = Partial<Record<"name" | "categoryId" | "price" | "discount", string>>;

function toFormState(product: Product | null, categories: Category[]): FormState {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    price: product ? String(product.price) : "",
    discount: product?.discountPercent ? String(product.discountPercent) : "",
    badge: product?.badge ?? "",
    image: product?.image ?? "",
    available: product?.available ?? true,
    featured: product?.featured ?? false,
  };
}

function validate(state: FormState, categories: Category[]): FormErrors {
  const errors: FormErrors = {};
  const price = parsePrice(state.price);
  const discount = parsePrice(state.discount);

  if (state.name.trim().length < 2) errors.name = "Ingresá el nombre del producto.";
  if (!categories.some((category) => category.id === state.categoryId)) {
    errors.categoryId = "Elegí una categoría.";
  }
  if (price === null || price <= 0) errors.price = "Ingresá un precio mayor a cero.";
  if (discount !== null && discount > 0 && discount > MAX_DISCOUNT) {
    errors.discount = `El descuento puede ser de hasta ${MAX_DISCOUNT}%.`;
  }
  return errors;
}

type ProductFormProps = {
  product: Product | null;
  categories: Category[];
  onDone: () => void;
};

export function ProductForm({ product, categories, onDone }: ProductFormProps) {
  const [state, setState] = useState<FormState>(() => toFormState(product, categories));
  const [errors, setErrors] = useState<FormErrors>({});

  const price = parsePrice(state.price);
  const discount = parsePrice(state.discount);
  const hasDiscount = discount !== null && discount > 0 && discount <= MAX_DISCOUNT;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
    if (key in errors) setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function handleFeaturedChange(featured: boolean) {
    const alreadyFeatured = product?.featured ?? false;
    if (featured && !alreadyFeatured && countFeatured() >= MAX_FEATURED) {
      toast.error(`Podés destacar hasta ${MAX_FEATURED} productos en el inicio.`);
      return;
    }
    update("featured", featured);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(state, categories);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(`product-${firstInvalid}`)?.focus();
      return;
    }

    const input: ProductInput = {
      name: state.name.trim(),
      description: state.description.trim(),
      categoryId: state.categoryId,
      price: price ?? 0,
      discountPercent: hasDiscount ? discount : undefined,
      badge: state.badge.trim() || undefined,
      image: state.image,
      available: state.available,
      featured: state.featured,
    };

    if (product) {
      updateProduct(product.id, input);
      toast.success(`Guardaste los cambios de ${input.name}`);
    } else {
      createProduct(input);
      toast.success(`Agregaste ${input.name} al menú`);
    }
    onDone();
  }

  const categoryItems = Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="space-y-2">
          <span className="text-sm font-medium">Foto</span>
          <ImagePicker value={state.image} onChange={(value) => update("image", value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-name">Nombre</Label>
          <Input
            id="product-name"
            className="h-11"
            value={state.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "product-name-error" : undefined}
          />
          {errors.name && (
            <p id="product-name-error" className="text-destructive text-sm">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">Descripción</Label>
          <Textarea
            id="product-description"
            rows={3}
            placeholder="Ingredientes, tamaño, qué incluye…"
            value={state.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-categoryId">Categoría</Label>
          <Select
            items={categoryItems}
            value={state.categoryId}
            onValueChange={(value) => update("categoryId", typeof value === "string" ? value : "")}
          >
            <SelectTrigger
              id="product-categoryId"
              className="h-11! w-full rounded-lg"
              aria-invalid={Boolean(errors.categoryId)}
            >
              <SelectValue placeholder="Elegí una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-destructive text-sm">{errors.categoryId}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-price">Precio</Label>
            <PriceField
              id="product-price"
              value={state.price}
              onValueChange={(value) => update("price", value)}
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? "product-price-error" : undefined}
            />
            {errors.price && (
              <p id="product-price-error" className="text-destructive text-sm">
                {errors.price}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-discount">Descuento (opcional)</Label>
            <PercentField
              id="product-discount"
              value={state.discount}
              onValueChange={(value) => update("discount", value)}
              aria-invalid={Boolean(errors.discount)}
              aria-describedby="product-discount-hint"
            />
            <p
              id="product-discount-hint"
              className={
                errors.discount ? "text-destructive text-sm" : "text-muted-foreground text-xs"
              }
            >
              {errors.discount ?? "El precio original se muestra tachado."}
            </p>
          </div>
        </div>

        {hasDiscount && price !== null && price > 0 && (
          <div className="bg-accent text-accent-foreground flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
            <span>Precio final para el cliente</span>
            <span className="flex items-baseline gap-2">
              <span className="line-through opacity-70">{formatPrice(price)}</span>
              <span className="font-heading text-lg font-extrabold">
                {formatPrice(applyDiscount(price, discount))}
              </span>
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="product-badge">Etiqueta (opcional)</Label>
          <Input
            id="product-badge"
            className="h-11"
            placeholder="Promo, Nuevo, Más pedida…"
            maxLength={24}
            value={state.badge}
            onChange={(event) => update("badge", event.target.value)}
          />
        </div>

        <div className="divide-y rounded-2xl border">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Disponible</span>
              <span className="text-muted-foreground block text-xs">
                Si lo apagás, se muestra como agotado.
              </span>
            </span>
            <Switch
              checked={state.available}
              onCheckedChange={(checked) => update("available", checked)}
              aria-label="Disponible"
            />
          </label>
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Destacar en el inicio</span>
              <span className="text-muted-foreground block text-xs">
                Aparece en el carrusel de promos (máximo {MAX_FEATURED}).
              </span>
            </span>
            <Switch
              checked={state.featured}
              onCheckedChange={handleFeaturedChange}
              aria-label="Destacar en el inicio"
            />
          </label>
        </div>
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11 flex-1 rounded-xl font-semibold">
          {product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
