"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Beef, Bike, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorefront } from "@/features/menu";
import { FeaturedCarousel } from "./featured-carousel";

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

  return (
    <section id="inicio" className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_10%,var(--color-accent),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2 lg:gap-16">
        <motion.div variants={container} initial="hidden" animate="visible">
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
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="shadow-primary/25 h-12 rounded-xl px-6 text-base font-semibold shadow-lg"
              nativeButton={false}
              render={<Link href="#menu" />}
            >
              Ver el menú
              <ArrowRight aria-hidden="true" className="size-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-6 text-base font-semibold"
              nativeButton={false}
              render={<Link href="#como-pedir" />}
            >
              Cómo pedir
            </Button>
          </motion.div>
          <motion.ul variants={item} className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col gap-2 text-sm font-medium">
                <span className="bg-accent text-accent-foreground grid size-10 place-items-center rounded-xl">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {label}
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
