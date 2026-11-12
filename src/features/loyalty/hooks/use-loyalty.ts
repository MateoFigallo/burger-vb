"use client";

import { useLocalStore } from "@/lib/use-local-store";
import {
  couponsStore,
  giftCardsStore,
  loyaltyStore,
  redemptionsStore,
  walletMovementsStore,
} from "../services/loyalty-store";
import type {
  DiscountCoupon,
  GiftCard,
  LoyaltySettings,
  Redemption,
  WalletMovement,
} from "../types";

export function useLoyaltySettings(): LoyaltySettings {
  return useLocalStore(loyaltyStore);
}

export function useRedemptions(): Redemption[] {
  return useLocalStore(redemptionsStore);
}

export function useWalletMovements(): WalletMovement[] {
  return useLocalStore(walletMovementsStore);
}

export function useGiftCards(): GiftCard[] {
  return useLocalStore(giftCardsStore);
}

export function useDiscountCoupons(): DiscountCoupon[] {
  return useLocalStore(couponsStore);
}
