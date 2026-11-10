"use client";

import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Convierte lo escrito en un precio entero. `null` si está vacío. */
export function parsePrice(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

type PriceFieldProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Campo de precio en pesos, sin flechas: se escribe el número y se formatea solo. */
export function PriceField({ value, onValueChange, className, ...props }: PriceFieldProps) {
  const amount = parsePrice(value);

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm">
        $
      </span>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={amount === null ? "" : numberFormatter.format(amount)}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
        className={cn("h-11 pl-7 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}

type InlinePriceEditorProps = {
  price: number;
  label: string;
  onSave: (price: number) => void;
};

/** Precio editable dentro de la tabla: se guarda al salir del campo o con Enter. */
export function InlinePriceEditor({ price, label, onSave }: InlinePriceEditorProps) {
  const [draft, setDraft] = useState(String(price));
  const [savedPrice, setSavedPrice] = useState(price);

  // Si el precio cambia desde otro lugar, reiniciamos el borrador.
  if (price !== savedPrice) {
    setSavedPrice(price);
    setDraft(String(price));
  }

  function commit() {
    const next = parsePrice(draft);
    if (next === null || next <= 0) {
      setDraft(String(price));
      toast.error("Ingresá un precio válido.");
      return;
    }
    if (next !== price) onSave(next);
  }

  return (
    <PriceField
      value={draft}
      onValueChange={setDraft}
      aria-label={label}
      className="w-32"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(String(price));
          event.currentTarget.blur();
        }
      }}
    />
  );
}

type PercentFieldProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Campo de porcentaje, sin flechas. */
export function PercentField({ value, onValueChange, className, ...props }: PercentFieldProps) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, 2))}
        className={cn("h-11 pr-8 tabular-nums", className)}
        {...props}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm">
        %
      </span>
    </div>
  );
}

type InlinePercentEditorProps = {
  value?: number;
  label: string;
  onSave: (value: number | undefined) => void;
};

/** Descuento editable dentro de la tabla: vacío o 0 quita el descuento. */
export function InlinePercentEditor({ value, label, onSave }: InlinePercentEditorProps) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const [savedValue, setSavedValue] = useState(value);

  if (value !== savedValue) {
    setSavedValue(value);
    setDraft(value ? String(value) : "");
  }

  function commit() {
    const next = parsePrice(draft) ?? 0;
    const normalized = next > 0 ? Math.min(next, 90) : undefined;
    setDraft(normalized ? String(normalized) : "");
    if (normalized !== value) onSave(normalized);
  }

  return (
    <PercentField
      value={draft}
      onValueChange={setDraft}
      aria-label={label}
      className="w-20"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value ? String(value) : "");
          event.currentTarget.blur();
        }
      }}
    />
  );
}
