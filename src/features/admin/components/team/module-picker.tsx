"use client";

import { Check } from "lucide-react";
import { ALL_MODULES, PANEL_MODULES, type ModuleId } from "@/config/panel";
import { cn } from "@/lib/utils";

type ModulePickerProps = {
  legend: string;
  value: ModuleId[];
  onChange: (modules: ModuleId[]) => void;
  compact?: boolean;
};

/** Casillas para elegir qué módulos del panel puede usar alguien. */
export function ModulePicker({ legend, value, onChange, compact = false }: ModulePickerProps) {
  function toggle(module: ModuleId) {
    onChange(
      value.includes(module)
        ? value.filter((item) => item !== module)
        : ALL_MODULES.filter((item) => item === module || value.includes(item)),
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className={cn("grid gap-2", compact ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {ALL_MODULES.map((module) => {
          const checked = value.includes(module);
          return (
            <label
              key={module}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                "has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-ring/50 has-focus-visible:ring-3",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(module)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                  checked ? "bg-primary border-primary text-primary-foreground" : "bg-background",
                )}
              >
                {checked && <Check className="size-3.5" />}
              </span>
              <span>
                <span className="block text-sm font-medium">{PANEL_MODULES[module].label}</span>
                {!compact && (
                  <span className="text-muted-foreground block text-xs">
                    {PANEL_MODULES[module].description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
