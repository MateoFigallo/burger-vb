"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { customersStore } from "../services/customers-store";
import type { Customer } from "../types";

export function useCustomers(): Customer[] {
  return useLocalStore(customersStore);
}
