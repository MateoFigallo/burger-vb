import { businessConfig } from "@/config/business.config";
import {
  findCustomer,
  recordCustomerCreditCharge,
  recordDeliveredOrder,
} from "@/features/customers";
import { applyStockDeltaForSaleLines } from "@/features/logistics";
import {
  consumeCouponByCode,
  redeemGiftCardBalance,
  spendCustomerWallet,
} from "@/features/loyalty";
import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type {
  ArcaInvoiceMeta,
  CashCutX,
  CashMovement,
  CashMovementKind,
  CashRegister,
  CashSession,
  CommercialState,
  FundTransfer,
  PosPaymentMethod,
  PosPaymentSplit,
  PosSale,
  PosSaleLine,
} from "../types";
import { createDefaultCommercialState } from "./default-commercial";

export type CommercialResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const commercialStore = createLocalStore<CommercialState>(
  "burger-vb:commercial-v1",
  createDefaultCommercialState(),
);

function generateDeterministicSeal(payload: string): string {
  // Genera un sello hexadecimal de 64 caracteres determinístico para el Corte Z
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const chunks: string[] = [];
  for (let round = 0; round < 8; round++) {
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    chunks.push(((h1 >>> 0).toString(16)).padStart(8, "0"));
  }
  return chunks.join("").slice(0, 64);
}

export type SessionFinancialSummary = {
  openingAmount: number;
  cashSales: number;
  digitalSales: number;
  creditSales: number;
  walletAndGiftSales: number;
  totalSales: number;
  salesCount: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  byMethod: Record<PosPaymentMethod, number>;
};

export function computeSessionSummary(
  session: CashSession,
  allSales: PosSale[],
  allMovements: CashMovement[],
): SessionFinancialSummary {
  const sessionSales = allSales.filter(
    (s) => s.sessionId === session.id && s.status === "completada",
  );
  const sessionMovements = allMovements.filter((m) => m.sessionId === session.id);

  const byMethod: Record<PosPaymentMethod, number> = {
    efectivo: 0,
    debito: 0,
    credito: 0,
    transferencia: 0,
    mercadopago: 0,
    monedero: 0,
    giftcard: 0,
    fiado: 0,
  };

  for (const sale of sessionSales) {
    for (const payment of sale.payments) {
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + payment.amount;
    }
  }

  const cashSales = byMethod.efectivo;
  const digitalSales =
    byMethod.debito + byMethod.credito + byMethod.transferencia + byMethod.mercadopago;
  const creditSales = byMethod.fiado;
  const walletAndGiftSales = byMethod.monedero + byMethod.giftcard;
  const totalSales = sessionSales.reduce((acc, s) => acc + s.total, 0);

  const cashIn = sessionMovements
    .filter((m) => m.kind === "ingreso")
    .reduce((acc, m) => acc + m.amount, 0);
  const cashOut = sessionMovements
    .filter((m) => m.kind === "egreso")
    .reduce((acc, m) => acc + m.amount, 0);

  const expectedCash = Math.round(session.openingAmount + cashSales + cashIn - cashOut);

  return {
    openingAmount: session.openingAmount,
    cashSales,
    digitalSales,
    creditSales,
    walletAndGiftSales,
    totalSales,
    salesCount: sessionSales.length,
    cashIn,
    cashOut,
    expectedCash,
    byMethod,
  };
}

export function getOpenSessionForRegister(
  state: CommercialState,
  registerId = state.activeRegisterId,
): CashSession | null {
  return (
    state.sessions.find((s) => s.registerId === registerId && s.status === "abierta") ?? null
  );
}

export function setActiveRegister(registerId: string) {
  commercialStore.set((prev) => {
    if (!prev.registers.some((r) => r.id === registerId)) return prev;
    return { ...prev, activeRegisterId: registerId };
  });
}

export function createCashRegister(input: {
  name: string;
  branch: string;
}): CommercialResult<CashRegister> {
  const name = input.name.trim();
  const branch = input.branch.trim() || "Sucursal Principal";
  if (name.length < 3) {
    return { ok: false, error: "El nombre de la caja debe tener al menos 3 letras." };
  }
  const register: CashRegister = {
    id: createId("caja"),
    name,
    branch,
    active: true,
  };
  commercialStore.set((prev) => ({
    ...prev,
    registers: [...prev.registers, register],
  }));
  return { ok: true, value: register };
}

export function openCashSession(input: {
  registerId?: string;
  openingAmount: number;
  user?: string;
  notes?: string;
}): CommercialResult<CashSession> {
  const state = commercialStore.getSnapshot();
  const registerId = input.registerId ?? state.activeRegisterId;
  const register = state.registers.find((r) => r.id === registerId);
  if (!register) {
    return { ok: false, error: "Caja no encontrada." };
  }
  const existing = getOpenSessionForRegister(state, register.id);
  if (existing) {
    return { ok: false, error: `La ${register.name} ya tiene el turno #${existing.number} abierto.` };
  }
  const openingAmount = Math.round(input.openingAmount);
  if (openingAmount < 0) {
    return { ok: false, error: "El fondo inicial no puede ser negativo." };
  }

  const nextNum = state.sequences.session + 1;
  const session: CashSession = {
    id: createId("sess"),
    number: nextNum,
    registerId: register.id,
    registerName: register.name,
    branch: register.branch,
    status: "abierta",
    openedAt: new Date().toISOString(),
    openedBy: input.user ?? "Encargado",
    openingAmount,
    closedAt: null,
    closedBy: null,
    expectedCashAtClose: null,
    countedCashAtClose: null,
    differenceAtClose: null,
    totalSalesAtClose: null,
    notes: input.notes?.trim() ?? "",
    sealHash: null,
  };

  commercialStore.set((prev) => ({
    ...prev,
    activeRegisterId: register.id,
    sessions: [session, ...prev.sessions],
    sequences: { ...prev.sequences, session: nextNum },
  }));

  return { ok: true, value: session };
}

export function addCashMovement(input: {
  kind: CashMovementKind;
  rubroId: string;
  amount: number;
  concept: string;
  user?: string;
}): CommercialResult<CashMovement> {
  const state = commercialStore.getSnapshot();
  const openSession = getOpenSessionForRegister(state);
  if (!openSession) {
    return { ok: false, error: "Abrí la caja antes de registrar ingresos o egresos." };
  }
  const amount = Math.round(input.amount);
  if (amount <= 0) {
    return { ok: false, error: "El importe debe ser mayor a cero." };
  }
  const concept = input.concept.trim();
  if (concept.length < 3) {
    return { ok: false, error: "Indicá un detalle de al menos 3 letras." };
  }

  const rubros = businessConfig.commercial.cashRubros[input.kind];
  const rubroObj = rubros.find((r) => r.id === input.rubroId);
  const rubroLabel = rubroObj ? rubroObj.label : input.rubroId;

  const movement: CashMovement = {
    id: createId("mov"),
    sessionId: openSession.id,
    registerId: openSession.registerId,
    kind: input.kind,
    rubroId: input.rubroId,
    rubroLabel,
    amount,
    concept,
    createdAt: new Date().toISOString(),
    user: input.user ?? "Encargado",
  };

  commercialStore.set((prev) => ({
    ...prev,
    movements: [movement, ...prev.movements],
  }));

  return { ok: true, value: movement };
}

export function createCashCutX(user = "Encargado"): CommercialResult<CashCutX> {
  const state = commercialStore.getSnapshot();
  const openSession = getOpenSessionForRegister(state);
  if (!openSession) {
    return { ok: false, error: "No hay una caja abierta para emitir un Corte X." };
  }

  const summary = computeSessionSummary(openSession, state.sales, state.movements);
  const nextCutNumber = state.sequences.cutX + 1;

  const cut: CashCutX = {
    id: createId("cutx"),
    number: nextCutNumber,
    sessionId: openSession.id,
    registerName: openSession.registerName,
    createdAt: new Date().toISOString(),
    openingAmount: summary.openingAmount,
    cashSales: summary.cashSales,
    digitalSales: summary.digitalSales,
    creditSales: summary.creditSales,
    cashIn: summary.cashIn,
    cashOut: summary.cashOut,
    expectedCash: summary.expectedCash,
    salesCount: summary.salesCount,
    user,
  };

  commercialStore.set((prev) => ({
    ...prev,
    cutsX: [cut, ...prev.cutsX],
    sequences: { ...prev.sequences, cutX: nextCutNumber },
  }));

  return { ok: true, value: cut };
}

export function closeCashSessionWithArqueo(input: {
  countedCash: number;
  notes?: string;
  user?: string;
}): CommercialResult<CashSession> {
  const state = commercialStore.getSnapshot();
  const openSession = getOpenSessionForRegister(state);
  if (!openSession) {
    return { ok: false, error: "No hay una caja abierta para cerrar." };
  }

  const countedCash = Math.round(input.countedCash);
  if (countedCash < 0) {
    return { ok: false, error: "El efectivo contado no puede ser negativo." };
  }

  const summary = computeSessionSummary(openSession, state.sales, state.movements);
  const difference = countedCash - summary.expectedCash;
  const closedAt = new Date().toISOString();

  const sealPayload = JSON.stringify({
    sessionId: openSession.id,
    number: openSession.number,
    openedAt: openSession.openedAt,
    closedAt,
    expectedCash: summary.expectedCash,
    countedCash,
    difference,
    totalSales: summary.totalSales,
  });
  const sealHash = generateDeterministicSeal(sealPayload);

  const closedSession: CashSession = {
    ...openSession,
    status: "cerrada",
    closedAt,
    closedBy: input.user ?? "Dueño",
    expectedCashAtClose: summary.expectedCash,
    countedCashAtClose: countedCash,
    differenceAtClose: difference,
    totalSalesAtClose: summary.totalSales,
    notes: input.notes?.trim() || openSession.notes,
    sealHash,
  };

  commercialStore.set((prev) => ({
    ...prev,
    sessions: prev.sessions.map((s) => (s.id === openSession.id ? closedSession : s)),
  }));

  return { ok: true, value: closedSession };
}

export function createFundTransfer(input: {
  fromRegisterId: string;
  toRegisterId: string;
  amount: number;
  concept: string;
  user?: string;
}): CommercialResult<FundTransfer> {
  const state = commercialStore.getSnapshot();
  if (input.fromRegisterId === input.toRegisterId) {
    return { ok: false, error: "La caja de origen y destino deben ser distintas." };
  }
  const fromReg = state.registers.find((r) => r.id === input.fromRegisterId);
  const toReg = state.registers.find((r) => r.id === input.toRegisterId);
  if (!fromReg || !toReg) {
    return { ok: false, error: "Seleccioná cajas válidas." };
  }
  const amount = Math.round(input.amount);
  if (amount <= 0) {
    return { ok: false, error: "El monto a traspasar debe ser mayor a cero." };
  }

  const nextNum = state.sequences.transfer + 1;
  const transfer: FundTransfer = {
    id: createId("trf"),
    number: `BMF-${String(nextNum).padStart(4, "0")}`,
    fromRegisterId: fromReg.id,
    fromRegisterName: fromReg.name,
    toRegisterId: toReg.id,
    toRegisterName: toReg.name,
    amount,
    concept: input.concept.trim() || "Traspaso de fondos entre cajas",
    createdAt: new Date().toISOString(),
    user: input.user ?? "Encargado",
  };

  // Si la caja de origen o destino tiene sesión abierta, impacta en sus movimientos
  const newMovements: CashMovement[] = [];
  const openFrom = getOpenSessionForRegister(state, fromReg.id);
  if (openFrom) {
    newMovements.push({
      id: createId("mov"),
      sessionId: openFrom.id,
      registerId: fromReg.id,
      kind: "egreso",
      rubroId: "retiro_dueno",
      rubroLabel: `Traspaso hacia ${toReg.name}`,
      amount,
      concept: `${transfer.number} · ${transfer.concept}`,
      createdAt: transfer.createdAt,
      user: transfer.user,
    });
  }
  const openTo = getOpenSessionForRegister(state, toReg.id);
  if (openTo) {
    newMovements.push({
      id: createId("mov"),
      sessionId: openTo.id,
      registerId: toReg.id,
      kind: "ingreso",
      rubroId: "cambio_inicial",
      rubroLabel: `Traspaso desde ${fromReg.name}`,
      amount,
      concept: `${transfer.number} · ${transfer.concept}`,
      createdAt: transfer.createdAt,
      user: transfer.user,
    });
  }

  commercialStore.set((prev) => ({
    ...prev,
    transfers: [transfer, ...prev.transfers],
    movements: [...newMovements, ...prev.movements],
    sequences: { ...prev.sequences, transfer: nextNum },
  }));

  return { ok: true, value: transfer };
}

// ============================================================================
// Punto de Venta (Vender POS)
// ============================================================================

export type CommitPosSaleInput = {
  customerId: string | null;
  customerName?: string;
  lines: PosSaleLine[];
  discountAmount: number;
  discountLabel: string;
  couponCode?: string;
  payments: PosPaymentSplit[];
  cashReceived?: number;
  giftCardCode?: string;
  arcaEnabled?: boolean;
  arcaCbteTipo?: "Ticket B" | "Factura A" | "Factura B";
  arcaDocNumber?: string;
  cashier?: string;
};

export function commitPosSale(input: CommitPosSaleInput): CommercialResult<PosSale> {
  const state = commercialStore.getSnapshot();
  const openSession = getOpenSessionForRegister(state);
  if (!openSession) {
    return {
      ok: false,
      error: "La caja está cerrada. Abrí el turno en Gestión de Caja antes de cobrar.",
    };
  }

  if (input.lines.length === 0) {
    return { ok: false, error: "Agregá al menos un producto al ticket para cobrar." };
  }

  const subtotal = Math.round(input.lines.reduce((acc, l) => acc + l.subtotal, 0));
  const discountAmount = Math.min(subtotal, Math.max(0, Math.round(input.discountAmount)));
  const total = Math.max(0, subtotal - discountAmount);
  const totalCost = Math.round(
    input.lines.reduce((acc, l) => acc + l.unitCost * l.quantity, 0),
  );

  const paymentsTotal = Math.round(input.payments.reduce((acc, p) => acc + p.amount, 0));
  if (Math.abs(paymentsTotal - total) > 1) {
    return {
      ok: false,
      error: `La suma de los pagos ($${paymentsTotal.toLocaleString("es-AR")}) no coincide con el total a cobrar ($${total.toLocaleString("es-AR")}).`,
    };
  }

  const customer = input.customerId ? findCustomer(input.customerId) : undefined;
  const customerName = customer?.name ?? (input.customerName?.trim() || "Consumidor Final");

  // Validar pagos especiales: fiado, monedero, giftcard
  const fiadoSplit = input.payments.find((p) => p.method === "fiado");
  if (fiadoSplit && fiadoSplit.amount > 0) {
    if (!customer) {
      return {
        ok: false,
        error: "Seleccioná un cliente registrado para vender en Cuenta Corriente / Fiado.",
      };
    }
  }

  const walletSplit = input.payments.find((p) => p.method === "monedero");
  if (walletSplit && walletSplit.amount > 0) {
    if (!customer) {
      return {
        ok: false,
        error: "Identificá al cliente para pagar con saldo de su Monedero Club.",
      };
    }
  }

  const giftSplit = input.payments.find((p) => p.method === "giftcard");
  if (giftSplit && giftSplit.amount > 0) {
    if (!input.giftCardCode?.trim()) {
      return {
        ok: false,
        error: "Ingresá el código de la Gift Card (ej. GC-BURG-2026).",
      };
    }
    const gcRes = redeemGiftCardBalance({
      code: input.giftCardCode,
      amount: giftSplit.amount,
      customerId: customer?.id ?? null,
    });
    if (!gcRes.ok) {
      return { ok: false, error: gcRes.error };
    }
  }

  const nextTicket = state.sequences.ticket + 1;
  const ticketNumber = `POS-${String(nextTicket).padStart(4, "0")}`;
  const saleId = createId("pos-sale");

  if (fiadoSplit && fiadoSplit.amount > 0 && customer) {
    const ccRes = recordCustomerCreditCharge({
      customerId: customer.id,
      amount: fiadoSplit.amount,
      reference: `Venta ${ticketNumber} · ${input.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ")}`,
      user: input.cashier ?? "Mostrador",
    });
    if (!ccRes.ok) {
      return { ok: false, error: ccRes.error };
    }
  }

  let cashbackAwarded = 0;
  if (walletSplit && walletSplit.amount > 0 && customer) {
    const walRes = spendCustomerWallet({
      customerId: customer.id,
      amount: walletSplit.amount,
      saleId,
      reference: `Venta ${ticketNumber}`,
      user: input.cashier ?? "Mostrador",
    });
    if (!walRes.ok) {
      return { ok: false, error: walRes.error };
    }
    cashbackAwarded = walRes.cashbackAwarded;
  }

  if (input.couponCode) {
    consumeCouponByCode(input.couponCode);
  }

  const cashSplit = input.payments.find((p) => p.method === "efectivo");
  const cashAmount = cashSplit?.amount ?? 0;
  const cashReceived =
    input.cashReceived && input.cashReceived >= cashAmount ? Math.round(input.cashReceived) : cashAmount;
  const changeGiven = Math.max(0, cashReceived - cashAmount);

  const arcaInvoice: ArcaInvoiceMeta | null = input.arcaEnabled
    ? {
        enabled: true,
        cbteTipo: input.arcaCbteTipo ?? "Ticket B",
        cae: `74${String(Date.now()).slice(-12)}`,
        docNumber: input.arcaDocNumber?.trim() || customer?.taxId || "Consumidor Final",
      }
    : null;

  const nowIso = new Date().toISOString();

  // Si hay un cliente identificado, suma sello y registro de compra en su ficha
  if (customer) {
    recordDeliveredOrder({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      total,
      deliveredAt: nowIso,
    });
  }

  // Descontar stock (incluyendo desglose de kits/combos)
  applyStockDeltaForSaleLines(
    input.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    "deduct",
  );

  const sale: PosSale = {
    id: saleId,
    ticketNumber,
    sessionId: openSession.id,
    registerId: openSession.registerId,
    customerId: customer?.id ?? null,
    customerName,
    lines: input.lines,
    subtotal,
    discountAmount,
    discountLabel: input.discountLabel || "Sin descuento",
    total,
    totalCost,
    payments: input.payments,
    cashReceived,
    changeGiven,
    arcaInvoice,
    cashbackAwarded,
    giftCardCode: input.giftCardCode?.trim() || undefined,
    status: "completada",
    createdAt: nowIso,
    cashier: input.cashier ?? "Encargado",
  };

  commercialStore.set((prev) => ({
    ...prev,
    sales: [sale, ...prev.sales],
    sequences: { ...prev.sequences, ticket: nextTicket },
  }));

  return { ok: true, value: sale };
}

export function voidPosSale(saleId: string, reason: string): CommercialResult<PosSale> {
  const state = commercialStore.getSnapshot();
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return { ok: false, error: "Venta no encontrada." };
  if (sale.status === "anulada") return { ok: false, error: "Esta venta ya fue anulada." };
  if (reason.trim().length < 3) {
    return { ok: false, error: "Indicá el motivo de la anulación (mínimo 3 letras)." };
  }

  applyStockDeltaForSaleLines(
    sale.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    "restore",
  );

  const updated: PosSale = {
    ...sale,
    status: "anulada",
    voidReason: reason.trim(),
  };

  commercialStore.set((prev) => ({
    ...prev,
    sales: prev.sales.map((s) => (s.id === saleId ? updated : s)),
  }));

  return { ok: true, value: updated };
}
