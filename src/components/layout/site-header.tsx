import type { ReactNode } from "react";
import { PAGE_CONTAINER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type SiteHeaderProps = {
  /** Acciones de la derecha (tema, cuenta, carrito). */
  actions: ReactNode;
};

export function SiteHeader({ actions }: SiteHeaderProps) {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className={cn(PAGE_CONTAINER, "flex h-16 items-center justify-between gap-3")}>
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">{actions}</div>
      </div>
    </header>
  );
}
