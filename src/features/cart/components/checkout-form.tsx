"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Banknote, Bike, CreditCard, Landmark, MessageCircle, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth";
import type { Customer } from "@/features/customers";
import { createOrder, type DeliveryMethod, type PaymentMethod } from "@/features/orders";
import { formatPrice } from "@/lib/format";
import { clearCart, setCartOpen } from "../services/cart-store";
import { getOrderWhatsAppUrl, validateCheckout } from "../services/checkout-service";
import type { CartItem, CheckoutDetails, CheckoutErrors } from "../types";
import { CartItemRow } from "./cart-item-row";
import { ChoiceGroup, type ChoiceOption } from "./choice-group";

const DELIVERY_OPTIONS: ChoiceOption<DeliveryMethod>[] = [
  { value: "delivery", label: "Delivery", icon: <Bike aria-hidden="true" className="size-4" /> },
  { value: "retiro", label: "Retiro", icon: <Store aria-hidden="true" className="size-4" /> },
];

const PAYMENT_OPTIONS: ChoiceOption<PaymentMethod>[] = [
  {
    value: "efectivo",
    label: "Efectivo",
    icon: <Banknote aria-hidden="true" className="size-4" />,
  },
  {
    value: "transferencia",
    label: "Transferencia",
    icon: <Landmark aria-hidden="true" className="size-4" />,
  },
  {
    value: "mercado-pago",
    label: "Mercado Pago",
    icon: <CreditCard aria-hidden="true" className="size-4" />,
  },
];

function getInitialDetails(customer?: Customer): CheckoutDetails {
  return {
    customerName: customer?.name ?? "",
    customerPhone: customer?.phone ?? "",
    deliveryMethod: "delivery",
    address: "",
    paymentMethod: "efectivo",
    notes: "",
  };
}

type CheckoutFormProps = {
  items: CartItem[];
  total: number;
  storeOpen: boolean;
};

export function CheckoutForm({ items, total, storeOpen }: CheckoutFormProps) {
  const { viewer } = useSession();
  const customer = viewer?.kind === "customer" ? viewer.customer : undefined;
  const [details, setDetails] = useState<CheckoutDetails>(() => getInitialDetails(customer));
  const [errors, setErrors] = useState<CheckoutErrors>({});

  function updateDetails<K extends keyof CheckoutDetails>(key: K, value: CheckoutDetails[K]) {
    setDetails((previous) => ({ ...previous, [key]: value }));
    if (key in errors) setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeOpen) return;

    const nextErrors = validateCheckout(details);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(`checkout-${firstInvalid}`)?.focus();
      return;
    }

    window.open(getOrderWhatsAppUrl(items, total, details), "_blank", "noopener,noreferrer");

    createOrder({
      customerName: details.customerName.trim(),
      customerPhone: details.customerPhone.trim(),
      customerId: customer?.id ?? null,
      deliveryMethod: details.deliveryMethod,
      address: details.deliveryMethod === "delivery" ? details.address.trim() : "",
      paymentMethod: details.paymentMethod,
      notes: details.notes.trim(),
      items: items.map(({ productId, name, price, quantity }) => ({
        productId,
        name,
        price,
        quantity,
      })),
      total,
    });

    clearCart();
    setCartOpen(false);
    setDetails(getInitialDetails(customer));
    toast.success("¡Pedido listo!", {
      description: "Terminá de enviarlo en WhatsApp y te confirmamos enseguida.",
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <ul className="space-y-3" aria-label="Productos del pedido">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <CartItemRow key={item.productId} item={item} />
            ))}
          </AnimatePresence>
        </ul>

        <Separator />

        <div className="space-y-5">
          <h3 className="text-base font-bold">Tus datos</h3>

          <div className="space-y-2">
            <Label htmlFor="checkout-customerName">Nombre</Label>
            <Input
              id="checkout-customerName"
              autoComplete="name"
              placeholder="¿A nombre de quién?"
              className="h-11"
              value={details.customerName}
              onChange={(event) => updateDetails("customerName", event.target.value)}
              aria-invalid={Boolean(errors.customerName)}
              aria-describedby={errors.customerName ? "checkout-customerName-error" : undefined}
            />
            {errors.customerName && (
              <p id="checkout-customerName-error" className="text-destructive text-sm">
                {errors.customerName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-customerPhone">WhatsApp</Label>
            <Input
              id="checkout-customerPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="11 5555 0101"
              className="h-11"
              value={details.customerPhone}
              onChange={(event) => updateDetails("customerPhone", event.target.value)}
              aria-invalid={Boolean(errors.customerPhone)}
              aria-describedby={
                errors.customerPhone
                  ? "checkout-customerPhone-error"
                  : "checkout-customerPhone-hint"
              }
            />
            {errors.customerPhone ? (
              <p id="checkout-customerPhone-error" className="text-destructive text-sm">
                {errors.customerPhone}
              </p>
            ) : (
              <p id="checkout-customerPhone-hint" className="text-muted-foreground text-xs">
                Con tu número sumás sellos para canjear premios.
              </p>
            )}
          </div>

          <ChoiceGroup
            legend="¿Cómo lo recibís?"
            name="deliveryMethod"
            options={DELIVERY_OPTIONS}
            value={details.deliveryMethod}
            onChange={(value) => updateDetails("deliveryMethod", value)}
          />

          <AnimatePresence initial={false}>
            {details.deliveryMethod === "delivery" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 p-0.5">
                  <Label htmlFor="checkout-address">Dirección de entrega</Label>
                  <Input
                    id="checkout-address"
                    autoComplete="street-address"
                    placeholder="Calle, número, piso y depto."
                    className="h-11"
                    value={details.address}
                    onChange={(event) => updateDetails("address", event.target.value)}
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? "checkout-address-error" : undefined}
                  />
                  {errors.address && (
                    <p id="checkout-address-error" className="text-destructive text-sm">
                      {errors.address}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ChoiceGroup
            legend="Forma de pago"
            name="paymentMethod"
            options={PAYMENT_OPTIONS}
            value={details.paymentMethod}
            onChange={(value) => updateDetails("paymentMethod", value)}
            className="sm:grid-cols-3"
          />

          <div className="space-y-2">
            <Label htmlFor="checkout-notes">Notas (opcional)</Label>
            <Textarea
              id="checkout-notes"
              placeholder="Sin cebolla, timbre que no anda, etc."
              rows={3}
              value={details.notes}
              onChange={(event) => updateDetails("notes", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-background space-y-3 border-t px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Total</span>
          <span className="font-heading text-2xl font-extrabold tabular-nums">
            {formatPrice(total)}
          </span>
        </div>
        {details.deliveryMethod === "delivery" && (
          <p className="text-muted-foreground text-xs">
            El costo de envío se confirma por WhatsApp según tu zona.
          </p>
        )}
        {!storeOpen && (
          <p role="alert" className="text-destructive text-sm font-medium">
            El local está cerrado y no estamos tomando pedidos en este momento.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={!storeOpen}
          className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 h-12 w-full rounded-xl text-base font-semibold"
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          Hacer pedido por WhatsApp
        </Button>
      </div>
    </form>
  );
}
