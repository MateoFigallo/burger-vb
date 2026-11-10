import type { DeliveryMethod, PaymentMethod } from "@/features/orders";

/** Datos mínimos de un producto para sumarlo al carrito. */
export type CartProductInput = {
  id: string;
  name: string;
  price: number;
  image: string;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export type CheckoutDetails = {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  paymentMethod: PaymentMethod;
  notes: string;
};

export type CheckoutErrors = Partial<Record<"customerName" | "customerPhone" | "address", string>>;
