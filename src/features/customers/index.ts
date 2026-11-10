export type {
  Customer,
  CustomerAccount,
  CustomerInput,
  CustomerSegment,
  SegmentOptions,
} from "./types";
export {
  createCustomer,
  deleteCustomer,
  findCustomer,
  findCustomerByUsername,
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
export { useCustomers } from "./hooks/use-customers";
