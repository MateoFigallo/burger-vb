"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStorefront } from "../hooks/use-catalog";
import type { CategoryFilter, CategoryOption } from "../types";
import { CategoryTabs } from "./category-tabs";
import { ProductCard } from "./product-card";

const ALL: CategoryFilter = "todos";

export function MenuSection() {
  const { categories, products } = useStorefront();
  const [selected, setSelected] = useState<CategoryFilter>(ALL);

  const options = useMemo<CategoryOption[]>(
    () => [
      { id: ALL, label: "Todo" },
      ...categories.map((category) => ({ id: category.id, label: category.name })),
    ],
    [categories],
  );

  // Si el administrador oculta la categoría elegida, volvemos a "Todo".
  const active = options.some((option) => option.id === selected) ? selected : ALL;
  const visibleProducts =
    active === ALL ? products : products.filter((product) => product.categoryId === active);

  return (
    <section id="menu" aria-labelledby="menu-title" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <p className="text-brand text-sm font-semibold tracking-widest uppercase">Nuestro menú</p>
          <h2 id="menu-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Elegí tu próxima hamburguesa
          </h2>
          <p className="text-muted-foreground mt-3 text-pretty">
            Todo se cocina al momento con ingredientes frescos. Sumá lo que quieras y confirmá tu
            pedido por WhatsApp.
          </p>
        </motion.div>

        {options.length > 2 && (
          <CategoryTabs options={options} value={active} onChange={setSelected} />
        )}

        {visibleProducts.length === 0 ? (
          <p className="text-muted-foreground mt-10 text-center">
            Estamos actualizando el menú. Volvé en un ratito.
          </p>
        ) : (
          <motion.ul layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((product, index) => (
                <motion.li
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
