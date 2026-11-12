"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { customerCreditStore, customersStore } from "../services/customers-store";
import type { Customer, CustomerCreditMovement } from "../types";

export function useCustomers(): Customer[] {
  return useLocalStore(customersStore);
}

export function useCustomerCreditMovements(): CustomerCreditMovement[] {
  return useLocalStore(customerCreditStore);
}
