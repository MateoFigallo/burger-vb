"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryVisibility,
  type Category,
  type Product,
} from "@/features/menu";
import { ConfirmDialog } from "../shared/confirm-dialog";

type CategoriesCardProps = {
  categories: Category[];
  products: Product[];
};

export function CategoriesCard({ categories, products }: CategoriesCardProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);

  function countProducts(categoryId: string) {
    return products.filter((product) => product.categoryId === categoryId).length;
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createCategory(newName);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNewName("");
    toast.success(`Creaste la categoría ${result.category.name}`);
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    const result = renameCategory(editingId, editingName);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEditingId(null);
  }

  function handleDelete(category: Category) {
    if (deleteCategory(category.id)) {
      toast.success(`Eliminaste la categoría ${category.name}`);
    } else {
      toast.error("La categoría tiene productos. Movelos o eliminalos primero.");
    }
  }

  return (
    <section aria-labelledby="categories-title" className="bg-card rounded-2xl border shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 id="categories-title" className="text-lg font-bold">
          Categorías
        </h2>
        <p className="text-muted-foreground text-sm">Elegí cuáles se muestran en el inicio.</p>
      </div>

      <ul className="divide-y">
        <AnimatePresence initial={false}>
          {categories.map((category) => {
            const total = countProducts(category.id);
            const isEditing = editingId === category.id;

            return (
              <motion.li
                key={category.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-5 py-2">
                  {isEditing ? (
                    <form onSubmit={handleRename} className="flex flex-1 items-center gap-1">
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        aria-label={`Nuevo nombre para ${category.name}`}
                        className="h-11"
                        maxLength={32}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="size-11 shrink-0"
                        aria-label="Guardar nombre"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0"
                        aria-label="Cancelar"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{category.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {total === 1 ? "1 producto" : `${total} productos`}
                          {!category.visible && " · Oculta"}
                        </p>
                      </div>
                      <Switch
                        checked={category.visible}
                        onCheckedChange={(checked) => setCategoryVisibility(category.id, checked)}
                        aria-label={`Mostrar ${category.name} en el inicio`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11"
                        aria-label={`Renombrar ${category.name}`}
                        onClick={() => startEditing(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive size-11"
                        aria-label={`Eliminar ${category.name}`}
                        title={total > 0 ? "Primero mové o eliminá sus productos" : undefined}
                        onClick={() =>
                          total > 0
                            ? toast.error(
                                "La categoría tiene productos. Movelos o eliminalos primero.",
                              )
                            : setDeleting(category)
                        }
                      >
                        <Trash className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <form onSubmit={handleCreate} className="flex gap-2 border-t px-5 py-4">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nueva categoría"
          aria-label="Nombre de la nueva categoría"
          className="h-11"
          maxLength={32}
        />
        <Button type="submit" className="h-11 shrink-0 rounded-xl" disabled={!newName.trim()}>
          <Plus aria-hidden="true" className="size-4" />
          Agregar
        </Button>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar ${deleting?.name ?? "la categoría"}?`}
        description="La categoría se borra del menú. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </section>
  );
}
