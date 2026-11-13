"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgePercent,
  Cake,
  Crown,
  Gift,
  Sparkles,
  Ticket,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessConfig } from "@/config/business.config";
import { openAuthSheet, useSession } from "@/features/auth";
import { StampCard, useLoyaltySettings } from "@/features/loyalty";
import { formatCurrency } from "@/lib/format";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

const TIER_STYLES: Record<string, string> = {
  bronce: "from-amber-700/90 to-orange-900/90",
  plata: "from-slate-400/90 to-slate-600/90",
  oro: "from-yellow-400/90 to-amber-600/90",
};

type Perk = { icon: LucideIcon; title: string; text: string; tone: string };

export function LoyaltyShowcase() {
  const { viewer } = useSession();
  const settings = useLoyaltySettings();
  const club = businessConfig.loyaltyClub;

  const stampsRequired = settings.stampsRequired ?? 10;
  const tiers = settings.tiers?.length ? settings.tiers : club.defaultTiers;
  const birthdayPct = settings.birthdayDiscountPct ?? club.defaultBirthdayDiscountPct;
  const cashbackPct = settings.cashbackPct ?? club.defaultCashbackPct;
  const cashbackDays = settings.cashbackDays ?? club.defaultCashbackDays;
  const rewardName = settings.rewards?.[0]?.name;
  const isCustomer = viewer?.kind === "customer";

  const perks: Perk[] = [
    {
      icon: Gift,
      title: `Sumá sellos`,
      text: `Cada compra suma un sello. Con ${stampsRequired} ${rewardName ? `te llevás ${rewardName}` : "canjeás un premio"}.`,
      tone: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    },
    {
      icon: Wallet,
      title: `${cashbackPct}% de reintegro`,
      text: `Los ${cashbackDays.map((d) => WEEK_DAYS[d] ?? "").join(" y ")} te devolvemos parte de tu compra en el monedero.`,
      tone: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Cake,
      title: `${birthdayPct}% en tu cumple`,
      text: "Un descuento automático para festejar en tu semana de cumpleaños.",
      tone: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    },
    {
      icon: Ticket,
      title: "Cupones exclusivos",
      text: "Promos y códigos que solo reciben los socios del club por WhatsApp.",
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
  ];

  return (
    <section id="club" aria-labelledby="club-title" className="bg-muted/40 border-y py-14 md:py-20">
      <div className={cn(PAGE_CONTAINER, "grid items-center gap-10 lg:grid-cols-2 lg:gap-14")}>
        {/* Registro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="min-w-0"
        >
          <p className="text-brand inline-flex items-center gap-2 text-sm font-semibold tracking-widest uppercase">
            <Sparkles aria-hidden="true" className="size-4" />
            Club {businessConfig.site.name}
          </p>
          <h2 id="club-title" className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Registrate gratis y empezá a ganar en cada pedido
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-pretty">
            Con tu cuenta pedís más rápido, guardás tu dirección y accedés a todos los beneficios
            del club.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {perks.map(({ icon: Icon, title, text, tone }) => (
              <li key={title} className="bg-card flex min-w-0 gap-3 rounded-2xl border p-4 shadow-xs">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold break-words">{title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm text-pretty break-words">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isCustomer ? (
              <Button
                size="lg"
                className="h-12 rounded-xl px-6 text-base font-semibold"
                nativeButton={false}
                render={<Link href="/mi-cuenta" />}
              >
                Ver mi tarjeta y beneficios
                <ArrowRight aria-hidden="true" className="size-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="shadow-primary/25 h-12 rounded-xl px-6 text-base font-semibold shadow-lg"
                onClick={() => openAuthSheet("register")}
              >
                <UserPlus aria-hidden="true" className="size-5" />
                Crear mi cuenta gratis
              </Button>
            )}
          </div>
        </motion.div>

        {/* Tarjeta de ejemplo + niveles + cupón */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
          className="relative min-w-0"
          aria-label="Ejemplo de tarjeta de fidelidad"
        >
          <div aria-hidden="true" className="bg-primary/20 absolute -inset-6 -z-10 rounded-[3rem] blur-3xl" />

          <div className="from-primary via-primary to-rose-800 text-primary-foreground relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 shadow-2xl sm:p-7">
            <div aria-hidden="true" className="absolute -top-20 -right-16 size-56 rounded-full bg-white/10" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-10 size-48 rounded-full bg-black/15" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
                  Tarjeta de ejemplo
                </p>
                <p className="font-heading text-2xl font-extrabold break-words">Sofía · Socia Oro</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                <Crown aria-hidden="true" className="size-3.5" />
                Nivel Oro
              </span>
            </div>

            <div className="relative mt-6 rounded-2xl bg-white/95 p-4 text-zinc-900 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold">
                <span>Tus sellos</span>
                <span className="tabular-nums">
                  {Math.max(stampsRequired - 3, 0)} / {stampsRequired}
                </span>
              </div>
              <StampCard stamps={Math.max(stampsRequired - 3, 0)} stampsRequired={stampsRequired} size="sm" />
            </div>

            <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase opacity-85">
                  <Wallet aria-hidden="true" className="size-3.5" />
                  Monedero
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatCurrency(4850)}</p>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-white/40 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase opacity-85">
                  <BadgePercent aria-hidden="true" className="size-3.5" />
                  Cupón de socio
                </p>
                <p className="mt-1 text-2xl font-extrabold">-{birthdayPct}% OFF</p>
              </div>
            </div>
          </div>

          <ol className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3" aria-label="Niveles del club">
            {tiers.map((tier) => (
              <li
                key={tier.key}
                className={cn(
                  "min-w-0 rounded-2xl bg-gradient-to-br p-4 text-white shadow-md",
                  TIER_STYLES[tier.key] ?? "from-zinc-500 to-zinc-700",
                )}
              >
                <p className="text-lg font-extrabold">
                  <span aria-hidden="true">{tier.badge}</span> {tier.name}
                </p>
                <p className="text-xs opacity-90">
                  {tier.discountPct > 0 ? `${tier.discountPct}% off siempre` : "Nivel inicial"}
                </p>
                <p className="mt-1 text-[11px] break-words opacity-80">
                  {tier.minSpend > 0 ? `Desde ${formatCurrency(tier.minSpend)}` : "Al registrarte"}
                </p>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
