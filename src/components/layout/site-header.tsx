import type { ReactNode } from "react";
import { Logo } from "./logo";

type SiteHeaderProps = {
  /** Acciones de la derecha (tema, cuenta, carrito). */
  actions: ReactNode;
};

export function SiteHeader({ actions }: SiteHeaderProps) {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">{actions}</div>
      </div>
    </header>
  );
}
