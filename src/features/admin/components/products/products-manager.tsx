"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { List, Plus, RotateCcw, Sparkles, Tags } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MAX_FEATURED, resetCatalog, useCatalog, type Product } from "@/features/menu";
import { CategoriesCard } from "./categories-card";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { ProductForm } from "./product-form";
import { ProductsTable } from "./products-table";
import { SectionTabs } from "../shared/section-tabs";

type FormTarget = { mode: "create" } | { mode: "edit"; product: Product };

export function ProductsManager() {
  const { categories, products } = useCatalog();
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [view, setView] = useState<"list" | "categories">("list");
  const featuredCount = products.filter((product) => product.featured).length;

  function openForm(target: FormTarget) {
    setFormKey((key) => key + 1);
    setFormTarget(target);
  }

  const editingProduct = formTarget?.mode === "edit" ? formTarget.product : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Productos</h1>
          <p className="text-muted-foreground mt-1">
            Creá productos y categorías, cambiá precios y elegí las promos del inicio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Restablecer
          </Button>
          <Button
            className="h-11 rounded-xl font-semibold"
            onClick={() => openForm({ mode: "create" })}
            disabled={categories.length === 0}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nuevo producto
          </Button>
        </div>
      </motion.div>

      <div className="bg-accent text-accent-foreground flex items-center gap-3 rounded-2xl px-5 py-3 text-sm">
        <Sparkles aria-hidden="true" className="size-5 shrink-0" />
        <p>
          <span className="font-semibold">
            {featuredCount} de {MAX_FEATURED} promos destacadas.
          </span>{" "}
          Tocá la estrella de un producto para mostrarlo en el carrusel del inicio.
        </p>
      </div>

      <SectionTabs
        id="products"
        label="Vista de productos"
        value={view}
        onChange={setView}
        tabs={[
          { value: "list", label: "Listado", icon: List, count: products.length },
          { value: "categories", label: "Categorías", icon: Tags, count: categories.length },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {view === "list" ? (
            <ProductsTable
              categories={categories}
              products={products}
              onEdit={(product) => openForm({ mode: "edit", product })}
            />
          ) : (
            <div className="max-w-3xl">
              <CategoriesCard categories={categories} products={products} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Sheet open={formTarget !== null} onOpenChange={(open) => !open && setFormTarget(null)}>
        <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 pr-14">
            <SheetTitle className="text-lg font-bold">
              {editingProduct ? `Editar ${editingProduct.name}` : "Nuevo producto"}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? "Los cambios se ven al instante en la tienda."
                : "Completá los datos y se suma al menú."}
            </SheetDescription>
          </SheetHeader>
          {formTarget && (
            <ProductForm
              key={formKey}
              product={editingProduct}
              categories={categories}
              onDone={() => setFormTarget(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Restablecer el menú?"
        description="Se vuelven a cargar los productos y categorías de fábrica. Se pierden los productos, categorías y precios que cambiaste."
        confirmLabel="Restablecer"
        onConfirm={() => {
          resetCatalog();
          toast.success("Restableciste el menú de fábrica");
        }}
      />
    </div>
  );
}
