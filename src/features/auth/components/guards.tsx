"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock } from "lucide-react";
import { PANEL_MODULES, type ModuleId } from "@/config/panel";
import { canUseModule, useSession } from "../hooks/use-session";

function Loading() {
  return (
    <div className="grid min-h-svh place-items-center" role="status">
      <LoaderCircle aria-hidden="true" className="text-brand size-8 animate-spin" />
      <span className="sr-only">Verificando acceso…</span>
    </div>
  );
}

type GuardProps = {
  children: ReactNode;
};

/** Solo deja pasar al administrador y a los empleados. */
export function PanelGuard({ children }: GuardProps) {
  const router = useRouter();
  const { isReady, viewer } = useSession();
  const allowed = viewer !== null && viewer.kind !== "customer";

  useEffect(() => {
    if (isReady && !allowed) router.replace("/");
  }, [allowed, isReady, router]);

  if (!isReady || !allowed) return <Loading />;
  return children;
}

/** Solo deja pasar a clientes con sesión iniciada. */
export function CustomerGuard({ children }: GuardProps) {
  const router = useRouter();
  const { isReady, viewer } = useSession();
  const allowed = viewer?.kind === "customer";

  useEffect(() => {
    if (isReady && !allowed) router.replace("/");
  }, [allowed, isReady, router]);

  if (!isReady || !allowed) return <Loading />;
  return children;
}

type ModuleGateProps = {
  module: ModuleId;
  children: ReactNode;
};

/** Muestra el módulo solo si la persona tiene permiso para usarlo. */
export function ModuleGate({ module, children }: ModuleGateProps) {
  const { viewer } = useSession();

  if (canUseModule(viewer, module)) return children;

  const allowed = viewer && viewer.kind !== "customer" ? viewer.modules : [];
  return (
    <div className="bg-card flex flex-col items-center gap-4 rounded-2xl border px-6 py-16 text-center">
      <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
        <Lock aria-hidden="true" className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">No tenés acceso a {PANEL_MODULES[module].label}</h1>
        <p className="text-muted-foreground text-sm">
          Pedile al encargado que te habilite este módulo.
        </p>
      </div>
      {allowed.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2">
          {allowed.map((id) => (
            <li key={id}>
              <Link
                href={PANEL_MODULES[id].href}
                className="hover:bg-muted focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-medium outline-none focus-visible:ring-3"
              >
                Ir a {PANEL_MODULES[id].label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
