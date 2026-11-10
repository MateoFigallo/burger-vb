"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Cake, Gift, LogOut, Mail, MessageCircle, Phone, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { signOut, useSession } from "@/features/auth";
import { StampCard, useLoyaltySettings } from "@/features/loyalty";
import { STATUS_LABELS, useOrders } from "@/features/orders";
import { formatBirthday } from "@/lib/dates";
import { formatDateTime, formatPrice } from "@/lib/format";
import { normalizePhone } from "@/lib/ids";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export function AccountPage() {
  const router = useRouter();
  const { viewer } = useSession();
  const { stampsRequired, rewards } = useLoyaltySettings();
  const orders = useOrders();

  if (viewer?.kind !== "customer") return null;
  const { customer } = viewer;
  const firstName = customer.name.split(" ")[0];
  const canRedeem = customer.stamps >= stampsRequired;
  const missing = Math.max(0, stampsRequired - customer.stamps);
  const phone = normalizePhone(customer.phone);
  const myOrders = orders.filter(
    (order) =>
      order.customerId === customer.id ||
      (phone.length >= 8 && normalizePhone(order.customerPhone ?? "") === phone),
  );

  function handleSignOut() {
    signOut();
    toast.success("Cerraste sesión");
    router.push("/");
  }

  function redeemUrl(rewardName: string) {
    return getWhatsAppUrl(
      siteConfig.whatsappNumber,
      `¡Hola ${siteConfig.name}! Soy ${customer.name} y completé mi tarjeta de sellos 🎉 Quiero canjear: ${rewardName}.`,
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-brand text-sm font-semibold tracking-widest uppercase">Mi cuenta</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            ¡Hola, {firstName}!
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            className="h-11 rounded-xl font-semibold"
            nativeButton={false}
            render={<Link href="/#menu" />}
          >
            <ShoppingBag aria-hidden="true" className="size-4" />
            Hacer un pedido
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={handleSignOut}>
            <LogOut aria-hidden="true" className="size-4" />
            Salir
          </Button>
        </div>
      </motion.div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          aria-labelledby="stamps-title"
          className="bg-card space-y-5 rounded-3xl border p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="stamps-title" className="text-xl font-bold">
                Tu tarjeta de sellos
              </h2>
              <p className="text-muted-foreground text-sm">
                {canRedeem
                  ? "¡Completaste la tarjeta! Elegí tu premio."
                  : `Te ${missing === 1 ? "falta 1 sello" : `faltan ${missing} sellos`} para tu premio. Sumás uno por cada pedido entregado.`}
              </p>
            </div>
            <span className="font-heading text-brand text-3xl font-extrabold tabular-nums">
              {customer.stamps}/{stampsRequired}
            </span>
          </div>
          <StampCard stamps={customer.stamps} stampsRequired={stampsRequired} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-labelledby="profile-title"
          className="bg-card space-y-4 rounded-3xl border p-6 shadow-sm"
        >
          <h2 id="profile-title" className="text-lg font-bold">
            Mis datos
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Phone aria-hidden="true" className="text-brand size-4" />
              {customer.phone}
            </li>
            {customer.email && (
              <li className="flex items-center gap-3">
                <Mail aria-hidden="true" className="text-brand size-4" />
                {customer.email}
              </li>
            )}
            {customer.birthday && (
              <li className="flex items-center gap-3">
                <Cake aria-hidden="true" className="text-brand size-4" />
                {formatBirthday(customer.birthday)}
              </li>
            )}
          </ul>
          <p className="text-muted-foreground text-xs">
            Para cambiar tus datos, escribinos por WhatsApp.
          </p>
        </motion.section>
      </div>

      <section aria-labelledby="rewards-title" className="space-y-4">
        <h2 id="rewards-title" className="text-xl font-bold">
          Premios para elegir
        </h2>
        {rewards.length === 0 ? (
          <p className="text-muted-foreground text-sm">Pronto vas a ver los premios acá.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward, index) => (
              <motion.li
                key={reward.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-card overflow-hidden rounded-2xl border shadow-sm"
              >
                <div className="bg-muted relative aspect-video">
                  <ProductImage
                    src={reward.image}
                    alt={reward.name}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="font-semibold">{reward.name}</p>
                  {canRedeem ? (
                    <Button
                      size="sm"
                      className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 h-11 rounded-xl px-3"
                      nativeButton={false}
                      render={
                        <a
                          href={redeemUrl(reward.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <MessageCircle aria-hidden="true" className="size-4" />
                      Canjear
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="h-6">
                      <Gift aria-hidden="true" /> {stampsRequired} sellos
                    </Badge>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="orders-title" className="space-y-4">
        <h2 id="orders-title" className="text-xl font-bold">
          Mis pedidos
        </h2>
        {myOrders.length === 0 ? (
          <p className="bg-card text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center text-sm">
            Cuando hagas un pedido desde la web, lo vas a ver acá.
          </p>
        ) : (
          <ul className="space-y-3">
            {myOrders.map((order) => (
              <li
                key={order.id}
                className="bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {order.id}{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      · {formatDateTime(order.createdAt)}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="h-6">
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="font-heading font-bold tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
