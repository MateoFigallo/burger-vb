export type { LoyaltySettings, Redemption, Reward } from "./types";
export {
  MAX_STAMPS,
  MIN_STAMPS,
  addReward,
  redeemReward,
  removeReward,
  setStampsRequired,
} from "./services/loyalty-store";
export { useLoyaltySettings, useRedemptions } from "./hooks/use-loyalty";
export { StampCard } from "./components/stamp-card";
