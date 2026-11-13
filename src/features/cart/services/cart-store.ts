import { createLocalStore } from "@/lib/local-store";
import type { CartItem, CartProductInput } from "../types";

const MAX_QUANTITY = 20;

export const cartStore = createLocalStore<CartItem[]>("burger-vb:cart", []);

/** Si el panel del carrito está abierto. Vive solo en memoria. */
export const cartOpenStore = createLocalStore<boolean>("burger-vb:cart-open", false, "memory");

export function addToCart(product: CartProductInput) {
  cartStore.set((items) => {
    const existing = items.find((item) => item.productId === product.id);
    if (existing) {
      return items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
          : item,
      );
    }
    return [
      ...items,
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      },
    ];
  });
}

export function changeQuantity(productId: string, delta: number) {
  cartStore.set((items) =>
    items
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.quantity + delta, MAX_QUANTITY) }
          : item,
      )
      .filter((item) => item.quantity > 0),
  );
}

export function removeFromCart(productId: string) {
  cartStore.set((items) => items.filter((item) => item.productId !== productId));
}

export function restoreCartItem(restored: CartItem) {
  cartStore.set((items) => {
    const existing = items.find((item) => item.productId === restored.productId);
    if (existing) {
      return items.map((item) =>
        item.productId === restored.productId
          ? { ...item, quantity: Math.min(item.quantity + restored.quantity, MAX_QUANTITY) }
          : item,
      );
    }
    return [...items, restored];
  });
}

export function clearCart() {
  cartStore.set(() => []);
}

export function setCartOpen(open: boolean) {
  cartOpenStore.set(() => open);
}

export { MAX_QUANTITY };
