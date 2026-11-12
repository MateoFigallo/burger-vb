/** Producto que se puede elegir como premio al completar la tarjeta. */
export type Reward = {
  id: string;
  productId: string;
  name: string;
  image: string;
};

export type LoyaltyTierKey = "bronce" | "plata" | "oro";

export type LoyaltyTierConfig = {
  key: LoyaltyTierKey;
  name: string;
  minSpend: number;
  discountPct: number;
  badge: string;
};

export type LoyaltySettings = {
  /** Sellos necesarios para canjear un premio. */
  stampsRequired: number;
  rewards: Reward[];
  /** Configuración de niveles VIP por consumo. */
  tiersEnabled: boolean;
  tiersPeriodDays: number;
  tiers: LoyaltyTierConfig[];
  /** Beneficio automático en el mes/semana de cumpleaños. */
  birthdayEnabled: boolean;
  birthdayDiscountPct: number;
  /** Configuración de Monedero y Cashback del Club. */
  walletEnabled: boolean;
  cashbackEnabled: boolean;
  cashbackPct: number;
  cashbackDays: number[];
  /** Configuración de Gift Cards. */
  giftCardsEnabled: boolean;
  giftCardDefaultMonths: number;
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

export type WalletMovementKind =
  | "carga"
  | "pago"
  | "cashback"
  | "premio"
  | "ajuste"
  | "reverso";

export type WalletMovement = {
  id: string;
  customerId: string;
  customerName: string;
  kind: WalletMovementKind;
  /** Positivo acredita saldo, negativo consume saldo. */
  amount: number;
  paymentMethod?: string;
  reference: string;
  saleId?: string;
  createdAt: string;
  user: string;
};

export type GiftCardStatus = "activa" | "agotada" | "vencida" | "anulada";

export type GiftCard = {
  id: string;
  code: string;
  customerId: string | null;
  customerName: string | null;
  holderName: string;
  buyerName: string;
  message: string;
  initialAmount: number;
  balance: number;
  paymentMethod: string;
  status: "activa" | "anulada";
  voidReason?: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
};

export type DiscountCoupon = {
  id: string;
  code: string;
  description: string;
  type: "porcentaje" | "monto_fijo";
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
};

export type CustomerBenefitEvaluation = {
  kind: "tier" | "cumpleanos" | "cupon" | "ninguno";
  label: string;
  discountAmount: number;
  discountPct: number;
  couponCode?: string;
};
