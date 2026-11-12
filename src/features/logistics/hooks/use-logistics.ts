"use client";

import { useMemo, useState } from "react";
import { businessConfig } from "@/config/business.config";
import { useCatalog } from "@/features/menu";
import { useIsClient, useLocalStore } from "@/lib/use-local-store";
import {
  buildInventoryCategories,
  buildInventoryItems,
  getQuoteEffectiveStatus,
  logisticsStore,
} from "../services/logistics-store";

export function useLogistics() {
  const catalog = useCatalog();
  const state = useLocalStore(logisticsStore);
  const isReady = useIsClient();

  const categories = useMemo(
    () => buildInventoryCategories(catalog, state),
    [catalog, state],
  );

  const items = useMemo(
    () => buildInventoryItems(catalog, state),
    [catalog, state],
  );

  return {
    isReady,
    categories,
    items,
    adjustments: state.adjustments,
    shrinkages: state.shrinkages,
    partialReturns: state.partialReturns,
    quotes: state.quotes,
    suppliers: state.suppliers,
    purchaseOrders: state.purchaseOrders,
    goodsReceipts: state.goodsReceipts,
    supplierLedger: state.supplierLedger,
  };
}

export type LogisticsBadges = {
  lowStockCount: number;
  negativeStockCount: number;
  activeQuotesCount: number;
  expiringQuotesCount: number;
  pendingPurchaseOrdersCount: number;
  recentShrinkagesCount: number;
};

export function useLogisticsBadges(): LogisticsBadges {
  const { items, quotes, purchaseOrders, shrinkages } = useLogistics();
  const [nowMs] = useState(() => Date.now());

  return useMemo(() => {
    const threshold = businessConfig.logistics.lowStockThreshold;
    const activeItems = items.filter((item) => item.available && !item.archived);
    const lowStockCount = activeItems.filter((item) => item.effectiveStock <= threshold).length;
    const negativeStockCount = activeItems.filter((item) => item.effectiveStock < 0).length;

    const activeQuotes = quotes.filter((q) => getQuoteEffectiveStatus(q, nowMs) === "vigente");
    const expiringQuotesCount = activeQuotes.filter(
      (q) => new Date(q.expiresAt).getTime() - nowMs < 2 * 86_400_000,
    ).length;

    const pendingPurchaseOrdersCount = purchaseOrders.filter(
      (po) => po.status === "Solicitada",
    ).length;

    const thirtyDaysAgo = nowMs - 30 * 86_400_000;
    const recentShrinkagesCount = shrinkages.filter(
      (s) => new Date(s.createdAt).getTime() >= thirtyDaysAgo,
    ).length;

    return {
      lowStockCount,
      negativeStockCount,
      activeQuotesCount: activeQuotes.length,
      expiringQuotesCount,
      pendingPurchaseOrdersCount,
      recentShrinkagesCount,
    };
  }, [items, quotes, purchaseOrders, shrinkages, nowMs]);
}
