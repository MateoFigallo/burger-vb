export type PosPaymentMethod =
  | "efectivo"
  | "debito"
  | "credito"
  | "transferencia"
  | "mercadopago"
  | "monedero"
  | "giftcard"
  | "fiado";

export type PosPaymentSplit = {
  method: PosPaymentMethod;
  amount: number;
  reference?: string;
};

export type PosSaleLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
};

export type ArcaInvoiceMeta = {
  enabled: boolean;
  cbteTipo: "Ticket B" | "Factura A" | "Factura B";
  cae: string;
  docNumber: string;
};

export type PosSale = {
  id: string;
  ticketNumber: string;
  sessionId: string;
  registerId: string;
  customerId: string | null;
  customerName: string;
  lines: PosSaleLine[];
  subtotal: number;
  discountAmount: number;
  discountLabel: string;
  total: number;
  totalCost: number;
  payments: PosPaymentSplit[];
  cashReceived: number;
  changeGiven: number;
  arcaInvoice: ArcaInvoiceMeta | null;
  cashbackAwarded: number;
  giftCardCode?: string;
  status: "completada" | "anulada";
  voidReason?: string;
  createdAt: string;
  cashier: string;
};

export type CashMovementKind = "ingreso" | "egreso";

export type CashMovement = {
  id: string;
  sessionId: string;
  registerId: string;
  kind: CashMovementKind;
  rubroId: string;
  rubroLabel: string;
  amount: number;
  concept: string;
  createdAt: string;
  user: string;
};

export type CashCutX = {
  id: string;
  number: number;
  sessionId: string;
  registerName: string;
  createdAt: string;
  openingAmount: number;
  cashSales: number;
  digitalSales: number;
  creditSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  salesCount: number;
  user: string;
};

export type CashSession = {
  id: string;
  number: number;
  registerId: string;
  registerName: string;
  branch: string;
  status: "abierta" | "cerrada";
  openedAt: string;
  openedBy: string;
  openingAmount: number;
  closedAt: string | null;
  closedBy: string | null;
  expectedCashAtClose: number | null;
  countedCashAtClose: number | null;
  differenceAtClose: number | null;
  totalSalesAtClose: number | null;
  notes: string;
  sealHash: string | null;
};

export type CashRegister = {
  id: string;
  name: string;
  branch: string;
  active: boolean;
};

export type FundTransfer = {
  id: string;
  number: string;
  fromRegisterId: string;
  fromRegisterName: string;
  toRegisterId: string;
  toRegisterName: string;
  amount: number;
  concept: string;
  createdAt: string;
  user: string;
};

export type CommercialState = {
  registers: CashRegister[];
  activeRegisterId: string;
  sessions: CashSession[];
  movements: CashMovement[];
  cutsX: CashCutX[];
  transfers: FundTransfer[];
  sales: PosSale[];
  sequences: {
    ticket: number;
    session: number;
    cutX: number;
    transfer: number;
  };
};
