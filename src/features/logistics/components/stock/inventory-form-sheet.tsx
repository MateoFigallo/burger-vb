"use client";

import { useState, type FormEvent } from "react";
import { Calculator, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { businessConfig } from "@/config/business.config";
import { ImagePicker } from "@/features/admin/components/shared/image-picker";
import {
  PercentField,
  PriceField,
  parsePrice,
} from "@/features/admin/components/shared/price-field";
import { MAX_DISCOUNT, MAX_FEATURED, applyDiscount, countFeatured } from "@/features/menu";
import { formatPrice } from "@/lib/format";
import { calculateSuggestedPrice } from "../../schemas/logistics.schema";
import { saveInventoryProduct } from "../../services/logistics-store";
import type { InventoryCategory, InventoryItem, KitItem, UnitCode } from "../../types";

type InventoryFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  categories: InventoryCategory[];
  allItems: InventoryItem[];
};

export function InventoryFormSheet({
  open,
  onOpenChange,
  item,
  categories,
  allItems,
}: InventoryFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="text-lg font-bold">
            {item ? `Editar ${item.name}` : "Nuevo artículo de inventario"}
          </SheetTitle>
          <SheetDescription>
            Configurá costos, margen sugerido, stock, código de barras y publicación en el menú.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <InventoryFormBody
            key={item?.id ?? "new-inventory-item"}
            item={item}
            categories={categories}
            allItems={allItems}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type FormBodyProps = {
  item: InventoryItem | null;
  categories: InventoryCategory[];
  allItems: InventoryItem[];
  onDone: () => void;
};

function InventoryFormBody({ item, categories, allItems, onDone }: FormBodyProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [presentation, setPresentation] = useState(item?.presentation ?? "");
  const [group, setGroup] = useState(item?.group ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories[0]?.id ?? "",
  );
  const [unit, setUnit] = useState<UnitCode>(item?.unit ?? "u");
  const [costStr, setCostStr] = useState(item ? String(item.cost) : "");
  const [calcMode, setCalcMode] = useState<"recargo" | "margen">("margen");
  const [calcPctStr, setCalcPctStr] = useState("55");
  const [priceStr, setPriceStr] = useState(item ? String(item.price) : "");
  const [discountStr, setDiscountStr] = useState(
    item?.discountPercent ? String(item.discountPercent) : "",
  );
  const [stockStr, setStockStr] = useState(item ? String(item.stock) : "20");
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  const [plu, setPlu] = useState(item?.plu ?? "");
  const [badge, setBadge] = useState(item?.badge ?? "");
  const [image, setImage] = useState(item?.image ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [featured, setFeatured] = useState(item?.featured ?? false);
  const [needStock, setNeedStock] = useState(item?.needStock ?? false);
  const [isCombo, setIsCombo] = useState((item?.kit.length ?? 0) > 0);
  const [kit, setKit] = useState<KitItem[]>(
    item?.kit.length
      ? item.kit
      : [{ productId: "", quantity: 1 }],
  );
  const [error, setError] = useState<string | null>(null);

  const candidateComponents = allItems.filter(
    (candidate) =>
      candidate.id !== item?.id && !candidate.archived && !candidate.isKit,
  );

  const kitCalculatedCost = isCombo
    ? kit.reduce((sum, k) => {
        const comp = allItems.find((p) => p.id === k.productId);
        return sum + (comp ? comp.effectiveCost * (k.quantity || 0) : 0);
      }, 0)
    : 0;

  const parsedCost = parsePrice(costStr) ?? (isCombo ? kitCalculatedCost : 0);
  const parsedPrice = parsePrice(priceStr) ?? 0;
  const parsedDiscount = parsePrice(discountStr);
  const hasDiscount =
    parsedDiscount !== null && parsedDiscount > 0 && parsedDiscount <= MAX_DISCOUNT;
  const finalSalePrice =
    hasDiscount && parsedPrice > 0
      ? applyDiscount(parsedPrice, parsedDiscount)
      : parsedPrice;

  const calcPct = Number.parseFloat(calcPctStr.replace(",", "."));
  const suggestedPrice = calculateSuggestedPrice(parsedCost, calcMode, calcPct);

  const liveMarkup =
    parsedCost > 0 && finalSalePrice > 0
      ? Math.round(((finalSalePrice - parsedCost) / parsedCost) * 1000) / 10
      : null;
  const liveMargin =
    parsedCost > 0 && finalSalePrice > 0
      ? Math.round(((finalSalePrice - parsedCost) / finalSalePrice) * 1000) / 10
      : null;
  const unitProfit = finalSalePrice > 0 && parsedCost > 0 ? finalSalePrice - parsedCost : null;

  function handleFeaturedToggle(next: boolean) {
    const alreadyFeatured = item?.featured ?? false;
    if (next && !alreadyFeatured && countFeatured() >= MAX_FEATURED) {
      toast.error(`Podés destacar hasta ${MAX_FEATURED} productos en el inicio.`);
      return;
    }
    setFeatured(next);
  }

  function handleAddKitRow() {
    setKit((prev) => [
      ...prev,
      { productId: candidateComponents[0]?.id ?? "", quantity: 1 },
    ]);
  }

  function handleUpdateKitRow(index: number, patch: Partial<KitItem>) {
    setKit((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  }

  function handleRemoveKitRow(index: number) {
    setKit((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [{ productId: "", quantity: 1 }];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedStock = Number.parseFloat(stockStr.replace(",", "."));
    const result = saveInventoryProduct({
      id: item?.id,
      name,
      description,
      categoryId,
      price: parsedPrice,
      discountPercent: hasDiscount ? parsedDiscount : undefined,
      badge,
      image,
      available,
      featured,
      cost: isCombo && (parsePrice(costStr) ?? 0) === 0 ? kitCalculatedCost : (parsePrice(costStr) ?? 0),
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      unit,
      barcode,
      plu,
      presentation,
      group,
      needStock,
      kit: isCombo ? kit.filter((k) => k.productId && k.quantity > 0) : [],
    });

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(
      item
        ? `Guardaste los cambios de ${result.value.name}`
        : `Agregaste ${result.value.name} al inventario`,
    );
    onDone();
  }

  const categoryItems = Object.fromEntries(categories.map((cat) => [cat.id, cat.name]));
  const unitItems = Object.fromEntries(
    Object.entries(businessConfig.logistics.units).map(([k, v]) => [k, v.label]),
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-sm font-medium">Foto del artículo</span>
          <ImagePicker value={image} onChange={setImage} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="inv-name">Nombre del producto</Label>
            <Input
              id="inv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej.: Doble Cheddar, Papas rústicas…"
              maxLength={80}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-category">Categoría</Label>
            <Select
              items={categoryItems}
              value={categoryId}
              onValueChange={(val) => setCategoryId(typeof val === "string" ? val : "")}
            >
              <SelectTrigger id="inv-category" className="h-11! w-full">
                <SelectValue placeholder="Elegí una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-unit">Unidad de medida</Label>
            <Select
              items={unitItems}
              value={isCombo ? "u" : unit}
              onValueChange={(val) =>
                setUnit((val === "kg" || val === "l" ? val : "u") as UnitCode)
              }
              disabled={isCombo}
            >
              <SelectTrigger id="inv-unit" className="h-11! w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(businessConfig.logistics.units).map(([code, info]) => (
                  <SelectItem key={code} value={code}>
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="inv-presentation">Presentación</Label>
            <Input
              id="inv-presentation"
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              placeholder="Ej.: 2x110 g, 500 ml"
              maxLength={40}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-group">Línea / Grupo</Label>
            <Input
              id="inv-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Ej.: Línea Smash"
              maxLength={40}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-badge">Etiqueta menú</Label>
            <Input
              id="inv-badge"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Más pedida, Promo…"
              maxLength={24}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inv-desc">Descripción en menú digital</Label>
          <Textarea
            id="inv-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ingredientes, preparación, qué incluye…"
            maxLength={160}
          />
        </div>

        {/* Bloque de Costo, Calculadora de Margen y Precio de Venta */}
        <div className="bg-muted/40 space-y-4 rounded-2xl border p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Calculator aria-hidden="true" className="text-primary size-4" />
            <span>Costo, margen y precio de venta</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-cost">Costo unitario ($)</Label>
              <PriceField
                id="inv-cost"
                value={costStr}
                onValueChange={setCostStr}
                placeholder={isCombo ? String(kitCalculatedCost) : "0"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-calc-mode">Cálculo sugerido</Label>
              <Select
                items={{
                  margen: "Margen s/ precio",
                  recargo: "Recargo s/ costo",
                }}
                value={calcMode}
                onValueChange={(val) =>
                  setCalcMode(val === "recargo" ? "recargo" : "margen")
                }
              >
                <SelectTrigger id="inv-calc-mode" className="h-11! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="margen">Margen bruto s/ precio</SelectItem>
                  <SelectItem value="recargo">Recargo sobre costo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-calc-pct">Porcentaje deseado (%)</Label>
              <Input
                id="inv-calc-pct"
                inputMode="decimal"
                value={calcPctStr}
                onChange={(e) => setCalcPctStr(e.target.value)}
                placeholder="50"
                className="h-11 tabular-nums"
              />
            </div>
          </div>

          {suggestedPrice !== null && suggestedPrice > 0 && (
            <div className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Sparkles aria-hidden="true" className="text-primary size-4" />
                Precio sugerido ({calcMode === "margen" ? "margen" : "recargo"} {calcPctStr}%):{" "}
                <strong className="text-foreground font-extrabold tabular-nums">
                  {formatPrice(suggestedPrice)}
                </strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 rounded-lg text-xs font-semibold"
                onClick={() => setPriceStr(String(suggestedPrice))}
              >
                Usar sugerido
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-price">Precio de lista ($)</Label>
              <PriceField
                id="inv-price"
                value={priceStr}
                onValueChange={setPriceStr}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-discount">Descuento promo (opcional)</Label>
              <PercentField
                id="inv-discount"
                value={discountStr}
                onValueChange={setDiscountStr}
              />
            </div>
          </div>

          {finalSalePrice > 0 && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3 text-center text-xs">
              <div>
                <span className="text-muted-foreground block">Precio final</span>
                <span className="font-heading text-sm font-extrabold tabular-nums">
                  {formatPrice(finalSalePrice)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Margen bruto</span>
                <span className="font-heading text-sm font-extrabold tabular-nums">
                  {liveMargin !== null ? `${liveMargin}%` : "—"}
                </span>
                {liveMarkup !== null && (
                  <span className="text-muted-foreground block text-[11px]">
                    Recargo {liveMarkup}%
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block">Ganancia / u.</span>
                <span className="font-heading text-sm font-extrabold tabular-nums">
                  {unitProfit !== null ? formatPrice(unitProfit) : "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stock, Código de barras y PLU */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="inv-stock">
              Stock ({businessConfig.logistics.units[isCombo ? "u" : unit].short})
            </Label>
            <Input
              id="inv-stock"
              inputMode="decimal"
              value={isCombo ? "Automático" : stockStr}
              onChange={(e) => setStockStr(e.target.value)}
              disabled={isCombo}
              className="h-11 tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-barcode">Código de barras</Label>
            <Input
              id="inv-barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="7798..."
              maxLength={32}
              className="h-11 tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-plu">PLU (1 a 5 dígitos)</Label>
            <Input
              id="inv-plu"
              inputMode="numeric"
              value={plu}
              onChange={(e) => setPlu(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="Ej.: 101"
              maxLength={5}
              className="h-11 tabular-nums"
            />
          </div>
        </div>

        {/* Composición de Combo / Kit */}
        <div className="space-y-3 rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers aria-hidden="true" className="text-primary size-4" />
              <div>
                <p className="text-sm font-bold">Composición de combo / kit</p>
                <p className="text-muted-foreground text-xs">
                  Al venderse descuenta el stock de cada artículo que lo integra.
                </p>
              </div>
            </div>
            <Switch
              checked={isCombo}
              onCheckedChange={setIsCombo}
              aria-label="Es un combo compuesto por otros productos"
            />
          </div>

          {isCombo && (
            <div className="space-y-2.5 pt-2">
              {kit.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      aria-label={`Componente ${index + 1} del combo`}
                      value={row.productId}
                      onChange={(e) =>
                        handleUpdateKitRow(index, { productId: e.target.value })
                      }
                      className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                    >
                      <option value="">— Elegí un producto —</option>
                      {candidateComponents.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} (Costo: {formatPrice(comp.effectiveCost)} · Stock:{" "}
                          {comp.effectiveStock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    type="number"
                    min="0.1"
                    step="1"
                    aria-label={`Cantidad del componente ${index + 1}`}
                    value={row.quantity}
                    onChange={(e) =>
                      handleUpdateKitRow(index, {
                        quantity: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-10 w-20 text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0"
                    onClick={() => handleRemoveKitRow(index)}
                    aria-label={`Quitar componente ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                  onClick={handleAddKitRow}
                >
                  <Plus className="size-3.5" />
                  Sumar componente
                </Button>
                <span className="text-muted-foreground text-xs">
                  Costo suma de componentes:{" "}
                  <strong className="text-foreground">{formatPrice(kitCalculatedCost)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Opciones de disponibilidad y reglas de stock */}
        <div className="divide-y rounded-2xl border">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Publicar en menú digital</span>
              <span className="text-muted-foreground block text-xs">
                Si está activo, los clientes pueden pedirlo desde la tienda online.
              </span>
            </span>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Exigir stock disponible</span>
              <span className="text-muted-foreground block text-xs">
                Impide que quede en negativo por ajustes manuales sin reposición.
              </span>
            </span>
            <Switch checked={needStock} onCheckedChange={setNeedStock} />
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Destacar en promos del inicio</span>
              <span className="text-muted-foreground block text-xs">
                Muestra este artículo en el carrusel principal (máx. {MAX_FEATURED}).
              </span>
            </span>
            <Switch checked={featured} onCheckedChange={handleFeaturedToggle} />
          </label>
        </div>
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          onClick={onDone}
        >
          Cancelar
        </Button>
        <Button type="submit" className="h-11 flex-1 rounded-xl font-semibold">
          {item ? "Guardar cambios" : "Crear artículo"}
        </Button>
      </div>
    </form>
  );
}
