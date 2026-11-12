import { businessConfig } from "@/config/business.config";
import { findCustomer, redeemStamps, type Customer } from "@/features/customers";
import { isBirthdayThisMonth } from "@/lib/dates";
import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type {
  CustomerBenefitEvaluation,
  DiscountCoupon,
  GiftCard,
  GiftCardStatus,
  LoyaltySettings,
  LoyaltyTierConfig,
  Redemption,
  Reward,
  WalletMovement,
} from "../types";

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
  tiersEnabled: true,
  tiersPeriodDays: businessConfig.loyaltyClub.defaultPeriodDays,
  tiers: businessConfig.loyaltyClub.defaultTiers.map((t) => ({ ...t })),
  birthdayEnabled: true,
  birthdayDiscountPct: businessConfig.loyaltyClub.defaultBirthdayDiscountPct,
  walletEnabled: true,
  cashbackEnabled: true,
  cashbackPct: businessConfig.loyaltyClub.defaultCashbackPct,
  cashbackDays: [...businessConfig.loyaltyClub.defaultCashbackDays],
  giftCardsEnabled: true,
  giftCardDefaultMonths: businessConfig.loyaltyClub.defaultGiftCardMonths,
};

const INITIAL_WALLET_MOVEMENTS: WalletMovement[] = [
  {
    id: "wal-01",
    customerId: "cli-ejemplo-01",
    customerName: "Lucía Fernández",
    kind: "carga",
    amount: 25000,
    paymentMethod: "transferencia",
    reference: "Recarga Monedero Club (Transferencia)",
    createdAt: "2026-11-05T20:10:00.000Z",
    user: "Encargado",
  },
  {
    id: "wal-02",
    customerId: "cli-ejemplo-01",
    customerName: "Lucía Fernández",
    kind: "pago",
    amount: -9800,
    reference: "Pago pedido #VB-1039 · Clásica VB + Papas",
    saleId: "pos-sale-02",
    createdAt: "2026-11-07T22:30:00.000Z",
    user: "Caja Mostrador",
  },
  {
    id: "wal-03",
    customerId: "cli-ejemplo-01",
    customerName: "Lucía Fernández",
    kind: "cashback",
    amount: 980,
    reference: "Cashback 10% · Miércoles de Club Burger",
    saleId: "pos-sale-02",
    createdAt: "2026-11-07T22:30:05.000Z",
    user: "Sistema",
  },
  {
    id: "wal-04",
    customerId: "cli-ejemplo-07",
    customerName: "Camila Sánchez",
    kind: "carga",
    amount: 30000,
    paymentMethod: "mercadopago",
    reference: "Recarga Monedero Club (QR Mercado Pago)",
    createdAt: "2026-11-08T21:00:00.000Z",
    user: "Encargado",
  },
];

const INITIAL_GIFT_CARDS: GiftCard[] = [
  {
    id: "gc-01",
    code: "GC-BURG-2026",
    customerId: null,
    customerName: null,
    holderName: "Gonzalo Rivas",
    buyerName: "Sofía Rodríguez",
    message: "¡Feliz cumple Gonza! Disfrutá unas buenas smash burgers 🍔",
    initialAmount: 35000,
    balance: 21500,
    paymentMethod: "transferencia",
    status: "activa",
    createdAt: "2026-10-20T19:30:00.000Z",
    expiresAt: "2027-04-20T23:59:59.000Z",
    createdBy: "Encargado",
  },
  {
    id: "gc-02",
    code: "GC-VIPX-9900",
    customerId: "cli-ejemplo-02",
    customerName: "Martín Gómez",
    holderName: "Martín Gómez",
    buyerName: "Empresa Estudio Sur",
    message: "Voucher regalo fin de mes",
    initialAmount: 20000,
    balance: 20000,
    paymentMethod: "efectivo",
    status: "activa",
    createdAt: "2026-11-04T20:00:00.000Z",
    expiresAt: "2027-05-04T23:59:59.000Z",
    createdBy: "Encargado",
  },
];

const INITIAL_COUPONS: DiscountCoupon[] = [
  {
    id: "cup-01",
    code: "BURGER10",
    description: "10% OFF en combos y hamburguesas dobles",
    type: "porcentaje",
    value: 10,
    minOrderAmount: 12000,
    maxUses: 100,
    usedCount: 18,
    expiresAt: "2026-12-31",
    active: true,
    createdAt: "2026-10-01T18:00:00.000Z",
  },
  {
    id: "cup-02",
    code: "SMASH2500",
    description: "$2.500 de regalo en compras mayores a $20.000",
    type: "monto_fijo",
    value: 2500,
    minOrderAmount: 20000,
    maxUses: 50,
    usedCount: 9,
    expiresAt: "2026-12-15",
    active: true,
    createdAt: "2026-10-15T18:00:00.000Z",
  },
  {
    id: "cup-03",
    code: "NOCHEBURGER15",
    description: "15% OFF exclusivo clientes Club Burger",
    type: "porcentaje",
    value: 15,
    minOrderAmount: 25000,
    maxUses: 40,
    usedCount: 6,
    expiresAt: "2026-11-30",
    active: true,
    createdAt: "2026-11-01T19:00:00.000Z",
  },
];

export const loyaltyStore = createLocalStore<LoyaltySettings>(
  "burger-vb:loyalty-v2",
  DEFAULT_SETTINGS,
);

export const redemptionsStore = createLocalStore<Redemption[]>("burger-vb:redemptions", []);

export const walletMovementsStore = createLocalStore<WalletMovement[]>(
  "burger-vb:wallet-movements-v1",
  INITIAL_WALLET_MOVEMENTS,
);

export const giftCardsStore = createLocalStore<GiftCard[]>(
  "burger-vb:gift-cards-v1",
  INITIAL_GIFT_CARDS,
);

export const couponsStore = createLocalStore<DiscountCoupon[]>(
  "burger-vb:coupons-v1",
  INITIAL_COUPONS,
);

export function setStampsRequired(stamps: number) {
  const value = Math.min(MAX_STAMPS, Math.max(MIN_STAMPS, Math.round(stamps)));
  loyaltyStore.set((settings) => ({ ...settings, stampsRequired: value }));
}

export function updateLoyaltySettings(patch: Partial<LoyaltySettings>) {
  loyaltyStore.set((settings) => ({ ...settings, ...patch }));
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

// ============================================================================
// Niveles VIP (Bronce / Plata / Oro) y Beneficio de Cumpleaños
// ============================================================================

export function getCustomerTier(customer: Customer): {
  current: LoyaltyTierConfig;
  next: LoyaltyTierConfig | null;
  missingForNext: number;
} {
  const settings = loyaltyStore.getSnapshot();
  const tiers = [...(settings.tiers ?? DEFAULT_SETTINGS.tiers)].sort(
    (a, b) => a.minSpend - b.minSpend,
  );
  let current = tiers[0];
  let next: LoyaltyTierConfig | null = null;
  for (const tier of tiers) {
    if (customer.totalSpent >= tier.minSpend) {
      current = tier;
    } else {
      next = tier;
      break;
    }
  }
  return {
    current,
    next,
    missingForNext: next ? Math.max(0, next.minSpend - customer.totalSpent) : 0,
  };
}

/**
 * Regla de Oro 4.3 (raveV2): Nivel VIP, Cumpleaños y Cupón compiten entre sí
 * y se aplica siempre el mayor beneficio para el cliente (no se acumulan).
 */
export function evaluateBestBenefit(options: {
  subtotal: number;
  customer: Customer | null;
  couponCode?: string;
  now?: Date;
}): CustomerBenefitEvaluation {
  const { subtotal, customer, couponCode, now = new Date() } = options;
  if (subtotal <= 0) {
    return { kind: "ninguno", label: "Sin descuento", discountAmount: 0, discountPct: 0 };
  }

  const settings = loyaltyStore.getSnapshot();
  const candidates: CustomerBenefitEvaluation[] = [];

  if (customer && settings.tiersEnabled) {
    const { current } = getCustomerTier(customer);
    if (current.discountPct > 0) {
      candidates.push({
        kind: "tier",
        label: `Nivel ${current.badge} ${current.name} (${current.discountPct}% OFF)`,
        discountAmount: Math.round((subtotal * current.discountPct) / 100),
        discountPct: current.discountPct,
      });
    }
  }

  if (
    customer &&
    settings.birthdayEnabled &&
    settings.birthdayDiscountPct > 0 &&
    isBirthdayThisMonth(customer.birthday, now)
  ) {
    candidates.push({
      kind: "cumpleanos",
      label: `🎂 Beneficio Cumpleaños (${settings.birthdayDiscountPct}% OFF)`,
      discountAmount: Math.round((subtotal * settings.birthdayDiscountPct) / 100),
      discountPct: settings.birthdayDiscountPct,
    });
  }

  if (couponCode && couponCode.trim().length > 0) {
    const normalized = couponCode.trim().toUpperCase();
    const coupon = couponsStore
      .getSnapshot()
      .find((c) => c.code.toUpperCase() === normalized && c.active);
    if (
      coupon &&
      coupon.usedCount < coupon.maxUses &&
      subtotal >= coupon.minOrderAmount &&
      (!coupon.expiresAt || new Date(coupon.expiresAt).getTime() >= now.setHours(0, 0, 0, 0))
    ) {
      const discountAmount =
        coupon.type === "porcentaje"
          ? Math.round((subtotal * coupon.value) / 100)
          : Math.min(subtotal, Math.round(coupon.value));
      const discountPct =
        coupon.type === "porcentaje"
          ? coupon.value
          : Math.round((discountAmount / subtotal) * 100);
      candidates.push({
        kind: "cupon",
        label: `Cupón ${coupon.code} (${coupon.type === "porcentaje" ? `${coupon.value}% OFF` : `-$${coupon.value.toLocaleString("es-AR")}`})`,
        discountAmount,
        discountPct,
        couponCode: coupon.code,
      });
    }
  }

  if (candidates.length === 0) {
    return { kind: "ninguno", label: "Sin descuento", discountAmount: 0, discountPct: 0 };
  }

  candidates.sort((a, b) => b.discountAmount - a.discountAmount);
  return candidates[0];
}

// ============================================================================
// Monedero digital del cliente (saldo derivado de movimientos inmutables)
// ============================================================================

export function getCustomerWalletBalance(customerId: string): number {
  const movements = walletMovementsStore.getSnapshot();
  const sum = movements
    .filter((m) => m.customerId === customerId)
    .reduce((acc, m) => acc + m.amount, 0);
  return Math.max(0, Math.round(sum));
}

export function loadCustomerWallet(input: {
  customerId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  user?: string;
}): { ok: true; movement: WalletMovement; newBalance: number } | { ok: false; error: string } {
  const customer = findCustomer(input.customerId);
  if (!customer) return { ok: false, error: "Cliente no encontrado." };
  const amount = Math.round(input.amount);
  if (amount <= 0) return { ok: false, error: "El importe a cargar debe ser mayor a cero." };
  if (amount > 1_000_000) {
    return { ok: false, error: "El máximo por carga es de $1.000.000." };
  }

  const movement: WalletMovement = {
    id: createId("wal"),
    customerId: customer.id,
    customerName: customer.name,
    kind: "carga",
    amount,
    paymentMethod: input.paymentMethod,
    reference: input.reference?.trim() || `Recarga Monedero (${input.paymentMethod})`,
    createdAt: new Date().toISOString(),
    user: input.user ?? "Mostrador",
  };

  walletMovementsStore.set((list) => [movement, ...list]);
  return {
    ok: true,
    movement,
    newBalance: getCustomerWalletBalance(customer.id),
  };
}

export function spendCustomerWallet(input: {
  customerId: string;
  amount: number;
  saleId: string;
  reference: string;
  user?: string;
}): { ok: true; cashbackAwarded: number } | { ok: false; error: string } {
  const customer = findCustomer(input.customerId);
  if (!customer) return { ok: false, error: "Identificá al cliente para usar su monedero." };
  const amount = Math.round(input.amount);
  if (amount <= 0) return { ok: false, error: "Importe inválido para monedero." };

  const currentBalance = getCustomerWalletBalance(customer.id);
  if (currentBalance < amount) {
    return {
      ok: false,
      error: `Saldo insuficiente en monedero de ${customer.name} ($${currentBalance.toLocaleString("es-AR")}).`,
    };
  }

  const spendMov: WalletMovement = {
    id: createId("wal"),
    customerId: customer.id,
    customerName: customer.name,
    kind: "pago",
    amount: -amount,
    reference: input.reference,
    saleId: input.saleId,
    createdAt: new Date().toISOString(),
    user: input.user ?? "Mostrador",
  };

  const settings = loyaltyStore.getSnapshot();
  let cashbackAwarded = 0;
  const newMovements: WalletMovement[] = [spendMov];

  if (settings.cashbackEnabled && settings.cashbackPct > 0) {
    cashbackAwarded = Math.round((amount * settings.cashbackPct) / 100);
    if (cashbackAwarded > 0) {
      newMovements.unshift({
        id: createId("wal"),
        customerId: customer.id,
        customerName: customer.name,
        kind: "cashback",
        amount: cashbackAwarded,
        reference: `Cashback ${settings.cashbackPct}% Club Burger · ${input.reference}`,
        saleId: input.saleId,
        createdAt: new Date().toISOString(),
        user: "Sistema",
      });
    }
  }

  walletMovementsStore.set((list) => [...newMovements, ...list]);
  return { ok: true, cashbackAwarded };
}

// ============================================================================
// Gift Cards y Vouchers
// ============================================================================

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GC-${part1}-${part2}`;
}

export function getGiftCardStatus(card: GiftCard, nowMs: number = Date.now()): GiftCardStatus {
  if (card.status === "anulada") return "anulada";
  if (new Date(card.expiresAt).getTime() < nowMs) return "vencida";
  if (card.balance <= 0) return "agotada";
  return "activa";
}

export function findGiftCardByCode(code: string): GiftCard | undefined {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  return giftCardsStore
    .getSnapshot()
    .find(
      (g) =>
        g.code.toUpperCase() === normalized ||
        g.code.replace(/-/g, "").toUpperCase() === normalized.replace(/-/g, ""),
    );
}

export function createGiftCard(input: {
  customerId: string | null;
  holderName: string;
  buyerName: string;
  message: string;
  amount: number;
  paymentMethod: string;
  months?: number;
  createdBy?: string;
}): { ok: true; giftCard: GiftCard } | { ok: false; error: string } {
  const amount = Math.round(input.amount);
  if (amount <= 0) return { ok: false, error: "El valor de la Gift Card debe ser mayor a cero." };
  if (amount > 500_000) return { ok: false, error: "El valor máximo por Gift Card es $500.000." };

  const customer = input.customerId ? findCustomer(input.customerId) : undefined;
  const months =
    input.months ?? loyaltyStore.getSnapshot().giftCardDefaultMonths ?? 6;
  const expiresAt = new Date(Date.now() + months * 30 * 86_400_000).toISOString();

  const giftCard: GiftCard = {
    id: createId("gc"),
    code: generateGiftCardCode(),
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    holderName: input.holderName.trim() || customer?.name || "Al portador",
    buyerName: input.buyerName.trim(),
    message: input.message.trim(),
    initialAmount: amount,
    balance: amount,
    paymentMethod: input.paymentMethod,
    status: "activa",
    createdAt: new Date().toISOString(),
    expiresAt,
    createdBy: input.createdBy ?? "Encargado",
  };

  giftCardsStore.set((list) => [giftCard, ...list]);
  return { ok: true, giftCard };
}

export function redeemGiftCardBalance(input: {
  code: string;
  amount: number;
  customerId?: string | null;
}): { ok: true; giftCard: GiftCard } | { ok: false; error: string } {
  const card = findGiftCardByCode(input.code);
  if (!card) return { ok: false, error: "No existe una Gift Card con ese código." };
  const status = getGiftCardStatus(card);
  if (status !== "activa") {
    return { ok: false, error: `La Gift Card ${card.code} está ${status}.` };
  }
  if (card.customerId && card.customerId !== input.customerId) {
    return {
      ok: false,
      error: `La Gift Card ${card.code} es nominativa de ${card.customerName}.`,
    };
  }
  const amount = Math.round(input.amount);
  if (amount <= 0 || amount > card.balance) {
    return {
      ok: false,
      error: `Saldo insuficiente en Gift Card ${card.code} (disponible: $${card.balance.toLocaleString("es-AR")}).`,
    };
  }

  const updated: GiftCard = {
    ...card,
    balance: card.balance - amount,
  };
  giftCardsStore.set((list) => list.map((g) => (g.id === card.id ? updated : g)));
  return { ok: true, giftCard: updated };
}

export function voidGiftCard(giftCardId: string, reason: string): boolean {
  const card = giftCardsStore.getSnapshot().find((g) => g.id === giftCardId);
  if (!card || card.status === "anulada" || card.balance !== card.initialAmount) return false;
  giftCardsStore.set((list) =>
    list.map((g) =>
      g.id === giftCardId ? { ...g, status: "anulada", voidReason: reason.trim() } : g,
    ),
  );
  return true;
}

// ============================================================================
// Cupones de descuento
// ============================================================================

export function createDiscountCoupon(input: {
  code: string;
  description: string;
  type: "porcentaje" | "monto_fijo";
  value: number;
  minOrderAmount: number;
  maxUses: number;
  expiresAt: string;
}): { ok: true; coupon: DiscountCoupon } | { ok: false; error: string } {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (code.length < 3) return { ok: false, error: "El código debe tener al menos 3 caracteres." };
  if (couponsStore.getSnapshot().some((c) => c.code.toUpperCase() === code)) {
    return { ok: false, error: "Ya existe un cupón con ese código." };
  }
  if (input.value <= 0) return { ok: false, error: "El valor del descuento debe ser mayor a cero." };
  if (input.type === "porcentaje" && input.value > 80) {
    return { ok: false, error: "El descuento porcentual no puede superar el 80%." };
  }

  const coupon: DiscountCoupon = {
    id: createId("cup"),
    code,
    description: input.description.trim() || `Descuento ${code}`,
    type: input.type,
    value: Math.round(input.value),
    minOrderAmount: Math.max(0, Math.round(input.minOrderAmount)),
    maxUses: Math.max(1, Math.round(input.maxUses)),
    usedCount: 0,
    expiresAt: input.expiresAt,
    active: true,
    createdAt: new Date().toISOString(),
  };

  couponsStore.set((list) => [coupon, ...list]);
  return { ok: true, coupon };
}

export function toggleCouponActive(couponId: string, active: boolean) {
  couponsStore.set((list) =>
    list.map((c) => (c.id === couponId ? { ...c, active } : c)),
  );
}

export function deleteCoupon(couponId: string) {
  couponsStore.set((list) => list.filter((c) => c.id !== couponId));
}

export function consumeCouponByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  couponsStore.set((list) =>
    list.map((c) =>
      c.code.toUpperCase() === normalized ? { ...c, usedCount: c.usedCount + 1 } : c,
    ),
  );
}
