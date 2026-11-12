export { StockManager } from "./components/stock/stock-manager";
export { ShrinkageManager } from "./components/shrinkage/shrinkage-manager";
export { QuotesManager } from "./components/quotes/quotes-manager";
export { SuppliersManager } from "./components/suppliers/suppliers-manager";
export { useLogistics, useLogisticsBadges, type LogisticsBadges } from "./hooks/use-logistics";
export { applyStockDeltaForSaleLines, logisticsStore } from "./services/logistics-store";
export { cleanCuit, isValidCuit, formatCuit } from "./services/cuit";
export type {
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
  PurchaseOrderStatus,
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
  SupplierLedgerEntryType,
  SupplierPaymentMethod,
  UnitCode,
} from "./types";
