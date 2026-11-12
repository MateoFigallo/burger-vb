"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Archive, Check, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessConfig } from "@/config/business.config";
import { cn } from "@/lib/utils";
import {
  executeDeleteOrArchive,
  getDeletePreview,
  saveInventoryCategory,
} from "../../services/logistics-store";
import type { InventoryCategory } from "../../types";

type DeletePreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  mode: "delete" | "archive";
  onCompleted: () => void;
};

export function DeletePreviewSheet({
  open,
  onOpenChange,
  productIds,
  mode,
  onCompleted,
}: DeletePreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            {mode === "delete" ? (
              <>
                <ShieldAlert aria-hidden="true" className="text-destructive size-5" />
                Eliminar o archivar artículos
              </>
            ) : (
              <>
                <Archive aria-hidden="true" className="text-primary size-5" />
                Archivar artículos seleccionados
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            Los artículos con historial (pedidos, compras, presupuestos o movimientos) nunca se
            borran físicamente: se archivan para proteger la integridad de los registros.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <DeletePreviewForm
            key={`${mode}-${productIds.join(",")}`}
            productIds={productIds}
            mode={mode}
            onCancel={() => onOpenChange(false)}
            onCompleted={() => {
              onCompleted();
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DeletePreviewForm({
  productIds,
  mode,
  onCancel,
  onCompleted,
}: {
  productIds: string[];
  mode: "delete" | "archive";
  onCancel: () => void;
  onCompleted: () => void;
}) {
  const preview = useMemo(() => getDeletePreview(productIds), [productIds]);
  const [reason, setReason] = useState("");
  const [archiveReferencedToo, setArchiveReferencedToo] = useState(true);
  const [confirmationWord, setConfirmationWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deletableCount = preview.filter((p) => p.status === "eliminable").length;
  const archivableCount = preview.filter((p) => p.status === "archivable").length;
  const requiresDeleteConfirmation = mode === "delete" && deletableCount > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = executeDeleteOrArchive({
      productIds,
      mode,
      archiveReferencedToo,
      confirmationWord,
      reason,
    });

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    const deletedN = result.value.items.filter((i) => i.outcome === "eliminado").length;
    const archivedN = result.value.items.filter((i) => i.outcome === "archivado").length;
    const parts: string[] = [];
    if (deletedN > 0) parts.push(`${deletedN} eliminado(s)`);
    if (archivedN > 0) parts.push(`${archivedN} archivado(s)`);

    toast.success(
      `Lote ${result.value.batchCode}: ${parts.join(" · ") || "sin cambios"}`,
    );
    onCompleted();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="bg-muted/40 grid grid-cols-3 gap-2 rounded-2xl border p-3.5 text-center text-xs">
          <div>
            <span className="text-muted-foreground block">Seleccionados</span>
            <strong className="font-heading text-base font-extrabold">
              {preview.length}
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground block">Sin historial</span>
            <strong className="font-heading text-base font-extrabold text-amber-600 dark:text-amber-400">
              {deletableCount}
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground block">Con historial (archivar)</span>
            <strong className="font-heading text-base font-extrabold text-blue-600 dark:text-blue-400">
              {archivableCount}
            </strong>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Artículo</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead className="pr-4">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="pl-4 font-semibold">
                    {item.productName}
                    <span className="text-muted-foreground block text-xs font-normal">
                      Stock: {item.stock}{" "}
                      {businessConfig.logistics.units[item.unit].short}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.status === "eliminable" && mode === "delete" ? (
                      <Badge variant="destructive">Se elimina</Badge>
                    ) : (
                      <Badge variant="secondary">Se archiva</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground pr-4 text-xs whitespace-normal">
                    {item.reasonText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {mode === "delete" && archivableCount > 0 && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5">
            <span className="text-sm">
              Archivar también los <strong>{archivableCount}</strong> artículo(s) que tienen
              historial
            </span>
            <Switch
              checked={archiveReferencedToo}
              onCheckedChange={setArchiveReferencedToo}
            />
          </label>
        )}

        <div className="space-y-2">
          <Label htmlFor="del-reason">Motivo (obligatorio)</Label>
          <Input
            id="del-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Ej.: Producto discontinuado, carga duplicada, cambio de carta…"
            maxLength={120}
            className="h-11"
            required
          />
        </div>

        {requiresDeleteConfirmation && (
          <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
            <Label htmlFor="del-confirm" className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              Para eliminar definitivamente {deletableCount} artículo(s) sin historial, escribí{" "}
              <strong>ELIMINAR</strong>:
            </Label>
            <Input
              id="del-confirm"
              value={confirmationWord}
              onChange={(e) => {
                setConfirmationWord(e.target.value);
                setError(null);
              }}
              placeholder="ELIMINAR"
              autoComplete="off"
              className="h-11 font-mono uppercase"
            />
          </div>
        )}
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={mode === "delete" ? "destructive" : "default"}
          className="h-11 flex-1 rounded-xl font-semibold"
        >
          {mode === "delete" ? (
            <>
              <Trash2 className="size-4" />
              Confirmar operación
            </>
          ) : (
            <>
              <Archive className="size-4" />
              Archivar artículos
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// EDITOR DE CATEGORÍAS DE INVENTARIO CON COLOR Y REGLAS (+18 / ALCOHOL)
// ============================================================================

type CategoryFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: InventoryCategory | null;
};

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
}: CategoryFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="text-lg font-bold">
            {category ? `Editar categoría «${category.name}»` : "Nueva categoría"}
          </SheetTitle>
          <SheetDescription>
            Definí el color identificatorio para el inventario, el diseño y su visibilidad.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <CategoryFormBody
            key={category?.id ?? "new-cat"}
            category={category}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CategoryFormBody({
  category,
  onDone,
}: {
  category: InventoryCategory | null;
  onDone: () => void;
}) {
  const palette = businessConfig.logistics.categoryColors;
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<string>(category?.color ?? palette[0]);
  const [layout, setLayout] = useState<"grid" | "rows" | "bodegas">(
    category?.layout ?? "grid",
  );
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [alcohol, setAlcohol] = useState(category?.alcohol ?? false);
  const [ageRestricted, setAgeRestricted] = useState(
    category?.ageRestricted ?? false,
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = saveInventoryCategory({
      id: category?.id,
      name,
      color,
      layout,
      visible,
      alcohol,
      ageRestricted,
    });

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(
      category
        ? `Actualizaste la categoría ${result.value.name}`
        : `Creaste la categoría ${result.value.name}`,
    );
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cat-name">Nombre de la categoría</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej.: Hamburguesas, Postres, Bebidas…"
            maxLength={40}
            className="h-11"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Color distintivo (inventario y reportes)</Label>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {palette.map((swatch) => {
              const selected = swatch.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Color ${swatch}`}
                  aria-pressed={selected}
                  style={{ backgroundColor: swatch }}
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-white transition-transform",
                    selected ? "ring-foreground scale-110 ring-2 ring-offset-2" : "opacity-80 hover:opacity-100",
                  )}
                >
                  {selected && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cat-layout">Diseño en menú digital</Label>
          <Select
            items={{
              grid: "Grilla visual (tarjetas con foto)",
              rows: "Filas compactas (lista)",
              bodegas: "Agrupado por línea / subgrupo",
            }}
            value={layout}
            onValueChange={(val) =>
              setLayout(
                val === "rows" || val === "bodegas" ? val : "grid",
              )
            }
          >
            <SelectTrigger id="cat-layout" className="h-11! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grilla visual (tarjetas con foto)</SelectItem>
              <SelectItem value="rows">Filas compactas (lista)</SelectItem>
              <SelectItem value="bodegas">Agrupado por línea / subgrupo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y rounded-2xl border">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Mostrar en menú digital</span>
              <span className="text-muted-foreground block text-xs">
                Si se apaga, queda sólo para control interno de inventario.
              </span>
            </span>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Incluye bebidas con alcohol</span>
              <span className="text-muted-foreground block text-xs">
                Identifica artículos sujetos a horario de venta permitido (+18).
              </span>
            </span>
            <Switch checked={alcohol} onCheckedChange={setAlcohol} />
          </label>

          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Sólo mayores de 18 años</span>
              <span className="text-muted-foreground block text-xs">
                Muestra aviso de restricción de edad en esta categoría.
              </span>
            </span>
            <Switch checked={ageRestricted} onCheckedChange={setAgeRestricted} />
          </label>
        </div>
      </div>

      <div className="bg-background flex gap-3 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          onClick={onDone}
        >
          Cancelar
        </Button>
        <Button type="submit" className="h-11 flex-1 rounded-xl font-semibold">
          Guardar categoría
        </Button>
      </div>
    </form>
  );
}
