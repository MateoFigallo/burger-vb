"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { storeStatusStore, type StoreStatus } from "../services/store-status-store";

export function useStoreStatus(): StoreStatus {
  return useLocalStore(storeStatusStore);
}
