"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { businessConfig } from "@/config/business.config";
import { useSession } from "@/features/auth";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adjustProductStock } from "../../services/logistics-store";
import type { InventoryItem, MovementType } from "../../types";

type StockAdjustSheetProps = {
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
};

export function StockAdjustSheet({ item, onOpenChange }: StockAdjustSheetProps) {
  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="text-lg font-bold">
            Ajustar stock · {item?.name ?? ""}
          </SheetTitle>
          <SheetDescription>
            Sumá o restá unidades por recuento, o registrá una merma valorizada al costo.
          </SheetDescription>
        </SheetHeader>
        {item && (
          <StockAdjustForm
            key={item.id}
            item={item}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function StockAdjustForm({
  item,
  onDone,
}: {
  item: InventoryItem;
  onDone: () => void;
}) {
  const { viewer } = useSession();
  const [movementType, setMovementType] = useState<MovementType>("ajuste");
  const [deltaStr, setDeltaStr] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unitShort = businessConfig.logistics.units[item.unit].short;
  const parsedRaw = Number.parseFloat(deltaStr.replace(",", "."));
  const effectiveDelta = Number.isFinite(parsedRaw)
    ? movementType === "ajuste"
      ? parsedRaw
      : -Math.abs(parsedRaw)
    : 0;
  const projectedStock = Math.round((item.stock + effectiveDelta) * 1000) / 1000;
  const isShrinkage = movementType !== "ajuste";
  const shrinkageLoss =
    isShrinkage && effectiveDelta !== 0
      ? Math.round(Math.abs(effectiveDelta) * item.effectiveCost)
      : 0;

  function applyQuickDelta(step: number) {
    const current = Number.isFinite(parsedRaw) ? parsedRaw : 0;
    const next = Math.round((current + step) * 1000) / 1000;
    setDeltaStr(String(next));
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!Number.isFinite(parsedRaw) || parsedRaw === 0) {
      setError("Ingresá una cantidad distinta de cero.");
      return;
    }

    const result = adjustProductStock({
      productId: item.id,
      delta: parsedRaw,
      type: movementType,
      reason,
      user: viewer?.name ?? "Administrador",
    });

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success(
      isShrinkage
        ? `Registraste ${businessConfig.logistics.movementTypes[movementType].toLowerCase()} de ${item.name}`
        : `Actualizaste el stock de ${item.name} (${result.value.newStock} ${unitShort})`,
    );
    onDone();
  }

  const movementItems = Object.fromEntries(
    Object.entries(businessConfig.logistics.movementTypes).map(([k, v]) => [
      k,
      k === "ajuste" ? v : `${v} (resta stock y registra pérdida)`,
    ]),
  );

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

        <div className="bg-muted/40 flex items-center justify-between rounded-2xl border p-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium">Stock actual</p>
            <p
              className={cn(
                "font-heading text-2xl font-extrabold tabular-nums",
                item.stock <= 0 && "text-red-600 dark:text-red-400",
              )}
            >
              {item.stock} {unitShort}
            </p>
          </div>

          {effectiveDelta !== 0 && (
            <>
              <ArrowRight aria-hidden="true" className="text-muted-foreground size-5" />
              <div className="text-right">
                <p className="text-muted-foreground text-xs font-medium">Nuevo stock</p>
                <p
                  className={cn(
                    "font-heading text-2xl font-extrabold tabular-nums",
                    projectedStock < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {projectedStock} {unitShort}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-type">Tipo de movimiento</Label>
          <Select
            items={movementItems}
            value={movementType}
            onValueChange={(val) =>
              setMovementType((val as MovementType) || "ajuste")
            }
          >
            <SelectTrigger id="adj-type" className="h-11! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(businessConfig.logistics.movementTypes).map(
                ([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {code === "ajuste"
                      ? label
                      : `${label} (resta stock y queda como pérdida)`}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-delta">
            {isShrinkage
              ? `Cantidad perdida (${unitShort})`
              : `Cantidad a sumar o restar (usá - para restar)`}
          </Label>
          <Input
            id="adj-delta"
            inputMode="decimal"
            value={deltaStr}
            onChange={(e) => {
              setDeltaStr(e.target.value);
              setError(null);
            }}
            placeholder={isShrinkage ? "Ej.: 2" : "Ej.: +10 o -3"}
            className="h-11 text-base font-bold tabular-nums"
            autoFocus
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {!isShrinkage &&
              [-10, -5, -1].map((step) => (
                <Button
                  key={step}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs font-semibold tabular-nums"
                  onClick={() => applyQuickDelta(step)}
                >
                  <Minus className="size-3" />
                  {Math.abs(step)}
                </Button>
              ))}
            {[1, 5, 10].map((step) => (
              <Button
                key={step}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs font-semibold tabular-nums"
                onClick={() => applyQuickDelta(isShrinkage ? step : step)}
              >
                <Plus className="size-3" />
                {step}
              </Button>
            ))}
          </div>
        </div>

        {isShrinkage && shrinkageLoss > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Pérdida valorizada al costo: {formatPrice(shrinkageLoss)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Se descuenta del stock y queda registrado en Mermas y devoluciones (costo unitario{" "}
              {formatPrice(item.effectiveCost)}).
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="adj-reason">Motivo (obligatorio)</Label>
          <Input
            id="adj-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Ej.: Recuento de cierre, rotura en cocina, consumo del equipo…"
            maxLength={100}
            className="h-11"
            required
          />
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
          Confirmar movimiento
        </Button>
      </div>
    </form>
  );
}
