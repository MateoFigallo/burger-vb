"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Beef, Bike, Share2, Wheat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStorefront } from "@/features/menu";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { FeaturedCarousel } from "./featured-carousel";
import { useSocialLinks } from "./social-section";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1400&q=80";

const HIGHLIGHTS = [
  { icon: Beef, label: "Carne 100% vacuna" },
  { icon: Wheat, label: "Pan de papa artesanal" },
  { icon: Bike, label: "Delivery o retiro" },
];

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function Hero() {
  const { featured } = useStorefront();
  const socialLinks = useSocialLinks();

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Burger VB · Hamburguesas artesanales",
          text: "Mirá el menú de Burger VB y armá tu pedido online.",
          url: shareUrl,
        });
        return;
      } catch {
        // Si el usuario cancela, no mostramos error
      }
    }
    if (shareUrl && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link de la página copiado para compartir");
    }
  }

  return (
    <section id="inicio" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_10%,var(--color-accent),transparent_70%)]"
      />
      <div
        className={cn(
          PAGE_CONTAINER,
          "grid items-center gap-10 py-10 sm:py-14 md:py-20 lg:grid-cols-2 lg:gap-16",
        )}
      >
        <motion.div variants={container} initial="hidden" animate="visible" className="min-w-0">
          <motion.h1
            variants={item}
            className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Hamburguesas de verdad, <span className="text-brand">directo a tu mesa</span>
          </motion.h1>
          <motion.p
            variants={item}
            className="text-muted-foreground mt-5 max-w-xl text-lg text-pretty"
          >
            Carne seleccionada, pan de papa artesanal y salsas de la casa. Armá tu pedido en minutos
            y confirmalo por WhatsApp.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="shadow-primary/25 h-12 w-full rounded-xl px-7 text-base font-semibold shadow-lg sm:w-auto"
              nativeButton={false}
              render={<Link href="#menu" />}
            >
              Ver el menú
              <ArrowRight aria-hidden="true" className="size-5" />
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {socialLinks.map(({ id, name, href, icon: Icon, className }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  title={name}
                  className={cn(
                    "focus-visible:ring-ring/50 grid size-11 place-items-center rounded-xl shadow-xs outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3",
                    className,
                  )}
                >
                  <Icon className="size-5" />
                </a>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleShare}
                aria-label="Compartir página"
                title="Compartir página"
                className="size-11 rounded-xl"
              >
                <Share2 aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </motion.div>
          <motion.ul
            variants={item}
            className="mt-10 grid max-w-lg grid-cols-1 gap-4 min-[380px]:grid-cols-3 min-[380px]:gap-3"
          >
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex min-w-0 items-center gap-3 text-sm font-medium min-[380px]:flex-col min-[380px]:items-start min-[380px]:gap-2"
              >
                <span className="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-xl">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="break-words">{label}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          {featured.length > 0 ? (
            <FeaturedCarousel products={featured} />
          ) : (
            <div className="relative mx-auto w-full max-w-xl">
              <div
                aria-hidden="true"
                className="bg-primary/20 absolute -inset-6 -z-10 rounded-[3rem] blur-3xl"
              />
              <div className="ring-foreground/10 relative aspect-4/3 overflow-hidden rounded-[2rem] shadow-2xl ring-1">
                <Image
                  src={HERO_IMAGE}
                  alt="Hamburguesa doble con cheddar acompañada de papas fritas"
                  fill
                  preload
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
