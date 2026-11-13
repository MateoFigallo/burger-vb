"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PAGE_CONTAINER } from "@/lib/layout";
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
    <section id="menu" aria-labelledby="menu-title" className="py-14 md:py-20">
      <div className={PAGE_CONTAINER}>
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
          <motion.ul
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {visibleProducts.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}
