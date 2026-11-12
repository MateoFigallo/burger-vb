import { businessConfig } from "@/config/business.config";
import {
  catalogStore,
  createCategory,
  createProduct,
  getFinalPrice,
  renameCategory,
  resetCatalog,
  setCategoryVisibility,
  updateProduct,
  type Catalog,
} from "@/features/menu";
import {
  createOrder,
  ordersStore,
  type DeliveryMethod,
  type Order,
  type PaymentMethod,
} from "@/features/orders";
import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type {
  CategoryLogisticsMeta,
  DeletePreviewItem,
  GoodsReceipt,
  GoodsReceiptDifference,
  GoodsReceiptItem,
  InventoryCategory,
  InventoryItem,
  IvaCondition,
  KitItem,
  LogisticsState,
  MovementType,
  PartialReturnLine,
  PartialReturnRecord,
  PaymentCondition,
  ProductLogisticsMeta,
  PurchaseOrder,
  PurchaseOrderItem,
  Quote,
  QuoteLine,
  QuoteStatus,
  ReceiptType,
  RefundMethod,
  ShrinkageRecord,
  ShrinkageType,
  StockAdjustmentRecord,
  Supplier,
  SupplierLedgerEntry,
  SupplierPaymentMethod,
  UnitCode,
} from "../types";
import { cleanCuit, isValidCuit } from "./cuit";
import { createDefaultLogisticsState } from "./default-logistics";

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const logisticsStore = createLocalStore<LogisticsState>(
  "burger-vb:logistics-v1",
  createDefaultLogisticsState(),
);

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getDefaultCategoryMeta(categoryId: string, index = 0): CategoryLogisticsMeta {
  const palette = businessConfig.logistics.categoryColors;
  return {
    categoryId,
    color: palette[index % palette.length],
    layout: "grid",
    alcohol: false,
    ageRestricted: false,
  };
}

export function getDefaultProductMeta(productId: string, price = 0): ProductLogisticsMeta {
  return {
    productId,
    cost: price > 0 ? Math.round(price * 0.48) : 0,
    stock: 20,
    unit: "u",
    barcode: "",
    plu: "",
    presentation: "",
    group: "",
    needStock: false,
    archived: false,
    hasHistory: false,
    kit: [],
  };
}

export function calculateKitCost(
  kit: KitItem[],
  productMeta: Record<string, ProductLogisticsMeta>,
): number {
  if (kit.length === 0) return 0;
  return Math.round(
    kit.reduce((sum, item) => {
      const compMeta = productMeta[item.productId];
      return sum + (compMeta ? compMeta.cost * item.quantity : 0);
    }, 0),
  );
}

export function calculateKitStock(
  kit: KitItem[],
  productMeta: Record<string, ProductLogisticsMeta>,
): number {
  if (kit.length === 0) return 0;
  const counts = kit.map((item) => {
    const compMeta = productMeta[item.productId];
    if (!compMeta || item.quantity <= 0) return 0;
    return Math.floor(compMeta.stock / item.quantity);
  });
  return counts.length > 0 ? Math.min(...counts) : 0;
}

export function buildInventoryCategories(
  catalog: Catalog,
  state: LogisticsState,
): InventoryCategory[] {
  return catalog.categories.map((category, index) => {
    const meta =
      state.categoryMeta[category.id] ?? getDefaultCategoryMeta(category.id, index);
    return {
      ...category,
      color: meta.color,
      layout: meta.layout,
      alcohol: meta.alcohol,
      ageRestricted: meta.ageRestricted,
    };
  });
}

export function buildInventoryItems(
  catalog: Catalog,
  state: LogisticsState,
): InventoryItem[] {
  const categories = buildInventoryCategories(catalog, state);
  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

  return catalog.products.map((product) => {
    const meta =
      state.productMeta[product.id] ?? getDefaultProductMeta(product.id, product.price);
    const category = categoryMap.get(product.categoryId);
    const isKit = meta.kit.length > 0;
    const effectiveCost =
      isKit && meta.cost <= 0
        ? calculateKitCost(meta.kit, state.productMeta)
        : isKit
          ? calculateKitCost(meta.kit, state.productMeta) || meta.cost
          : meta.cost;
    const effectiveStock = isKit
      ? calculateKitStock(meta.kit, state.productMeta)
      : meta.stock;

    const finalPrice = getFinalPrice(product);
    const marginPercent =
      finalPrice > 0 && effectiveCost > 0
        ? round1(((finalPrice - effectiveCost) / finalPrice) * 100)
        : null;
    const markupPercent =
      effectiveCost > 0 && finalPrice > 0
        ? round1(((finalPrice - effectiveCost) / effectiveCost) * 100)
        : null;

    const threshold = businessConfig.logistics.lowStockThreshold;
    const stockStatus: InventoryItem["stockStatus"] =
      effectiveStock < 0
        ? "neg"
        : effectiveStock === 0
          ? "zero"
          : effectiveStock <= threshold
            ? "low"
            : "ok";

    return {
      ...product,
      cost: meta.cost,
      stock: meta.stock,
      unit: meta.unit,
      barcode: meta.barcode,
      plu: meta.plu,
      presentation: meta.presentation,
      group: meta.group,
      needStock: meta.needStock,
      archived: meta.archived,
      archivedAt: meta.archivedAt,
      archiveReason: meta.archiveReason,
      hasHistory: meta.hasHistory,
      kit: meta.kit,
      isSample: meta.isSample,
      categoryName: category?.name ?? "Sin categoría",
      categoryColor: category?.color ?? "#64748b",
      effectiveCost,
      effectiveStock,
      marginPercent,
      markupPercent,
      isKit,
      stockStatus,
    };
  });
}

// ============================================================================
// 1. STOCK E INVENTARIO (PRODUCTOS, CATEGORÍAS, AJUSTES Y BORRADO PROTEGIDO)
// ============================================================================

export type SaveInventoryCategoryInput = {
  id?: string;
  name: string;
  visible: boolean;
  color: string;
  layout: "grid" | "rows" | "bodegas";
  alcohol: boolean;
  ageRestricted: boolean;
};

export function saveInventoryCategory(
  input: SaveInventoryCategoryInput,
): ServiceResult<InventoryCategory> {
  const trimmedName = input.name.trim();
  if (trimmedName.length < 2) {
    return { ok: false, error: "El nombre de la categoría es muy corto." };
  }

  let categoryId = input.id;
  if (categoryId) {
    const res = renameCategory(categoryId, trimmedName);
    if (!res.ok) return { ok: false, error: res.error };
    setCategoryVisibility(categoryId, input.visible);
  } else {
    const res = createCategory(trimmedName);
    if (!res.ok) return { ok: false, error: res.error };
    categoryId = res.category.id;
    if (!input.visible) setCategoryVisibility(categoryId, false);
  }

  const finalId = categoryId;
  logisticsStore.set((prev) => ({
    ...prev,
    categoryMeta: {
      ...prev.categoryMeta,
      [finalId]: {
        categoryId: finalId,
        color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : "#e11d48",
        layout: input.layout,
        alcohol: input.alcohol,
        ageRestricted: input.ageRestricted,
      },
    },
  }));

  const updated = buildInventoryCategories(
    catalogStore.getSnapshot(),
    logisticsStore.getSnapshot(),
  ).find((cat) => cat.id === finalId);

  if (!updated) {
    return { ok: false, error: "No se pudo guardar la categoría." };
  }
  return { ok: true, value: updated };
}

export type SaveInventoryProductInput = {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  discountPercent?: number;
  badge?: string;
  image: string;
  available: boolean;
  featured: boolean;
  cost: number;
  stock: number;
  unit: UnitCode;
  barcode: string;
  plu: string;
  presentation: string;
  group: string;
  needStock: boolean;
  kit: KitItem[];
};

export function saveInventoryProduct(
  input: SaveInventoryProductInput,
): ServiceResult<InventoryItem> {
  const name = input.name.trim();
  if (name.length < 2) {
    return { ok: false, error: "Ingresá el nombre del artículo." };
  }
  const catalog = catalogStore.getSnapshot();
  if (!catalog.categories.some((c) => c.id === input.categoryId)) {
    return { ok: false, error: "Elegí una categoría válida." };
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { ok: false, error: "El precio de venta debe ser mayor a cero." };
  }
  if (!Number.isFinite(input.cost) || input.cost < 0) {
    return { ok: false, error: "El costo unitario no puede ser negativo." };
  }
  if (!Number.isFinite(input.stock)) {
    return { ok: false, error: "El stock ingresado no es válido." };
  }

  const state = logisticsStore.getSnapshot();
  const barcode = input.barcode.trim();
  if (barcode) {
    const duplicateBarcode = Object.values(state.productMeta).find(
      (meta) =>
        !meta.archived &&
        meta.barcode &&
        meta.barcode.toLowerCase() === barcode.toLowerCase() &&
        meta.productId !== input.id,
    );
    if (duplicateBarcode) {
      const owner = catalog.products.find((p) => p.id === duplicateBarcode.productId);
      return {
        ok: false,
        error: `Ese código de barras ya lo usa «${owner?.name ?? duplicateBarcode.productId}».`,
      };
    }
  }

  const plu = input.plu.trim();
  if (plu) {
    if (!/^\d{1,5}$/.test(plu)) {
      return { ok: false, error: "El código PLU debe tener entre 1 y 5 dígitos numéricos." };
    }
    const duplicatePlu = Object.values(state.productMeta).find(
      (meta) =>
        !meta.archived &&
        meta.plu &&
        Number(meta.plu) === Number(plu) &&
        meta.productId !== input.id,
    );
    if (duplicatePlu) {
      const owner = catalog.products.find((p) => p.id === duplicatePlu.productId);
      return {
        ok: false,
        error: `Ese código PLU ya lo usa «${owner?.name ?? duplicatePlu.productId}».`,
      };
    }
  }

  const cleanedKit = input.kit
    .filter((item) => item.productId && item.productId !== input.id && item.quantity > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: round3(item.quantity),
    }));

  const uniqueKitIds = new Set(cleanedKit.map((k) => k.productId));
  if (uniqueKitIds.size !== cleanedKit.length) {
    return {
      ok: false,
      error: "Un combo no puede tener el mismo componente repetido: sumá las cantidades.",
    };
  }

  let productId = input.id;
  if (productId) {
    updateProduct(productId, {
      name,
      description: input.description.trim(),
      categoryId: input.categoryId,
      price: Math.round(input.price),
      discountPercent: input.discountPercent,
      badge: input.badge?.trim() || undefined,
      image: input.image,
      available: input.available,
      featured: input.featured,
    });
  } else {
    const created = createProduct({
      name,
      description: input.description.trim(),
      categoryId: input.categoryId,
      price: Math.round(input.price),
      discountPercent: input.discountPercent,
      badge: input.badge?.trim() || undefined,
      image: input.image,
      available: input.available,
      featured: input.featured,
    });
    productId = created.id;
  }

  const finalId = productId;
  const previousMeta = state.productMeta[finalId];
  const computedCost =
    cleanedKit.length > 0 && input.cost <= 0
      ? calculateKitCost(cleanedKit, state.productMeta)
      : Math.round(input.cost);

  logisticsStore.set((prev) => ({
    ...prev,
    productMeta: {
      ...prev.productMeta,
      [finalId]: {
        productId: finalId,
        cost: computedCost,
        stock: cleanedKit.length > 0 ? 0 : round3(input.stock),
        unit: cleanedKit.length > 0 ? "u" : input.unit,
        barcode,
        plu,
        presentation: input.presentation.trim(),
        group: input.group.trim(),
        needStock: input.needStock,
        archived: previousMeta?.archived ?? false,
        archivedAt: previousMeta?.archivedAt,
        archiveReason: previousMeta?.archiveReason,
        hasHistory:
          (previousMeta?.hasHistory ?? false) ||
          (previousMeta !== undefined && previousMeta.stock !== round3(input.stock)),
        kit: cleanedKit,
      },
    },
  }));

  const saved = buildInventoryItems(
    catalogStore.getSnapshot(),
    logisticsStore.getSnapshot(),
  ).find((item) => item.id === finalId);

  if (!saved) {
    return { ok: false, error: "No se pudo guardar el artículo." };
  }
  return { ok: true, value: saved };
}

export type AdjustStockInput = {
  productId: string;
  delta: number;
  type: MovementType;
  reason: string;
  user?: string;
};

export function adjustProductStock(
  input: AdjustStockInput,
): ServiceResult<StockAdjustmentRecord> {
  const catalog = catalogStore.getSnapshot();
  const product = catalog.products.find((p) => p.id === input.productId);
  if (!product) {
    return { ok: false, error: "El artículo no existe." };
  }

  const state = logisticsStore.getSnapshot();
  const meta =
    state.productMeta[product.id] ?? getDefaultProductMeta(product.id, product.price);

  if (meta.kit.length > 0) {
    return {
      ok: false,
      error:
        "Un combo no tiene stock propio: ajustá el stock de cada uno de los productos que lo componen.",
    };
  }

  if (!Number.isFinite(input.delta) || input.delta === 0) {
    return { ok: false, error: "Ingresá una cantidad distinta de cero." };
  }

  const trimmedReason = input.reason.trim();
  if (trimmedReason.length < 3) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 3 caracteres)." };
  }

  const normalizedDelta =
    input.type === "ajuste" ? round3(input.delta) : -Math.abs(round3(input.delta));
  const nextStock = round3(meta.stock + normalizedDelta);

  if (nextStock < 0 && meta.needStock && input.type === "ajuste") {
    return {
      ok: false,
      error:
        "Este artículo exige stock disponible: no puede quedar con stock negativo en un ajuste.",
    };
  }

  const nowIso = new Date().toISOString();
  const userName = input.user?.trim() || "Administrador";

  const adjustment: StockAdjustmentRecord = {
    id: createId("adj"),
    createdAt: nowIso,
    productId: product.id,
    productName: product.name,
    categoryId: product.categoryId,
    delta: normalizedDelta,
    previousStock: meta.stock,
    newStock: nextStock,
    type: input.type,
    reason: trimmedReason,
    user: userName,
  };

  const newShrinkage: ShrinkageRecord | null =
    input.type !== "ajuste"
      ? {
          id: createId("mer"),
          createdAt: nowIso,
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          quantity: normalizedDelta,
          unit: meta.unit,
          unitCost: meta.cost,
          totalValue: Math.round(Math.abs(normalizedDelta) * meta.cost),
          type: input.type as ShrinkageType,
          reason: trimmedReason,
          user: userName,
        }
      : null;

  logisticsStore.set((prev) => ({
    ...prev,
    productMeta: {
      ...prev.productMeta,
      [product.id]: {
        ...meta,
        stock: nextStock,
        hasHistory: true,
      },
    },
    adjustments: [adjustment, ...prev.adjustments],
    shrinkages: newShrinkage ? [newShrinkage, ...prev.shrinkages] : prev.shrinkages,
  }));

  return { ok: true, value: adjustment };
}

/**
 * Vista previa de eliminación protegida (`delPreview` 4.16 de `raveV2`).
 */
export function getDeletePreview(productIds: string[]): DeletePreviewItem[] {
  const uniqueIds = [...new Set(productIds)].filter(Boolean);
  const catalog = catalogStore.getSnapshot();
  const state = logisticsStore.getSnapshot();
  const orders = ordersStore.getSnapshot();

  return uniqueIds.map((productId) => {
    const product = catalog.products.find((p) => p.id === productId);
    const meta =
      state.productMeta[productId] ??
      getDefaultProductMeta(productId, product?.price ?? 0);

    const refs: string[] = [];

    const orderCount = orders.filter((order) =>
      order.items.some((item) => item.productId === productId),
    ).length;
    if (orderCount > 0) {
      refs.push(`${orderCount} pedido${orderCount === 1 ? "" : "s"}`);
    }

    const poCount = state.purchaseOrders.filter((po) =>
      po.items.some((item) => item.productId === productId),
    ).length;
    const receiptCount = state.goodsReceipts.filter((rc) =>
      rc.items.some((item) => item.productId === productId),
    ).length;
    if (poCount > 0 || receiptCount > 0) {
      refs.push("órdenes de compra o ingresos de mercadería");
    }

    const quoteCount = state.quotes.filter((qt) =>
      qt.lines.some((line) => line.productId === productId),
    ).length;
    if (quoteCount > 0) {
      refs.push(`${quoteCount} presupuesto${quoteCount === 1 ? "" : "s"}`);
    }

    const inCombo = Object.values(state.productMeta).some((m) =>
      m.kit.some((k) => k.productId === productId),
    );
    if (inCombo) {
      refs.push("forma parte de un combo");
    }

    const hasMovs =
      meta.hasHistory ||
      state.adjustments.some((a) => a.productId === productId) ||
      state.shrinkages.some((s) => s.productId === productId);
    if (hasMovs) {
      refs.push("ajustes o movimientos de stock");
    }

    const status = refs.length > 0 ? "archivable" : "eliminable";
    return {
      productId,
      productName: product?.name ?? "(Artículo inexistente)",
      stock: meta.stock,
      unit: meta.unit,
      status,
      references: refs,
      reasonText:
        refs.length > 0
          ? `Tiene ${refs.join(", ")}: se archiva para conservar el historial.`
          : "Sin historial: se puede eliminar definitivamente.",
    };
  });
}

export type DeleteOrArchiveInput = {
  productIds: string[];
  mode: "delete" | "archive";
  archiveReferencedToo: boolean;
  confirmationWord?: string;
  reason: string;
};

export type DeleteOrArchiveResult = {
  batchCode: string;
  items: { productId: string; productName: string; outcome: "eliminado" | "archivado" | "sin cambios" }[];
};

export function executeDeleteOrArchive(
  input: DeleteOrArchiveInput,
): ServiceResult<DeleteOrArchiveResult> {
  const trimmedReason = input.reason.trim();
  if (trimmedReason.length < 3) {
    return { ok: false, error: "El motivo es obligatorio (mínimo 3 letras)." };
  }

  const preview = getDeletePreview(input.productIds);
  if (preview.length === 0) {
    return { ok: false, error: "No hay artículos seleccionados." };
  }

  const hasDeletable =
    input.mode === "delete" && preview.some((item) => item.status === "eliminable");
  if (hasDeletable && input.confirmationWord?.trim().toUpperCase() !== "ELIMINAR") {
    return {
      ok: false,
      error: "Escribí ELIMINAR para confirmar el borrado definitivo.",
    };
  }

  const batchCode = `L-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const nowIso = new Date().toISOString();
  const outcomes: DeleteOrArchiveResult["items"] = [];
  const toDeleteIds = new Set<string>();
  const toArchiveIds = new Set<string>();

  for (const item of preview) {
    if (item.status === "eliminable" && input.mode === "delete") {
      toDeleteIds.add(item.productId);
      outcomes.push({
        productId: item.productId,
        productName: item.productName,
        outcome: "eliminado",
      });
    } else if (
      input.mode === "archive" ||
      (input.archiveReferencedToo && item.status === "archivable")
    ) {
      toArchiveIds.add(item.productId);
      outcomes.push({
        productId: item.productId,
        productName: item.productName,
        outcome: "archivado",
      });
    } else {
      outcomes.push({
        productId: item.productId,
        productName: item.productName,
        outcome: "sin cambios",
      });
    }
  }

  if (toDeleteIds.size > 0 || toArchiveIds.size > 0) {
    catalogStore.set((catalog) => ({
      ...catalog,
      products: catalog.products
        .filter((p) => !toDeleteIds.has(p.id))
        .map((p) => (toArchiveIds.has(p.id) ? { ...p, available: false, featured: false } : p)),
    }));

    logisticsStore.set((prev) => {
      const nextMeta = { ...prev.productMeta };
      for (const id of toDeleteIds) {
        delete nextMeta[id];
      }
      for (const id of toArchiveIds) {
        const current = nextMeta[id] ?? getDefaultProductMeta(id);
        nextMeta[id] = {
          ...current,
          archived: true,
          archivedAt: nowIso,
          archiveReason: `[${batchCode}] ${trimmedReason}`,
        };
      }
      return { ...prev, productMeta: nextMeta };
    });
  }

  return { ok: true, value: { batchCode, items: outcomes } };
}

export function restoreArchivedProduct(productId: string): ServiceResult<InventoryItem> {
  const catalog = catalogStore.getSnapshot();
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    return { ok: false, error: "El artículo no existe." };
  }

  const state = logisticsStore.getSnapshot();
  const meta = state.productMeta[productId];
  if (!meta?.archived) {
    return { ok: false, error: "El artículo no está archivado." };
  }

  if (meta.barcode) {
    const dupBarcode = Object.values(state.productMeta).some(
      (other) =>
        other.productId !== productId &&
        !other.archived &&
        other.barcode &&
        other.barcode.toLowerCase() === meta.barcode.toLowerCase(),
    );
    if (dupBarcode) {
      return {
        ok: false,
        error: "No se puede restaurar: otro artículo activo usa el mismo código de barras.",
      };
    }
  }

  if (meta.plu) {
    const dupPlu = Object.values(state.productMeta).some(
      (other) =>
        other.productId !== productId &&
        !other.archived &&
        other.plu &&
        Number(other.plu) === Number(meta.plu),
    );
    if (dupPlu) {
      return {
        ok: false,
        error: "No se puede restaurar: otro artículo activo usa el mismo PLU.",
      };
    }
  }

  updateProduct(productId, { available: true });
  logisticsStore.set((prev) => ({
    ...prev,
    productMeta: {
      ...prev.productMeta,
      [productId]: {
        ...meta,
        archived: false,
        archivedAt: undefined,
        archiveReason: undefined,
      },
    },
  }));

  const restored = buildInventoryItems(
    catalogStore.getSnapshot(),
    logisticsStore.getSnapshot(),
  ).find((item) => item.id === productId);

  if (!restored) {
    return { ok: false, error: "No se pudo restaurar el artículo." };
  }
  return { ok: true, value: restored };
}

// ============================================================================
// 2. MERMAS Y DEVOLUCIONES PARCIALES
// ============================================================================

export function getReturnedQuantityForOrderLine(orderId: string, lineIndex: number): number {
  const state = logisticsStore.getSnapshot();
  return state.partialReturns
    .filter((ret) => ret.orderId === orderId)
    .reduce(
      (sum, ret) =>
        sum +
        ret.lines
          .filter((line) => line.lineIndex === lineIndex)
          .reduce((acc, line) => acc + line.quantity, 0),
      0,
    );
}

export type CreatePartialReturnInput = {
  orderId: string;
  lines: { lineIndex: number; quantity: number }[];
  refundMethod: RefundMethod;
  reason: string;
  user?: string;
};

export function createPartialReturn(
  input: CreatePartialReturnInput,
): ServiceResult<PartialReturnRecord> {
  const orders = ordersStore.getSnapshot();
  const order: Order | undefined = orders.find((o) => o.id === input.orderId);
  if (!order) {
    return { ok: false, error: "El pedido seleccionado no existe." };
  }
  if (order.status === "cancelado") {
    return { ok: false, error: "No se puede registrar una devolución sobre un pedido cancelado." };
  }

  const trimmedReason = input.reason.trim();
  if (trimmedReason.length < 3) {
    return { ok: false, error: "Escribí el motivo de la devolución (mínimo 3 letras)." };
  }

  const validLines = input.lines.filter((l) => l.quantity > 0);
  if (validLines.length === 0) {
    return { ok: false, error: "Elegí al menos un producto y la cantidad que se devuelve." };
  }

  const returnLines: PartialReturnLine[] = [];
  let totalRefund = 0;

  for (const reqLine of validLines) {
    const orderItem = order.items[reqLine.lineIndex];
    if (!orderItem) {
      return { ok: false, error: "Uno de los renglones seleccionados no existe en el pedido." };
    }
    const alreadyReturned = getReturnedQuantityForOrderLine(order.id, reqLine.lineIndex);
    const remaining = round3(orderItem.quantity - alreadyReturned);
    if (reqLine.quantity > remaining + 1e-9) {
      return {
        ok: false,
        error: `De «${orderItem.name}» se pueden devolver hasta ${remaining} unidad(es).`,
      };
    }

    const amount = Math.round(orderItem.price * reqLine.quantity);
    returnLines.push({
      lineIndex: reqLine.lineIndex,
      productId: orderItem.productId,
      productName: orderItem.name,
      quantity: round3(reqLine.quantity),
      unitPrice: orderItem.price,
      amount,
    });
    totalRefund += amount;
  }

  if (totalRefund <= 0) {
    return { ok: false, error: "El importe a reintegrar debe ser mayor a cero." };
  }

  const record: PartialReturnRecord = {
    id: createId("ret"),
    createdAt: new Date().toISOString(),
    orderId: order.id,
    orderNumber: order.id,
    customerId: order.customerId ?? null,
    customerName: order.customerName,
    lines: returnLines,
    totalRefund,
    refundMethod: input.refundMethod,
    reason: trimmedReason,
    user: input.user?.trim() || "Administrador",
  };

  logisticsStore.set((prev) => {
    const nextMeta = { ...prev.productMeta };

    for (const line of returnLines) {
      const meta = nextMeta[line.productId];
      if (!meta) continue;

      if (meta.kit.length > 0) {
        for (const comp of meta.kit) {
          const compMeta = nextMeta[comp.productId];
          if (compMeta) {
            nextMeta[comp.productId] = {
              ...compMeta,
              stock: round3(compMeta.stock + line.quantity * comp.quantity),
              hasHistory: true,
            };
          }
        }
      } else {
        nextMeta[line.productId] = {
          ...meta,
          stock: round3(meta.stock + line.quantity),
          hasHistory: true,
        };
      }
    }

    return {
      ...prev,
      productMeta: nextMeta,
      partialReturns: [record, ...prev.partialReturns],
    };
  });

  return { ok: true, value: record };
}

// ============================================================================
// 3. PRESUPUESTOS (COTIZACIONES SIN DESCUENTO DE STOCK HASTA CONVERTIR)
// ============================================================================

export function getQuoteEffectiveStatus(quote: Quote, nowMs = Date.now()): QuoteStatus {
  if (quote.status === "convertido" || quote.status === "anulado") {
    return quote.status;
  }
  const expiresMs = new Date(quote.expiresAt).getTime();
  return Number.isFinite(expiresMs) && nowMs > expiresMs ? "vencido" : "vigente";
}

export type CreateQuoteInput = {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  validDays: number;
  notes: string;
  lines: {
    productId: string;
    quantity: number;
    unitPrice?: number;
  }[];
  createdBy?: string;
};

export function createQuote(input: CreateQuoteInput): ServiceResult<Quote> {
  const days = Math.round(input.validDays);
  const { quoteMinDays, quoteMaxDays } = businessConfig.logistics;
  if (!Number.isInteger(days) || days < quoteMinDays || days > quoteMaxDays) {
    return {
      ok: false,
      error: `La validez del presupuesto debe ser de entre ${quoteMinDays} y ${quoteMaxDays} días.`,
    };
  }

  const validLines = input.lines.filter((l) => l.productId && l.quantity > 0);
  if (validLines.length === 0) {
    return { ok: false, error: "Agregá al menos un producto al presupuesto." };
  }

  const catalog = catalogStore.getSnapshot();
  const state = logisticsStore.getSnapshot();
  const builtLines: QuoteLine[] = [];

  for (const item of validLines) {
    const product = catalog.products.find((p) => p.id === item.productId);
    if (!product) {
      return { ok: false, error: "Uno de los productos seleccionados no existe." };
    }
    const meta =
      state.productMeta[product.id] ?? getDefaultProductMeta(product.id, product.price);
    const listPrice = getFinalPrice(product);
    const unitPrice =
      item.unitPrice !== undefined && item.unitPrice > 0
        ? Math.round(item.unitPrice)
        : listPrice;

    if (unitPrice <= 0) {
      return { ok: false, error: `El precio de «${product.name}» debe ser mayor a cero.` };
    }

    builtLines.push({
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      unit: meta.unit,
      quantity: round3(item.quantity),
      unitPrice,
      listPrice,
      unitCost:
        meta.kit.length > 0
          ? calculateKitCost(meta.kit, state.productMeta) || meta.cost
          : meta.cost,
    });
  }

  const total = builtLines.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitPrice),
    0,
  );
  const nextSeq = state.sequences.quote + 1;
  const nowMs = Date.now();

  const quote: Quote = {
    id: createId("qt"),
    number: `P1-${nextSeq}`,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + days * 86_400_000).toISOString(),
    validDays: days,
    customerId: input.customerId ?? null,
    customerName: input.customerName.trim() || "Cliente consumidor final",
    customerPhone: input.customerPhone?.trim() || undefined,
    lines: builtLines,
    total,
    notes: input.notes.trim().slice(0, 200),
    status: "vigente",
    createdBy: input.createdBy?.trim() || "Administrador",
  };

  logisticsStore.set((prev) => ({
    ...prev,
    quotes: [quote, ...prev.quotes],
    sequences: {
      ...prev.sequences,
      quote: nextSeq,
    },
  }));

  return { ok: true, value: quote };
}

export type QuoteConversionCheck = {
  isExpired: boolean;
  hasPriceChanges: boolean;
  changedItems: { productName: string; quotedPrice: number; currentPrice: number }[];
  quotedTotal: number;
  currentTotal: number;
};

export function inspectQuoteForConversion(quoteId: string): QuoteConversionCheck | null {
  const state = logisticsStore.getSnapshot();
  const quote = state.quotes.find((q) => q.id === quoteId);
  if (!quote) return null;

  const catalog = catalogStore.getSnapshot();
  const effectiveStatus = getQuoteEffectiveStatus(quote);
  const changedItems: QuoteConversionCheck["changedItems"] = [];
  let currentTotal = 0;

  for (const line of quote.lines) {
    const product = catalog.products.find((p) => p.id === line.productId);
    const currentPrice = product ? getFinalPrice(product) : line.unitPrice;
    currentTotal += Math.round(line.quantity * currentPrice);
    if (product && currentPrice !== line.unitPrice) {
      changedItems.push({
        productName: line.productName,
        quotedPrice: line.unitPrice,
        currentPrice,
      });
    }
  }

  return {
    isExpired: effectiveStatus === "vencido",
    hasPriceChanges: changedItems.length > 0,
    changedItems,
    quotedTotal: quote.total,
    currentTotal,
  };
}

export type ConvertQuoteToOrderInput = {
  quoteId: string;
  useCurrentPrices: boolean;
  deliveryMethod: DeliveryMethod;
  address?: string;
  paymentMethod: PaymentMethod;
};

export function convertQuoteToOrder(
  input: ConvertQuoteToOrderInput,
): ServiceResult<{ quote: Quote; order: Order }> {
  const state = logisticsStore.getSnapshot();
  const quote = state.quotes.find((q) => q.id === input.quoteId);
  if (!quote) {
    return { ok: false, error: "El presupuesto no existe." };
  }

  const effectiveStatus = getQuoteEffectiveStatus(quote);
  if (effectiveStatus === "convertido" || effectiveStatus === "anulado") {
    return {
      ok: false,
      error: `Este presupuesto ya está ${effectiveStatus}.`,
    };
  }

  const catalog = catalogStore.getSnapshot();
  const orderItems = quote.lines.map((line) => {
    const product = catalog.products.find((p) => p.id === line.productId);
    const price =
      input.useCurrentPrices && product ? getFinalPrice(product) : line.unitPrice;
    return {
      productId: line.productId,
      name: line.productName,
      price,
      quantity: line.quantity,
    };
  });

  const total = orderItems.reduce((sum, item) => sum + Math.round(item.price * item.quantity), 0);

  const createdOrder = createOrder({
    customerName: quote.customerName || "Cliente",
    customerPhone: quote.customerPhone,
    customerId: quote.customerId ?? null,
    deliveryMethod: input.deliveryMethod,
    address:
      input.deliveryMethod === "delivery"
        ? input.address?.trim() || "Dirección acordada en presupuesto"
        : "Retiro en el local",
    paymentMethod: input.paymentMethod,
    notes: `Convertido desde presupuesto ${quote.number}${quote.notes ? ` · ${quote.notes}` : ""}`,
    items: orderItems,
    total,
  });

  const nowIso = new Date().toISOString();
  let updatedQuote: Quote = quote;

  logisticsStore.set((prev) => {
    const nextMeta = { ...prev.productMeta };

    for (const item of orderItems) {
      const meta = nextMeta[item.productId];
      if (!meta) continue;

      if (meta.kit.length > 0) {
        for (const comp of meta.kit) {
          const compMeta = nextMeta[comp.productId];
          if (compMeta) {
            nextMeta[comp.productId] = {
              ...compMeta,
              stock: round3(compMeta.stock - item.quantity * comp.quantity),
              hasHistory: true,
            };
          }
        }
      } else {
        nextMeta[item.productId] = {
          ...meta,
          stock: round3(meta.stock - item.quantity),
          hasHistory: true,
        };
      }
    }

    const nextQuotes = prev.quotes.map((q) => {
      if (q.id !== quote.id) return q;
      updatedQuote = {
        ...q,
        status: "convertido",
        convertedOrderId: createdOrder.id,
        convertedAt: nowIso,
      };
      return updatedQuote;
    });

    return {
      ...prev,
      productMeta: nextMeta,
      quotes: nextQuotes,
    };
  });

  return { ok: true, value: { quote: updatedQuote, order: createdOrder } };
}

export function voidQuote(quoteId: string, reason: string): ServiceResult<Quote> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Escribí el motivo de anulación (mínimo 3 letras)." };
  }

  const state = logisticsStore.getSnapshot();
  const quote = state.quotes.find((q) => q.id === quoteId);
  if (!quote) {
    return { ok: false, error: "El presupuesto no existe." };
  }
  if (quote.status === "convertido") {
    return { ok: false, error: "No se puede anular un presupuesto que ya fue convertido." };
  }

  const nextQuote: Quote = {
    ...quote,
    status: "anulado",
    voidReason: trimmed,
  };

  logisticsStore.set((prev) => ({
    ...prev,
    quotes: prev.quotes.map((q) => (q.id === quoteId ? nextQuote : q)),
  }));

  return { ok: true, value: nextQuote };
}

// ============================================================================
// 4. PROVEEDORES, ÓRDENES DE COMPRA, RECEPCIÓN DE REMITOS Y CUENTA CORRIENTE
// ============================================================================

export type SaveSupplierInput = {
  id?: string;
  businessName: string;
  cuit: string;
  ivaCondition: IvaCondition;
  email: string;
  phone: string;
  address: string;
  active?: boolean;
};

export function saveSupplier(input: SaveSupplierInput): ServiceResult<Supplier> {
  const businessName = input.businessName.trim();
  if (businessName.length < 2 || businessName.length > 120) {
    return {
      ok: false,
      error: "La razón social es obligatoria (entre 2 y 120 caracteres).",
    };
  }

  const cuit = cleanCuit(input.cuit);
  if (!isValidCuit(cuit)) {
    return {
      ok: false,
      error:
        "El CUIT no es válido: revisá los 11 dígitos (el último es el dígito verificador Módulo 11).",
    };
  }

  if (!businessConfig.logistics.ivaConditions.includes(input.ivaCondition)) {
    return { ok: false, error: "Elegí una condición frente al IVA válida." };
  }

  const email = input.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "El correo electrónico no tiene un formato válido." };
  }

  const state = logisticsStore.getSnapshot();
  const duplicateCuit = state.suppliers.find(
    (s) => s.cuit === cuit && s.id !== input.id,
  );
  if (duplicateCuit) {
    return {
      ok: false,
      error: `Ya existe un proveedor registrado con ese CUIT (${duplicateCuit.businessName}).`,
    };
  }

  if (input.id) {
    const existing = state.suppliers.find((s) => s.id === input.id);
    if (!existing) {
      return { ok: false, error: "El proveedor que intentás editar no existe." };
    }
    const updated: Supplier = {
      ...existing,
      businessName,
      cuit,
      ivaCondition: input.ivaCondition,
      email,
      phone: input.phone.trim().slice(0, 40),
      address: input.address.trim().slice(0, 200),
      active: input.active ?? existing.active,
    };

    logisticsStore.set((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === updated.id ? updated : s)),
    }));
    return { ok: true, value: updated };
  }

  const created: Supplier = {
    id: createId("sup"),
    businessName,
    cuit,
    ivaCondition: input.ivaCondition,
    email,
    phone: input.phone.trim().slice(0, 40),
    address: input.address.trim().slice(0, 200),
    balance: 0,
    active: true,
    createdAt: new Date().toISOString(),
  };

  logisticsStore.set((prev) => ({
    ...prev,
    suppliers: [created, ...prev.suppliers],
  }));

  return { ok: true, value: created };
}

export type SavePurchaseOrderInput = {
  id?: string;
  supplierId: string;
  status: "Borrador" | "Solicitada";
  notes: string;
  items: {
    productId: string;
    quantity: number;
    agreedUnitCost: number;
  }[];
};

export function savePurchaseOrder(
  input: SavePurchaseOrderInput,
): ServiceResult<PurchaseOrder> {
  const state = logisticsStore.getSnapshot();
  const supplier = state.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier) {
    return { ok: false, error: "Elegí un proveedor válido." };
  }
  if (!supplier.active) {
    return { ok: false, error: "El proveedor está archivado y no admite órdenes nuevas." };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Agregá al menos un producto a la orden de compra." };
  }

  const catalog = catalogStore.getSnapshot();
  const seenProducts = new Set<string>();
  const builtItems: PurchaseOrderItem[] = [];
  let total = 0;

  for (let i = 0; i < input.items.length; i++) {
    const raw = input.items[i];
    const rowLabel = `Renglón ${i + 1}: `;
    if (!raw.productId) {
      return { ok: false, error: `${rowLabel}elegí un producto de la lista.` };
    }
    if (seenProducts.has(raw.productId)) {
      return {
        ok: false,
        error: `${rowLabel}ese producto está repetido; sumá las cantidades en un solo renglón.`,
      };
    }
    seenProducts.add(raw.productId);

    if (!Number.isFinite(raw.quantity) || raw.quantity <= 0) {
      return { ok: false, error: `${rowLabel}ingresá una cantidad mayor a cero.` };
    }
    if (!Number.isFinite(raw.agreedUnitCost) || raw.agreedUnitCost < 0) {
      return { ok: false, error: `${rowLabel}el costo pactado no puede ser negativo.` };
    }
    if (input.status === "Solicitada" && raw.agreedUnitCost <= 0) {
      return {
        ok: false,
        error: `${rowLabel}para solicitar la orden cargá el costo pactado de todos los productos (o guardala como borrador).`,
      };
    }

    const product = catalog.products.find((p) => p.id === raw.productId);
    if (!product) {
      return { ok: false, error: `${rowLabel}el producto no existe en el catálogo.` };
    }
    const meta = state.productMeta[product.id];
    if (meta?.archived) {
      return { ok: false, error: `${rowLabel}el producto «${product.name}» está archivado.` };
    }

    const qty = round3(raw.quantity);
    const cost = Math.round(raw.agreedUnitCost);
    builtItems.push({
      productId: product.id,
      productName: product.name,
      quantity: qty,
      agreedUnitCost: cost,
    });
    total += Math.round(qty * cost);
  }

  if (input.id) {
    const existing = state.purchaseOrders.find((po) => po.id === input.id);
    if (!existing) {
      return { ok: false, error: "La orden de compra no existe." };
    }
    if (existing.status !== "Borrador") {
      return {
        ok: false,
        error: `Sólo se puede editar una orden en Borrador (esta orden está ${existing.status}).`,
      };
    }
    const updated: PurchaseOrder = {
      ...existing,
      status: input.status,
      items: builtItems,
      total,
      notes: input.notes.trim().slice(0, 500),
    };

    logisticsStore.set((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((po) => (po.id === updated.id ? updated : po)),
    }));
    return { ok: true, value: updated };
  }

  const nextNum = state.sequences.purchaseOrder + 1;
  const created: PurchaseOrder = {
    id: createId("po"),
    number: nextNum,
    code: `OC-${String(nextNum).padStart(4, "0")}`,
    supplierId: supplier.id,
    status: input.status,
    createdAt: new Date().toISOString(),
    items: builtItems,
    total,
    notes: input.notes.trim().slice(0, 500),
  };

  logisticsStore.set((prev) => ({
    ...prev,
    purchaseOrders: [created, ...prev.purchaseOrders],
    sequences: {
      ...prev.sequences,
      purchaseOrder: nextNum,
    },
  }));

  return { ok: true, value: created };
}

export function updatePurchaseOrderStatus(
  orderId: string,
  nextStatus: "Solicitada" | "Cancelada",
): ServiceResult<PurchaseOrder> {
  const state = logisticsStore.getSnapshot();
  const order = state.purchaseOrders.find((po) => po.id === orderId);
  if (!order) {
    return { ok: false, error: "La orden de compra no existe." };
  }
  if (order.status === nextStatus) {
    return { ok: true, value: order };
  }

  const canTransition =
    (order.status === "Borrador" &&
      (nextStatus === "Solicitada" || nextStatus === "Cancelada")) ||
    (order.status === "Solicitada" && nextStatus === "Cancelada");

  if (!canTransition) {
    return {
      ok: false,
      error: `No se puede pasar una orden de ${order.status} a ${nextStatus}.`,
    };
  }

  if (nextStatus === "Solicitada" && (order.total <= 0 || order.items.some((i) => i.agreedUnitCost <= 0))) {
    return {
      ok: false,
      error: "Para solicitar la orden todos los productos deben tener un costo pactado mayor a cero.",
    };
  }

  const updated: PurchaseOrder = {
    ...order,
    status: nextStatus,
  };

  logisticsStore.set((prev) => ({
    ...prev,
    purchaseOrders: prev.purchaseOrders.map((po) => (po.id === orderId ? updated : po)),
  }));

  return { ok: true, value: updated };
}

export type ReceiveGoodsInput = {
  supplierId: string;
  purchaseOrderId?: string | null;
  receiptType: ReceiptType;
  receiptNumber: string;
  receptionDate: string;
  paymentCondition: PaymentCondition;
  paymentMethod?: SupplierPaymentMethod | null;
  declaredTotal?: number | null;
  notes: string;
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
};

export function receiveGoods(input: ReceiveGoodsInput): ServiceResult<GoodsReceipt> {
  const state = logisticsStore.getSnapshot();
  const supplier = state.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier) {
    return { ok: false, error: "Elegí un proveedor de la lista." };
  }
  if (!supplier.active) {
    return { ok: false, error: "El proveedor está archivado." };
  }

  const receiptNumber = input.receiptNumber.trim();
  if (!receiptNumber || receiptNumber.length > 40 || !/^[A-Za-z0-9./ -]+$/.test(receiptNumber)) {
    return {
      ok: false,
      error: "Cargá un número de comprobante válido (ej. 0001-00004521).",
    };
  }

  const duplicateReceipt = state.goodsReceipts.some(
    (r) =>
      r.supplierId === supplier.id &&
      r.receiptType === input.receiptType &&
      r.receiptNumber.toLowerCase() === receiptNumber.toLowerCase(),
  );
  if (duplicateReceipt) {
    return {
      ok: false,
      error: `Ese ${input.receiptType.toLowerCase()} (${receiptNumber}) ya fue registrado para ${supplier.businessName}.`,
    };
  }

  if (input.paymentCondition === "contado" && !input.paymentMethod) {
    return {
      ok: false,
      error: "Al pagar al contado tenés que indicar el medio de pago.",
    };
  }

  let linkedOrder: PurchaseOrder | null = null;
  if (input.purchaseOrderId) {
    const found = state.purchaseOrders.find((po) => po.id === input.purchaseOrderId);
    if (!found) {
      return { ok: false, error: "La orden de compra vinculada no existe." };
    }
    if (found.supplierId !== supplier.id) {
      return { ok: false, error: "La orden de compra pertenece a otro proveedor." };
    }
    if (found.status !== "Solicitada") {
      return {
        ok: false,
        error: `Sólo se puede recibir una orden en estado Solicitada (actual: ${found.status}).`,
      };
    }
    linkedOrder = found;
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Agregá al menos un producto recibido." };
  }

  const catalog = catalogStore.getSnapshot();
  const seenProducts = new Set<string>();
  const validatedItems: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    unitCost: number;
  }[] = [];
  let calculatedTotal = 0;

  for (let i = 0; i < input.items.length; i++) {
    const raw = input.items[i];
    const rowLabel = `Renglón ${i + 1}: `;
    if (!raw.productId) {
      return { ok: false, error: `${rowLabel}elegí un producto.` };
    }
    if (seenProducts.has(raw.productId)) {
      return {
        ok: false,
        error: `${rowLabel}producto repetido; sumá las cantidades en un mismo renglón.`,
      };
    }
    seenProducts.add(raw.productId);

    if (!Number.isFinite(raw.quantity) || raw.quantity <= 0) {
      return { ok: false, error: `${rowLabel}la cantidad debe ser mayor a cero.` };
    }
    if (!Number.isFinite(raw.unitCost) || raw.unitCost < 0) {
      return { ok: false, error: `${rowLabel}el costo unitario no puede ser negativo.` };
    }

    const product = catalog.products.find((p) => p.id === raw.productId);
    if (!product) {
      return { ok: false, error: `${rowLabel}el producto no existe.` };
    }
    const meta = state.productMeta[product.id];
    if (meta?.archived) {
      return { ok: false, error: `${rowLabel}el producto «${product.name}» está archivado.` };
    }

    const qty = round3(raw.quantity);
    const cost = Math.round(raw.unitCost);
    validatedItems.push({
      productId: product.id,
      productName: product.name,
      price: getFinalPrice(product),
      quantity: qty,
      unitCost: cost,
    });
    calculatedTotal += Math.round(qty * cost);
  }

  if (calculatedTotal <= 0) {
    return { ok: false, error: "El total del comprobante debe ser mayor a cero." };
  }

  if (
    input.declaredTotal !== null &&
    input.declaredTotal !== undefined &&
    input.declaredTotal > 0 &&
    Math.abs(input.declaredTotal - calculatedTotal) >= 1
  ) {
    return {
      ok: false,
      error: `El total declarado ($${input.declaredTotal.toLocaleString("es-AR")}) no coincide con la suma de los renglones ($${calculatedTotal.toLocaleString("es-AR")}). Revisá cantidades y costos.`,
    };
  }

  const nowIso = new Date().toISOString();
  const receiptId = createId("rcp");

  const receiptItems: GoodsReceiptItem[] = [];
  const nextProductMeta = { ...state.productMeta };

  for (const item of validatedItems) {
    const prevMeta =
      nextProductMeta[item.productId] ??
      getDefaultProductMeta(item.productId, item.price);
    const previousStock = prevMeta.stock;
    const newStock = round3(previousStock + item.quantity);
    const previousCost = prevMeta.cost;
    const newCost = item.unitCost > 0 ? item.unitCost : previousCost;
    const newMarginPercent =
      item.price > 0 && newCost > 0
        ? round1(((item.price - newCost) / item.price) * 100)
        : null;

    nextProductMeta[item.productId] = {
      ...prevMeta,
      stock: newStock,
      cost: newCost,
      hasHistory: true,
    };

    receiptItems.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      previousStock,
      newStock,
      previousCost,
      newCost,
      newMarginPercent,
    });
  }

  const differences: GoodsReceiptDifference[] = [];
  if (linkedOrder) {
    for (const ordered of linkedOrder.items) {
      const received = receiptItems.find((r) => r.productId === ordered.productId);
      if (
        !received ||
        received.quantity !== ordered.quantity ||
        received.unitCost !== ordered.agreedUnitCost
      ) {
        differences.push({
          productId: ordered.productId,
          productName: ordered.productName,
          orderedQuantity: ordered.quantity,
          receivedQuantity: received ? received.quantity : 0,
          agreedUnitCost: ordered.agreedUnitCost,
          billedUnitCost: received ? received.unitCost : null,
        });
      }
    }
  }

  let runningBalance = supplier.balance + calculatedTotal;
  let seq = state.sequences.ledger + 1;
  const newLedgerEntries: SupplierLedgerEntry[] = [
    {
      id: createId("led"),
      sequence: seq,
      supplierId: supplier.id,
      type: input.receiptType,
      amount: calculatedTotal,
      balanceAfter: runningBalance,
      reference: receiptNumber,
      receiptId,
      createdAt: nowIso,
    },
  ];

  if (input.paymentCondition === "contado") {
    runningBalance -= calculatedTotal;
    seq += 1;
    newLedgerEntries.push({
      id: createId("led"),
      sequence: seq,
      supplierId: supplier.id,
      type: "Pago",
      amount: calculatedTotal,
      balanceAfter: runningBalance,
      reference: `${input.receiptType} ${receiptNumber}`,
      paymentMethod: input.paymentMethod ?? "efectivo",
      reason: "Pago al contado al recibir mercadería",
      receiptId,
      createdAt: nowIso,
    });
  }

  const receipt: GoodsReceipt = {
    id: receiptId,
    supplierId: supplier.id,
    purchaseOrderId: linkedOrder?.id ?? null,
    purchaseOrderCode: linkedOrder?.code ?? null,
    receiptType: input.receiptType,
    receiptNumber,
    receptionDate: input.receptionDate || nowIso.slice(0, 10),
    paymentCondition: input.paymentCondition,
    paymentMethod: input.paymentCondition === "contado" ? input.paymentMethod : null,
    declaredTotal: input.declaredTotal ?? null,
    total: calculatedTotal,
    notes: input.notes.trim().slice(0, 500),
    createdAt: nowIso,
    items: receiptItems,
    differences,
    supplierBalanceAfter: runningBalance,
  };

  logisticsStore.set((prev) => ({
    ...prev,
    productMeta: nextProductMeta,
    suppliers: prev.suppliers.map((s) =>
      s.id === supplier.id ? { ...s, balance: runningBalance } : s,
    ),
    purchaseOrders: linkedOrder
      ? prev.purchaseOrders.map((po) =>
          po.id === linkedOrder.id
            ? { ...po, status: "Recibida", receivedAt: nowIso }
            : po,
        )
      : prev.purchaseOrders,
    goodsReceipts: [receipt, ...prev.goodsReceipts],
    supplierLedger: [...newLedgerEntries.reverse(), ...prev.supplierLedger],
    sequences: {
      ...prev.sequences,
      ledger: seq,
    },
  }));

  return { ok: true, value: receipt };
}

export type RegisterSupplierPaymentInput = {
  supplierId: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  reference: string;
  reason?: string;
};

export function registerSupplierPayment(
  input: RegisterSupplierPaymentInput,
): ServiceResult<SupplierLedgerEntry> {
  const state = logisticsStore.getSnapshot();
  const supplier = state.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier) {
    return { ok: false, error: "El proveedor no existe." };
  }
  if (supplier.balance <= 0) {
    return { ok: false, error: "Este proveedor no registra deuda pendiente." };
  }

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Ingresá un monto mayor a cero." };
  }
  if (amount > supplier.balance) {
    return {
      ok: false,
      error: `El pago ($${amount.toLocaleString("es-AR")}) no puede superar la deuda actual ($${supplier.balance.toLocaleString("es-AR")}).`,
    };
  }

  const nextBalance = supplier.balance - amount;
  const nextSeq = state.sequences.ledger + 1;
  const entry: SupplierLedgerEntry = {
    id: createId("led"),
    sequence: nextSeq,
    supplierId: supplier.id,
    type: "Pago",
    amount,
    balanceAfter: nextBalance,
    reference: input.reference.trim().slice(0, 80) || "Pago de cuenta corriente",
    paymentMethod: input.paymentMethod,
    reason: input.reason?.trim().slice(0, 120),
    createdAt: new Date().toISOString(),
  };

  logisticsStore.set((prev) => ({
    ...prev,
    suppliers: prev.suppliers.map((s) =>
      s.id === supplier.id ? { ...s, balance: nextBalance } : s,
    ),
    supplierLedger: [entry, ...prev.supplierLedger],
    sequences: {
      ...prev.sequences,
      ledger: nextSeq,
    },
  }));

  return { ok: true, value: entry };
}

export type RegisterSupplierCreditNoteInput = {
  supplierId: string;
  amount: number;
  reference: string;
  reason: string;
};

export function registerSupplierCreditNote(
  input: RegisterSupplierCreditNoteInput,
): ServiceResult<SupplierLedgerEntry> {
  const state = logisticsStore.getSnapshot();
  const supplier = state.suppliers.find((s) => s.id === input.supplierId);
  if (!supplier) {
    return { ok: false, error: "El proveedor no existe." };
  }

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "El importe debe ser mayor a cero." };
  }

  const reference = input.reference.trim();
  if (!reference) {
    return { ok: false, error: "Indicá el número de la nota de crédito." };
  }

  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Indicá el motivo de la nota de crédito (mínimo 3 letras)." };
  }

  const nextBalance = supplier.balance - amount;
  const nextSeq = state.sequences.ledger + 1;
  const entry: SupplierLedgerEntry = {
    id: createId("led"),
    sequence: nextSeq,
    supplierId: supplier.id,
    type: "Nota de Crédito",
    amount,
    balanceAfter: nextBalance,
    reference: reference.slice(0, 80),
    reason: reason.slice(0, 200),
    createdAt: new Date().toISOString(),
  };

  logisticsStore.set((prev) => ({
    ...prev,
    suppliers: prev.suppliers.map((s) =>
      s.id === supplier.id ? { ...s, balance: nextBalance } : s,
    ),
    supplierLedger: [entry, ...prev.supplierLedger],
    sequences: {
      ...prev.sequences,
      ledger: nextSeq,
    },
  }));

  return { ok: true, value: entry };
}

export function resetLogisticsToDefault() {
  resetCatalog();
  logisticsStore.set(() => createDefaultLogisticsState());
}

export function applyStockDeltaForSaleLines(
  lines: Array<{ productId: string; quantity: number }>,
  direction: "deduct" | "restore",
) {
  const multiplier = direction === "deduct" ? -1 : 1;
  logisticsStore.set((prev) => {
    const nextMeta = { ...prev.productMeta };
    for (const line of lines) {
      const meta = nextMeta[line.productId] ?? getDefaultProductMeta(line.productId, 0);
      if (meta.kit && meta.kit.length > 0) {
        for (const comp of meta.kit) {
          const compMeta = nextMeta[comp.productId] ?? getDefaultProductMeta(comp.productId, 0);
          nextMeta[comp.productId] = {
            ...compMeta,
            stock: round3(compMeta.stock + multiplier * comp.quantity * line.quantity),
            hasHistory: true,
          };
        }
        nextMeta[line.productId] = { ...meta, hasHistory: true };
      } else {
        nextMeta[line.productId] = {
          ...meta,
          stock: round3(meta.stock + multiplier * line.quantity),
          hasHistory: true,
        };
      }
    }
    return {
      ...prev,
      productMeta: nextMeta,
    };
  });
}
