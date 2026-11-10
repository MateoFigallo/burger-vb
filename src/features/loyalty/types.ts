/** Producto que se puede elegir como premio al completar la tarjeta. */
export type Reward = {
  id: string;
  productId: string;
  name: string;
  image: string;
};

export type LoyaltySettings = {
  /** Sellos necesarios para canjear un premio. */
  stampsRequired: number;
  rewards: Reward[];
};

export type Redemption = {
  id: string;
  customerId: string;
  customerName: string;
  rewardName: string;
  stamps: number;
  createdAt: string;
  /** Quién hizo el canje en el panel. */
  redeemedBy: string;
};
