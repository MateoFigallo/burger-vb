import type { Category, Product } from "@/features/menu";

export type UnitCode = "u" | "kg" | "l";

export type MovementType =
  | "ajuste"
  | "merma"
  | "rotura"
  | "vencimiento"
  | "robo"
  | "consumo";

export type ShrinkageType = Exclude<MovementType, "ajuste">;

export type RefundMethod = "efectivo" | "monedero" | "otro";

export type IvaCondition = "Responsable Inscripto" | "Monotributista" | "Exento";

export type SupplierPaymentMethod = "efectivo" | "transferencia" | "cheque" | "tarjeta";

export type ReceiptType = "Factura" | "Remito";

export type PaymentCondition = "credito" | "contado";

export type PurchaseOrderStatus = "Borrador" | "Solicitada" | "Recibida" | "Cancelada";

export type QuoteStatus = "vigente" | "vencido" | "convertido" | "anulado";

export type KitItem = {
  productId: string;
  quantity: number;
};

export type CategoryLogisticsMeta = {
  categoryId: string;
  color: string;
  layout: "grid" | "rows" | "bodegas";
  alcohol: boolean;
  ageRestricted: boolean;
};

export type ProductLogisticsMeta = {
  productId: string;
  /** Costo unitario en pesos (ARS). */
  cost: number;
  /** Stock disponible en la unidad del artículo. */
  stock: number;
  unit: UnitCode;
  barcode: string;
  /** Código PLU de balanza (hasta 5 dígitos). */
  plu: string;
  /** Presentación (ej. "150 g", "500 ml", "Doble medallón"). */
  presentation: string;
  /** Grupo o línea interna (ej. "Línea Smash", "Cervecería"). */
  group: string;
  /** Si exige stock disponible para poder venderse. */
  needStock: boolean;
  /** Si está archivado lógicamente (cuando tiene historial y no se puede borrar físicamente). */
  archived: boolean;
  archivedAt?: string;
  archiveReason?: string;
  /** Si tuvo ajustes o movimientos de stock registrados. */
  hasHistory: boolean;
  /** Composición si el producto es un combo/kit. */
  kit: KitItem[];
  /** Si es un dato precargado de demostración. */
  isSample?: boolean;
};

/** Vista unificada de un producto del catálogo con sus datos de inventario. */
export type InventoryItem = Product &
  Omit<ProductLogisticsMeta, "productId"> & {
    categoryName: string;
    categoryColor: string;
    effectiveCost: number;
    effectiveStock: number;
    marginPercent: number | null;
    markupPercent: number | null;
    isKit: boolean;
    stockStatus: "neg" | "zero" | "low" | "ok";
  };

/** Vista unificada de una categoría con su configuración visual en inventario. */
export type InventoryCategory = Category & Omit<CategoryLogisticsMeta, "categoryId">;

export type StockAdjustmentRecord = {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  categoryId: string;
  delta: number;
  previousStock: number;
  newStock: number;
  type: MovementType;
  reason: string;
  user: string;
};

export type ShrinkageRecord = {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  categoryId: string;
  /** Cantidad descontada (negativa, ej. -2). */
  quantity: number;
  unit: UnitCode;
  unitCost: number;
  /** Pérdida total valorizada al costo (positiva). */
  totalValue: number;
  type: ShrinkageType;
  reason: string;
  user: string;
  isSample?: boolean;
};

export type PartialReturnLine = {
  lineIndex: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type PartialReturnRecord = {
  id: string;
  createdAt: string;
  orderId: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  lines: PartialReturnLine[];
  totalRefund: number;
  refundMethod: RefundMethod;
  reason: string;
  user: string;
  isSample?: boolean;
};

export type QuoteLine = {
  productId: string;
  productName: string;
  categoryId: string;
  unit: UnitCode;
  quantity: number;
  /** Precio unitario pactado en el presupuesto. */
  unitPrice: number;
  /** Precio de lista al momento de presupuestar. */
  listPrice: number;
  unitCost: number;
};

export type Quote = {
  id: string;
  number: string;
  createdAt: string;
  expiresAt: string;
  validDays: number;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  lines: QuoteLine[];
  total: number;
  notes: string;
  status: "vigente" | "convertido" | "anulado";
  convertedOrderId?: string;
  convertedAt?: string;
  voidReason?: string;
  createdBy: string;
  isSample?: boolean;
};

export type Supplier = {
  id: string;
  businessName: string;
  /** CUIT de 11 dígitos sin guiones. */
  cuit: string;
  ivaCondition: IvaCondition;
  email: string;
  phone: string;
  address: string;
  /** Saldo en cuenta corriente en pesos (> 0 significa que le debemos; < 0 saldo a nuestro favor). */
  balance: number;
  active: boolean;
  createdAt: string;
  isSample?: boolean;
};

export type PurchaseOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  agreedUnitCost: number;
};

export type PurchaseOrder = {
  id: string;
  number: number;
  code: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  receivedAt?: string;
  items: PurchaseOrderItem[];
  total: number;
  notes: string;
  isSample?: boolean;
};

export type GoodsReceiptItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  previousStock: number;
  newStock: number;
  previousCost: number;
  newCost: number;
  newMarginPercent: number | null;
};

export type GoodsReceiptDifference = {
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  agreedUnitCost: number;
  billedUnitCost: number | null;
};

export type GoodsReceipt = {
  id: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  purchaseOrderCode?: string | null;
  receiptType: ReceiptType;
  receiptNumber: string;
  receptionDate: string;
  paymentCondition: PaymentCondition;
  paymentMethod?: SupplierPaymentMethod | null;
  declaredTotal?: number | null;
  total: number;
  notes: string;
  createdAt: string;
  items: GoodsReceiptItem[];
  differences: GoodsReceiptDifference[];
  supplierBalanceAfter: number;
  isSample?: boolean;
};

export type SupplierLedgerEntryType = "Factura" | "Remito" | "Pago" | "Nota de Crédito";

export type SupplierLedgerEntry = {
  id: string;
  sequence: number;
  supplierId: string;
  type: SupplierLedgerEntryType;
  /** Monto positivo de la operación. */
  amount: number;
  /** Saldo acumulado luego del movimiento. */
  balanceAfter: number;
  reference: string;
  paymentMethod?: SupplierPaymentMethod | null;
  reason?: string;
  receiptId?: string | null;
  createdAt: string;
};

export type DeletePreviewItem = {
  productId: string;
  productName: string;
  stock: number;
  unit: UnitCode;
  status: "eliminable" | "archivable";
  references: string[];
  reasonText: string;
};

export type LogisticsState = {
  productMeta: Record<string, ProductLogisticsMeta>;
  categoryMeta: Record<string, CategoryLogisticsMeta>;
  adjustments: StockAdjustmentRecord[];
  shrinkages: ShrinkageRecord[];
  partialReturns: PartialReturnRecord[];
  quotes: Quote[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierLedger: SupplierLedgerEntry[];
  sequences: {
    quote: number;
    purchaseOrder: number;
    ledger: number;
  };
};
