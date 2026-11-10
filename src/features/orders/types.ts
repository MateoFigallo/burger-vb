export type DeliveryMethod = "delivery" | "retiro";

export type PaymentMethod = "efectivo" | "transferencia" | "mercado-pago";

export type OrderStatus = "pendiente" | "preparando" | "enviado" | "entregado" | "cancelado";

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  createdAt: string;
  customerName: string;
  /** WhatsApp del cliente. Los pedidos de versiones anteriores no lo tienen. */
  customerPhone?: string;
  /** Cliente con sesión iniciada, o el que se vinculó al entregar el pedido. */
  customerId?: string | null;
  deliveryMethod: DeliveryMethod;
  address: string;
  paymentMethod: PaymentMethod;
  notes: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  /** Si ya se sumó el sello de este pedido a la tarjeta del cliente. */
  stampAwarded?: boolean;
};

export type NewOrder = Omit<Order, "id" | "createdAt" | "status" | "stampAwarded">;
