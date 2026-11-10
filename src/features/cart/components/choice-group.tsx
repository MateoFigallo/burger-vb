import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type ChoiceGroupProps<T extends string> = {
  legend: string;
  name: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Grupo de opciones tipo radio con apariencia de botones. */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {options.map((option) => (
          <label
            key={option.value}
            className="hover:bg-muted has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-ring/50 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors has-focus-visible:ring-3"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
