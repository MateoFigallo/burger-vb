"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Boxes,
  DollarSign,
  Download,
  Layers,
  PackagePlus,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessConfig } from "@/config/business.config";
import { ConfirmDialog, PageHeader, StatCards, type Stat } from "@/features/admin";
import { useSession } from "@/features/auth";
import { getFinalPrice } from "@/features/menu";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLogistics } from "../../hooks/use-logistics";
import {
  matchesInventoryQuery,
  parseInventoryQuery,
} from "../../schemas/logistics.schema";
import { downloadCsv } from "../../services/csv-export";
import {
  resetLogisticsToDefault,
  restoreArchivedProduct,
} from "../../services/logistics-store";
import type { InventoryCategory, InventoryItem } from "../../types";
import { LogisticsLoadingSkeleton, LogisticsNav } from "../logistics-nav";
import { CategoryFormSheet, DeletePreviewSheet } from "./delete-preview-dialog";
import { InventoryFormSheet } from "./inventory-form-sheet";
import { StockAdjustSheet } from "./stock-adjust-dialog";

type SortKey = "default" | "name" | "price-asc" | "price-desc" | "stock-asc" | "margin-desc";

export function StockManager() {
  const { isReady, categories, items } = useLogistics();
  const { viewer } = useSession();
  const isAdmin = viewer?.kind === "admin";

  // Filtros
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [minPriceStr, setMinPriceStr] = useState("");
  const [maxPriceStr, setMaxPriceStr] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Selección y modales
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    ids: string[];
    mode: "delete" | "archive";
  }>({ open: false, ids: [], mode: "delete" });
  const [confirmReset, setConfirmReset] = useState(false);

  const parsedQuery = useMemo(() => parseInventoryQuery(query), [query]);
  const explicitMin = useMemo(() => {
    const val = Number.parseFloat(minPriceStr.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(val) && val >= 0 ? val : null;
  }, [minPriceStr]);
  const explicitMax = useMemo(() => {
    const val = Number.parseFloat(maxPriceStr.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(val) && val >= 0 ? val : null;
  }, [maxPriceStr]);

  const baseFilteredItems = useMemo(() => {
    const threshold = businessConfig.logistics.lowStockThreshold;
    return items.filter((item) => {
      if (showArchived ? !item.archived : item.archived) return false;
      if (onlyLowStock && item.effectiveStock > threshold) return false;
      return matchesInventoryQuery(item, parsedQuery, explicitMin, explicitMax);
    });
  }, [items, showArchived, onlyLowStock, parsedQuery, explicitMin, explicitMax]);

  const visibleItems = useMemo(() => {
    const filtered = selectedCategoryId
      ? baseFilteredItems.filter((item) => item.categoryId === selectedCategoryId)
      : baseFilteredItems;

    if (sortBy === "default") return filtered;
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      if (sortBy === "price-asc") return a.price - b.price || a.name.localeCompare(b.name, "es");
      if (sortBy === "price-desc") return b.price - a.price || a.name.localeCompare(b.name, "es");
      if (sortBy === "stock-asc")
        return a.effectiveStock - b.effectiveStock || a.name.localeCompare(b.name, "es");
      if (sortBy === "margin-desc")
        return (b.marginPercent ?? -999) - (a.marginPercent ?? -999);
      return 0;
    });
  }, [baseFilteredItems, selectedCategoryId, sortBy]);

  // Métricas del inventario
  const activeItems = useMemo(() => items.filter((i) => !i.archived), [items]);
  const archivedCount = useMemo(() => items.filter((i) => i.archived).length, [items]);
  const negativeItemsCount = useMemo(
    () => activeItems.filter((i) => i.effectiveStock < 0).length,
    [activeItems],
  );
  const lowStockItemsCount = useMemo(
    () =>
      activeItems.filter(
        (i) => i.effectiveStock <= businessConfig.logistics.lowStockThreshold,
      ).length,
    [activeItems],
  );

  const totalStockValuation = useMemo(
    () =>
      activeItems.reduce((sum, item) => {
        if (item.isKit || item.stock <= 0) return sum;
        return sum + Math.round(item.stock * item.effectiveCost);
      }, 0),
    [activeItems],
  );

  const averageMargin = useMemo(() => {
    const withMargin = activeItems.filter((i) => i.marginPercent !== null);
    if (withMargin.length === 0) return 0;
    const total = withMargin.reduce((acc, i) => acc + (i.marginPercent ?? 0), 0);
    return Math.round((total / withMargin.length) * 10) / 10;
  }, [activeItems]);

  if (!isReady) {
    return (
      <div className="space-y-6">
        <LogisticsNav />
        <LogisticsLoadingSkeleton />
      </div>
    );
  }

  const stats: Stat[] = [
    {
      label: "Artículos en inventario",
      value: String(activeItems.length),
      hint: `${categories.length} categorías configuradas`,
      icon: Boxes,
    },
    {
      label: "Valorización del stock",
      value: formatPrice(totalStockValuation),
      hint: "Capital en mercadería al costo",
      icon: DollarSign,
    },
    {
      label: "Margen bruto promedio",
      value: `${averageMargin}%`,
      hint: "Rentabilidad media sobre venta",
      icon: Percent,
    },
    {
      label: "Alertas de reposición",
      value: String(lowStockItemsCount),
      hint:
        negativeItemsCount > 0
          ? `${negativeItemsCount} en negativo · reponer urgente`
          : `Con ${businessConfig.logistics.lowStockThreshold} o menos unidades`,
      icon: AlertTriangle,
    },
  ];

  const visibleIdSet = new Set(visibleItems.map((i) => i.id));
  const activeSelectedIds = [...selectedIds].filter((id) => visibleIdSet.has(id));
  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id));

  function toggleSelectAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of visibleItems) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function toggleSelectItem(productId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }

  function handleExportCsv() {
    downloadCsv(
      "inventario-burger-vb.csv",
      [
        "ID",
        "Producto",
        "Presentacion",
        "Categoria",
        "Precio_Venta",
        "Costo_Unitario",
        "Margen_Pct",
        "Stock",
        "Unidad",
        "Codigo_Barras",
        "PLU",
        "En_Menu",
        "Estado",
      ],
      visibleItems.map((item) => [
        item.id,
        item.name,
        item.presentation,
        item.categoryName,
        getFinalPrice(item),
        item.effectiveCost,
        item.marginPercent ?? "",
        item.effectiveStock,
        businessConfig.logistics.units[item.unit].short,
        item.barcode,
        item.plu,
        item.available ? "Si" : "No",
        item.archived ? "Archivado" : "Activo",
      ]),
    );
    toast.success("Exportaste el inventario en CSV");
  }

  function handleRestore(item: InventoryItem) {
    const res = restoreArchivedProduct(item.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Restauraste «${item.name}» al inventario activo`);
  }

  function formatKitSummary(item: InventoryItem): string {
    return item.kit
      .map((k) => {
        const comp = items.find((p) => p.id === k.productId);
        return `${k.quantity}× ${comp?.name ?? k.productId}`;
      })
      .join(" + ");
  }

  const currentCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) ?? null
    : null;

  const shouldGroup = groupByCategory && !selectedCategoryId && sortBy === "default";

  function renderItemRow(item: InventoryItem) {
    const unitShort = businessConfig.logistics.units[item.unit].short;
    const finalPrice = getFinalPrice(item);
    const isChecked = selectedIds.has(item.id);

    return (
      <TableRow
        key={item.id}
        className={cn(
          !item.available && !item.archived && "opacity-70",
          item.stockStatus === "neg" && "bg-red-500/[0.04]",
          item.stockStatus === "low" && "bg-amber-500/[0.03]",
        )}
      >
        {isAdmin && (
          <TableCell className="w-10 pl-4">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => toggleSelectItem(item.id, e.target.checked)}
              aria-label={`Seleccionar ${item.name}`}
              className="accent-primary size-4 cursor-pointer rounded"
            />
          </TableCell>
        )}

        <TableCell className={cn(!isAdmin && "pl-5")}>
          <div className="flex items-center gap-3">
            <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-xl border">
              <ProductImage src={item.image} alt="" sizes="44px" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold">{item.name}</span>
                {item.presentation && (
                  <span className="text-muted-foreground text-xs">
                    · {item.presentation}
                  </span>
                )}
                {item.isKit && (
                  <Badge variant="secondary" className="h-5 gap-1 text-[11px]">
                    <Layers className="size-3" />
                    Combo
                  </Badge>
                )}
                {item.needStock && (
                  <Badge variant="outline" className="h-5 text-[11px]">
                    Exige stock
                  </Badge>
                )}
                {item.archived && (
                  <Badge variant="destructive" className="h-5 text-[11px]">
                    Archivado
                  </Badge>
                )}
              </div>

              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                {item.barcode && <span className="font-mono">EAN {item.barcode}</span>}
                {item.plu && <span className="font-mono">PLU {item.plu}</span>}
                {item.group && <span>{item.group}</span>}
                {item.isKit && (
                  <span className="text-foreground/80 font-medium">
                    ({formatKitSummary(item)})
                  </span>
                )}
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.categoryColor }}
            />
            {item.categoryName}
          </span>
        </TableCell>

        <TableCell className="text-right tabular-nums">
          <span className="font-heading font-bold">{formatPrice(finalPrice)}</span>
          {item.discountPercent ? (
            <span className="text-muted-foreground block text-[11px] line-through">
              {formatPrice(item.price)} (-{item.discountPercent}%)
            </span>
          ) : null}
          {item.unit !== "u" && (
            <span className="text-muted-foreground block text-[11px]">/ {unitShort}</span>
          )}
        </TableCell>

        <TableCell className="text-right font-medium tabular-nums">
          {formatPrice(item.effectiveCost)}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          {item.marginPercent !== null ? (
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-bold",
                item.marginPercent >= 45
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : item.marginPercent >= 25
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-red-500/15 text-red-600 dark:text-red-300",
              )}
            >
              {item.marginPercent}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-right tabular-nums">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
              (item.stockStatus === "neg" || item.stockStatus === "zero") &&
                "bg-red-500/15 text-red-600 dark:text-red-300",
              item.stockStatus === "low" &&
                "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              item.stockStatus === "ok" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            )}
          >
            {item.effectiveStock} {unitShort}
          </span>
          {item.isKit && (
            <span className="text-muted-foreground block text-[10px]">
              según componentes
            </span>
          )}
        </TableCell>

        <TableCell>
          {item.available ? (
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            >
              Publicado
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">Oculto</span>
          )}
        </TableCell>

        <TableCell className="pr-5 text-right">
          {item.archived ? (
            isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-xs"
                onClick={() => handleRestore(item)}
              >
                <Undo2 className="size-3.5" />
                Restaurar
              </Button>
            )
          ) : (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg px-2.5 text-xs font-semibold"
                disabled={item.isKit}
                title={
                  item.isKit
                    ? "Ajustá el stock desde cada componente del combo"
                    : "Sumar, restar o registrar merma"
                }
                onClick={() => setAdjustingItem(item)}
              >
                <SlidersHorizontal className="size-3.5" />
                Stock
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={`Editar ${item.name}`}
                onClick={() => {
                  setEditingItem(item);
                  setIsItemSheetOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-destructive size-9"
                  aria-label={`Eliminar o archivar ${item.name}`}
                  onClick={() =>
                    setDeleteDialogState({
                      open: true,
                      ids: [item.id],
                      mode: "delete",
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-6">
      <LogisticsNav />

      <PageHeader
        title="Stock e inventario"
        description="Controlá stock, costos, márgenes, códigos de barras y combos por categoría."
        actions={
          <>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={handleExportCsv}
            >
              <Download aria-hidden="true" className="size-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Restablecer demo
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-xl font-semibold"
              onClick={() => {
                setEditingCategory(null);
                setIsCategorySheetOpen(true);
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              Categoría
            </Button>
            <Button
              className="h-11 rounded-xl font-semibold"
              onClick={() => {
                setEditingItem(null);
                setIsItemSheetOpen(true);
              }}
            >
              <PackagePlus aria-hidden="true" className="size-4" />
              Nuevo artículo
            </Button>
          </>
        }
      />

      {negativeItemsCount > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-red-700 dark:text-red-300"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
            <p>
              <strong>
                {negativeItemsCount} artículo{negativeItemsCount === 1 ? "" : "s"} con stock
                negativo
              </strong>{" "}
              (se vendió sin stock registrado). Cargá el remito de compra o ajustá el stock para
              regularizar.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl border-red-500/40 bg-transparent"
            onClick={() => setOnlyLowStock(true)}
          >
            Filtrar alertas
          </Button>
        </div>
      )}

      <StatCards stats={stats} />

      {/* Pestañas de Categorías con color y contadores */}
      <div className="bg-card space-y-4 rounded-2xl border p-4 shadow-sm sm:p-5">
        <div
          role="tablist"
          aria-label="Filtrar inventario por categoría"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!selectedCategoryId}
            onClick={() => setSelectedCategoryId("")}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors",
              !selectedCategoryId
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background hover:bg-muted text-foreground",
            )}
          >
            Todas
            <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[11px] tabular-nums dark:bg-white/15">
              {baseFilteredItems.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = baseFilteredItems.filter((i) => i.categoryId === cat.id).length;
            const active = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background hover:bg-muted text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] tabular-nums dark:bg-white/15">
                  {count}
                </span>
              </button>
            );
          })}

          {currentCategory && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-9 rounded-lg text-xs"
              onClick={() => {
                setEditingCategory(currentCategory);
                setIsCategorySheetOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
              Editar «{currentCategory.name}»
            </Button>
          )}
        </div>

        {/* Barra de búsqueda avanzada, rango de precios y ordenamiento */}
        <div className="grid gap-3 pt-1 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, código, PLU o precio (ej.: cheddar · >10000 · 5000-15000)"
              aria-label="Buscar en el inventario"
              className="h-11 pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 lg:col-span-3">
            <Input
              inputMode="decimal"
              value={minPriceStr}
              onChange={(e) => setMinPriceStr(e.target.value)}
              placeholder="Precio desde ($)"
              aria-label="Precio desde"
              className="h-11 tabular-nums"
            />
            <Input
              inputMode="decimal"
              value={maxPriceStr}
              onChange={(e) => setMaxPriceStr(e.target.value)}
              placeholder="Precio hasta ($)"
              aria-label="Precio hasta"
              className="h-11 tabular-nums"
            />
          </div>

          <div className="lg:col-span-4">
            <Select
              items={{
                default: "Orden: por categoría",
                name: "Nombre (A → Z)",
                "price-asc": "Precio: menor a mayor",
                "price-desc": "Precio: mayor a menor",
                "stock-asc": "Stock: menor a mayor",
                "margin-desc": "Margen: mayor a menor",
              }}
              value={sortBy}
              onValueChange={(val) => setSortBy((val as SortKey) || "default")}
            >
              <SelectTrigger className="h-11! w-full" aria-label="Ordenar inventario">
                <ArrowUpDown aria-hidden="true" className="text-muted-foreground mr-1.5 size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Orden: por categoría</SelectItem>
                <SelectItem value="name">Nombre (A → Z)</SelectItem>
                <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                <SelectItem value="stock-asc">Stock: menor a mayor</SelectItem>
                <SelectItem value="margin-desc">Margen: mayor a menor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles de vista */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupByCategory((v) => !v)}
              aria-pressed={groupByCategory}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 font-medium transition-colors",
                groupByCategory
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Agrupar por categoría
            </button>

            <button
              type="button"
              onClick={() => setOnlyLowStock((v) => !v)}
              aria-pressed={onlyLowStock}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 font-medium transition-colors",
                onlyLowStock
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <AlertTriangle className="size-3.5" />
              Sólo stock bajo / negativo ({lowStockItemsCount})
            </button>

            {(isAdmin || archivedCount > 0) && (
              <button
                type="button"
                onClick={() => {
                  setShowArchived((v) => !v);
                  setSelectedIds(new Set());
                }}
                aria-pressed={showArchived}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 font-medium transition-colors",
                  showArchived
                    ? "border-primary/40 bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Archive className="size-3.5" />
                Ver archivados ({archivedCount})
              </button>
            )}
          </div>

          <span className="text-muted-foreground font-medium" aria-live="polite">
            {visibleItems.length} artículo{visibleItems.length === 1 ? "" : "s"} visible
            {visibleItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Barra de acciones masivas del Administrador */}
        {isAdmin && activeSelectedIds.length > 0 && !showArchived && (
          <div
            role="region"
            aria-label="Acciones sobre artículos seleccionados"
            className="bg-accent/70 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm"
          >
            <span className="font-semibold">
              {activeSelectedIds.length} artículo
              {activeSelectedIds.length === 1 ? "" : "s"} seleccionado
              {activeSelectedIds.length === 1 ? "" : "s"}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() =>
                  setDeleteDialogState({
                    open: true,
                    ids: activeSelectedIds,
                    mode: "archive",
                  })
                }
              >
                <Archive className="size-3.5" />
                Archivar…
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 rounded-lg"
                onClick={() =>
                  setDeleteDialogState({
                    open: true,
                    ids: activeSelectedIds,
                    mode: "delete",
                  })
                }
              >
                <Trash2 className="size-3.5" />
                Eliminar…
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-lg"
                onClick={() => setSelectedIds(new Set())}
              >
                Quitar selección
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla principal de Inventario */}
      <section
        aria-label="Listado de inventario"
        className="bg-card overflow-hidden rounded-2xl border shadow-sm"
      >
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
              <Boxes aria-hidden="true" className="size-7" />
            </span>
            <div className="max-w-md space-y-1">
              <p className="text-lg font-bold">
                {showArchived
                  ? "No hay artículos archivados"
                  : "Ningún artículo coincide con este filtro"}
              </p>
              <p className="text-muted-foreground text-sm">
                {showArchived
                  ? "Cuando archives productos con historial de ventas o compras, aparecerán acá para que puedas consultarlos o restaurarlos."
                  : "Probá limpiando la búsqueda o agregá un nuevo artículo al inventario."}
              </p>
            </div>
            {(query || selectedCategoryId || minPriceStr || maxPriceStr || onlyLowStock) && (
              <Button
                variant="outline"
                className="mt-1 h-11 rounded-xl"
                onClick={() => {
                  setQuery("");
                  setSelectedCategoryId("");
                  setMinPriceStr("");
                  setMaxPriceStr("");
                  setOnlyLowStock(false);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Seleccionar todos los artículos visibles"
                      className="accent-primary size-4 cursor-pointer rounded"
                    />
                  </TableHead>
                )}
                <TableHead className={cn(!isAdmin && "pl-5")}>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio venta</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Menú</TableHead>
                <TableHead className="pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shouldGroup
                ? categories.map((cat) => {
                    const catItems = visibleItems.filter((i) => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    return (
                      <Fragment key={cat.id}>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell
                            colSpan={isAdmin ? 9 : 8}
                            className="py-2.5 pl-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="size-3 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="font-bold">{cat.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({catItems.length}{" "}
                                  {catItems.length === 1 ? "producto" : "productos"}
                                  {!cat.visible && " · oculta en menú"}
                                  {cat.alcohol && " · alcohol"}
                                  {cat.ageRestricted && " · +18"})
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-lg px-2 text-xs"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setIsCategorySheetOpen(true);
                                }}
                              >
                                Editar categoría
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {catItems.map(renderItemRow)}
                      </Fragment>
                    );
                  })
                : visibleItems.map(renderItemRow)}
            </TableBody>
          </Table>
        )}
      </section>

      <p className="text-muted-foreground text-xs">
        Los cambios de precio, foto y disponibilidad se reflejan al instante en el menú digital.
        Eliminar o archivar es exclusivo del Administrador: los artículos con ventas, compras o
        movimientos se archivan automáticamente para conservar el historial intacto.
      </p>

      <InventoryFormSheet
        open={isItemSheetOpen}
        onOpenChange={setIsItemSheetOpen}
        item={editingItem}
        categories={categories}
        allItems={items}
      />

      <StockAdjustSheet
        item={adjustingItem}
        onOpenChange={(open) => !open && setAdjustingItem(null)}
      />

      <CategoryFormSheet
        open={isCategorySheetOpen}
        onOpenChange={setIsCategorySheetOpen}
        category={editingCategory}
      />

      <DeletePreviewSheet
        open={deleteDialogState.open}
        onOpenChange={(open) =>
          setDeleteDialogState((prev) => ({ ...prev, open }))
        }
        productIds={deleteDialogState.ids}
        mode={deleteDialogState.mode}
        onCompleted={() => setSelectedIds(new Set())}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Restablecer los datos de demostración?"
        description="Se volverán a cargar el catálogo, costos, stock, proveedores, órdenes, presupuestos y mermas de ejemplo."
        confirmLabel="Restablecer demo"
        onConfirm={() => {
          resetLogisticsToDefault();
          setSelectedIds(new Set());
          toast.success("Restableciste los datos de demostración de logística e inventario");
        }}
      />
    </div>
  );
}
