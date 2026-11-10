"use client";

import { Store } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { siteConfig } from "@/config/site";
import { setStoreOpen, useStoreStatus } from "@/features/store-status";
import { cn } from "@/lib/utils";

export function StoreStatusCard() {
  const { isOpen } = useStoreStatus();

  function handleChange(checked: boolean) {
    setStoreOpen(checked);
    toast.success(checked ? "El local está abierto" : "El local está cerrado", {
      description: checked
        ? "Los clientes ya pueden enviar pedidos."
        : "Los clientes no podrán enviar pedidos hasta que vuelvas a abrir.",
    });
  }

  return (
    <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "grid size-12 place-items-center rounded-2xl transition-colors",
            isOpen ? "bg-whatsapp text-whatsapp-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Store aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="font-bold">{isOpen ? "Local abierto" : "Local cerrado"}</p>
          <p className="text-muted-foreground text-sm">
            {isOpen
              ? "Estás recibiendo pedidos."
              : `Los clientes ven un aviso con tu horario: ${siteConfig.hours.toLowerCase()}.`}
          </p>
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 self-start text-sm font-medium sm:self-auto">
        Recibir pedidos
        <Switch checked={isOpen} onCheckedChange={handleChange} aria-label="Recibir pedidos" />
      </label>
    </div>
  );
}
