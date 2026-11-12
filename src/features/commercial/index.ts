export { PosManager } from "./components/pos/pos-manager";
export { CashManager } from "./components/cash/cash-manager";
export { useCommercial, type UseCommercialReturn } from "./hooks/use-commercial";
export {
  addCashMovement,
  closeCashSessionWithArqueo,
  commercialStore,
  commitPosSale,
  computeSessionSummary,
  createCashCutX,
  createCashRegister,
  createFundTransfer,
  getOpenSessionForRegister,
  openCashSession,
  setActiveRegister,
  voidPosSale,
  type CommitPosSaleInput,
  type SessionFinancialSummary,
} from "./services/commercial-store";
export type {
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
} from "./types";
