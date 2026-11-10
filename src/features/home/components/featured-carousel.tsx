"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { AddToCartButton } from "@/features/cart";
import { DiscountBadge, ProductPrice, getFinalPrice, type Product } from "@/features/menu";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 60;

const slideVariants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0.4 }),
};

type FeaturedCarouselProps = {
  products: Product[];
};

export function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const count = products.length;
  const current = products[index % count];
  const position = (index % count) + 1;

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((value) => (value + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion]);

  function goTo(nextIndex: number, nextDirection: number) {
    setDirection(nextDirection);
    setIndex((nextIndex + count) % count);
  }

  if (!current) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Promos destacadas"
      className="relative mx-auto w-full max-w-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        aria-hidden="true"
        className="bg-primary/20 absolute -inset-6 -z-10 rounded-[3rem] blur-3xl"
      />

      <div className="ring-foreground/10 relative aspect-4/5 overflow-hidden rounded-[2rem] bg-black shadow-2xl ring-1 sm:aspect-4/3">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) goTo(index + 1, 1);
              else if (info.offset.x > SWIPE_THRESHOLD) goTo(index - 1, -1);
            }}
            role="group"
            aria-roledescription="promo"
            aria-label={`${position} de ${count}: ${current.name}`}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <ProductImage
              src={current.image}
              alt={current.name}
              sizes="(min-width: 1024px) 560px, 100vw"
              preload={position === 1}
              className="pointer-events-none select-none"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white sm:p-7">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {current.badge || "Destacado"}
                </span>
                <DiscountBadge discountPercent={current.discountPercent} />
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl leading-tight font-extrabold text-balance sm:text-3xl">
                    {current.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-white/85">{current.description}</p>
                </div>
                <ProductPrice
                  price={current.price}
                  discountPercent={current.discountPercent}
                  className="text-2xl text-white sm:text-3xl"
                  compareClassName="text-white/70"
                />
              </div>
              <div className="sm:w-56">
                <AddToCartButton
                  product={{
                    id: current.id,
                    name: current.name,
                    price: getFinalPrice(current),
                    image: current.image,
                  }}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1, -1)}
              aria-label="Promo anterior"
              className="bg-background/85 text-foreground hover:bg-background focus-visible:ring-ring/50 absolute top-1/3 left-3 grid size-11 place-items-center rounded-full shadow-lg backdrop-blur outline-none focus-visible:ring-3"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1, 1)}
              aria-label="Promo siguiente"
              className="bg-background/85 text-foreground hover:bg-background focus-visible:ring-ring/50 absolute top-1/3 right-3 grid size-11 place-items-center rounded-full shadow-lg backdrop-blur outline-none focus-visible:ring-3"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-1">
          {products.map((product, dotIndex) => {
            const active = dotIndex === index % count;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => goTo(dotIndex, dotIndex > index % count ? 1 : -1)}
                aria-label={`Ver promo ${dotIndex + 1}: ${product.name}`}
                aria-current={active ? "true" : undefined}
                className="group focus-visible:ring-ring/50 grid h-11 w-8 place-items-center rounded-full outline-none focus-visible:ring-3"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    active ? "bg-primary w-7" : "bg-foreground/25 group-hover:bg-foreground/40 w-2",
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
