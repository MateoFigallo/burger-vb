"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/features/auth";
import type { Customer } from "@/features/customers";
import { redeemReward, useLoyaltySettings } from "@/features/loyalty";
import { cn } from "@/lib/utils";

type RedeemDialogProps = {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
};

/** Elegir el premio y descontar los sellos de la tarjeta del cliente. */
export function RedeemDialog({ customer, onOpenChange }: RedeemDialogProps) {
  const { rewards, stampsRequired } = useLoyaltySettings();
  const { viewer } = useSession();
  const [rewardId, setRewardId] = useState<string | null>(null);
  const selected = rewards.find((reward) => reward.id === rewardId) ?? rewards[0];

  function handleConfirm() {
    if (!customer || !selected) return;
    if (redeemReward(customer, selected, viewer?.name ?? "Panel")) {
      toast.success(`${customer.name} canjeó ${selected.name}`);
      onOpenChange(false);
    } else {
      toast.error(`Le faltan sellos: necesita ${stampsRequired}.`);
    }
  }

  return (
    <AlertDialog open={customer !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Canjear premio de {customer?.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Tiene {customer?.stamps ?? 0} sellos. Se descuentan {stampsRequired} al canjear.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {rewards.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm">
            Todavía no hay premios. Agregalos en Sellos y premios.
          </p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">Elegí el premio</legend>
            {rewards.map((reward) => (
              <label
                key={reward.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-2 pr-4 transition-colors",
                  "has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-ring/50 has-focus-visible:ring-3",
                )}
              >
                <input
                  type="radio"
                  name="reward"
                  value={reward.id}
                  checked={selected?.id === reward.id}
                  onChange={() => setRewardId(reward.id)}
                  className="sr-only"
                />
                <span className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-lg">
                  <ProductImage src={reward.image} alt="" sizes="40px" />
                </span>
                <span className="font-medium">{reward.name}</span>
              </label>
            ))}
          </fieldset>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl px-4">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 rounded-xl px-4"
            disabled={!selected}
            onClick={handleConfirm}
          >
            <Gift aria-hidden="true" className="size-4" />
            Canjear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
