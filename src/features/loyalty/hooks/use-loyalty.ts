"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { loyaltyStore, redemptionsStore } from "../services/loyalty-store";
import type { LoyaltySettings, Redemption } from "../types";

export function useLoyaltySettings(): LoyaltySettings {
  return useLocalStore(loyaltyStore);
}

export function useRedemptions(): Redemption[] {
  return useLocalStore(redemptionsStore);
}
