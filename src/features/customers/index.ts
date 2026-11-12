export type {
  Customer,
  CustomerAccount,
  CustomerCreditMovement,
  CustomerInput,
  CustomerSegment,
  SegmentOptions,
} from "./types";
export {
  createCustomer,
  customerCreditStore,
  customersStore,
  deleteCustomer,
  findCustomer,
  findCustomerByUsername,
  getCustomerCreditLimit,
  getCustomerDebt,
  recordCustomerCreditCharge,
  recordCustomerCreditPayment,
  recordDeliveredOrder,
  redeemStamps,
  setCustomerAccount,
  setCustomerStamps,
  updateCustomerProfile,
  type AccountInput,
} from "./services/customers-store";
export {
  DEFAULT_INACTIVE_DAYS,
  INACTIVE_DAY_OPTIONS,
  SEGMENTS,
  SEGMENT_LABELS,
  filterBySegment,
  isCustomerSegment,
  isInactive,
  matchesSegment,
} from "./services/segments";
export { useCustomerCreditMovements, useCustomers } from "./hooks/use-customers";
