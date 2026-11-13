"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStoreStatus } from "@/features/store-status";
import { useCart, useCartOpen } from "../hooks/use-cart";
import { setCartOpen } from "../services/cart-store";
import { CheckoutForm } from "./checkout-form";

export function CartSheet() {
  const open = useCartOpen();
  const { items, count, total } = useCart();
  const { isOpen: storeOpen } = useStoreStatus();

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag aria-hidden="true" className="text-brand size-5" />
            Tu pedido
            {count > 0 && <Badge className="ml-1">{count}</Badge>}
          </SheetTitle>
          <SheetDescription>Revisá tu pedido y envialo por WhatsApp.</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="bg-accent text-accent-foreground grid size-20 place-items-center rounded-full">
              <ShoppingBag aria-hidden="true" className="size-9" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-bold">Tu carrito está vacío</p>
              <p className="text-muted-foreground text-sm">
                Elegí tus hamburguesas favoritas y armá tu pedido.
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 rounded-xl px-6"
              nativeButton={false}
              render={
                <Link
                  href="/#menu"
                  onClick={() => {
                    setCartOpen(false);
                    const menuEl = document.getElementById("menu");
                    if (menuEl) {
                      window.setTimeout(() => menuEl.scrollIntoView({ behavior: "smooth" }), 120);
                    }
                  }}
                />
              }
            >
              Ver el menú
            </Button>
          </div>
        ) : (
          <CheckoutForm items={items} total={total} storeOpen={storeOpen} />
        )}
      </SheetContent>
    </Sheet>
  );
}
