import { redeemStamps, type Customer } from "@/features/customers";
import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type { LoyaltySettings, Redemption, Reward } from "../types";

function unsplashImage(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&q=80`;
}

export const MIN_STAMPS = 3;
export const MAX_STAMPS = 20;

const DEFAULT_SETTINGS: LoyaltySettings = {
  stampsRequired: 10,
  rewards: [
    {
      id: "premio-papas",
      productId: "papas-fritas",
      name: "Papas fritas",
      image: unsplashImage("1630384060421-cb20d0e0649d"),
    },
    {
      id: "premio-limonada",
      productId: "limonada",
      name: "Limonada de la casa",
      image: unsplashImage("1621263764928-df1444c5e859"),
    },
    {
      id: "premio-clasica",
      productId: "clasica-vb",
      name: "Clásica VB",
      image: unsplashImage("1586190848861-99aa4a171e90"),
    },
  ],
};

export const loyaltyStore = createLocalStore<LoyaltySettings>(
  "burger-vb:loyalty",
  DEFAULT_SETTINGS,
);

export const redemptionsStore = createLocalStore<Redemption[]>("burger-vb:redemptions", []);

export function setStampsRequired(stamps: number) {
  const value = Math.min(MAX_STAMPS, Math.max(MIN_STAMPS, Math.round(stamps)));
  loyaltyStore.set((settings) => ({ ...settings, stampsRequired: value }));
}

export function addReward(product: { id: string; name: string; image: string }): boolean {
  const { rewards } = loyaltyStore.getSnapshot();
  if (rewards.some((reward) => reward.productId === product.id)) return false;
  const reward: Reward = {
    id: createId("premio"),
    productId: product.id,
    name: product.name,
    image: product.image,
  };
  loyaltyStore.set((settings) => ({ ...settings, rewards: [...settings.rewards, reward] }));
  return true;
}

export function removeReward(rewardId: string) {
  loyaltyStore.set((settings) => ({
    ...settings,
    rewards: settings.rewards.filter((reward) => reward.id !== rewardId),
  }));
}

/** Canjea un premio: descuenta los sellos y lo deja registrado. */
export function redeemReward(customer: Customer, reward: Reward, redeemedBy: string): boolean {
  const { stampsRequired } = loyaltyStore.getSnapshot();
  if (!redeemStamps(customer.id, stampsRequired)) return false;

  const redemption: Redemption = {
    id: createId("canje"),
    customerId: customer.id,
    customerName: customer.name,
    rewardName: reward.name,
    stamps: stampsRequired,
    createdAt: new Date().toISOString(),
    redeemedBy,
  };
  redemptionsStore.set((list) => [redemption, ...list]);
  return true;
}
