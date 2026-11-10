"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ClipboardList, Hamburger, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Hamburger,
    title: "Elegí tus favoritas",
    description: "Recorré el menú y sumá al carrito las hamburguesas, papas y bebidas que quieras.",
  },
  {
    icon: ClipboardList,
    title: "Completá tus datos",
    description: "Indicá tu nombre, si es delivery o retiro y cómo vas a pagar.",
  },
  {
    icon: MessageCircle,
    title: "Confirmá por WhatsApp",
    description: "Se abre WhatsApp con tu pedido listo para enviar. Te respondemos al toque.",
  },
];

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function HowItWorks() {
  return (
    <section
      id="como-pedir"
      aria-labelledby="como-pedir-title"
      className="bg-muted/40 border-t py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-brand text-sm font-semibold tracking-widest uppercase">Cómo pedir</p>
          <h2
            id="como-pedir-title"
            className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Tu pedido en tres pasos
          </h2>
        </div>

        <motion.ol
          variants={list}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 md:grid-cols-3"
        >
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <motion.li
              key={title}
              variants={card}
              className="bg-card relative rounded-3xl border p-6 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="font-heading text-primary/10 absolute top-5 right-6 text-5xl font-extrabold"
              >
                {index + 1}
              </span>
              <span className="bg-primary text-primary-foreground shadow-primary/30 grid size-12 place-items-center rounded-2xl shadow-md">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{description}</p>
            </motion.li>
          ))}
        </motion.ol>

        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="h-12 rounded-xl px-8 text-base font-semibold"
            nativeButton={false}
            render={<Link href="#menu" />}
          >
            Empezar mi pedido
          </Button>
        </div>
      </div>
    </section>
  );
}
