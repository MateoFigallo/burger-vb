"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, LoaderCircle, ShieldCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { businessConfig } from "@/config/business.config";
import { formatDate } from "@/lib/format";
import { useIsClient } from "@/lib/use-local-store";
import { cn } from "@/lib/utils";
import { useSystem } from "../hooks/use-system";
import { createRegretRequest } from "../services/system-store";

export type LegalDocId = keyof typeof businessConfig.webAndLegal.legalRoutes;

const DOCS: Record<LegalDocId, { title: string; eyebrow: string; icon: typeof FileText }> = {
  terminos: { title: "Términos y condiciones", eyebrow: "Legal", icon: FileText },
  privacidad: { title: "Política de privacidad", eyebrow: "Tus datos", icon: ShieldCheck },
  arrepentimiento: { title: "Botón de arrepentimiento", eyebrow: "Defensa del consumidor", icon: Undo2 },
};

function RegretForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sentCode, setSentCode] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 6 || orderCode.trim().length < 2) {
      toast.error("Completá tu nombre, teléfono y el número de pedido.");
      return;
    }
    setSending(true);
    const request = createRegretRequest({
      customerName: name.trim(),
      phone: phone.trim(),
      orderCode: orderCode.trim().toUpperCase(),
      reason: reason.trim() || "Solicitud de arrepentimiento desde la web",
    });
    setSending(false);
    setSentCode(request.id.slice(-6).toUpperCase());
    toast.success("Recibimos tu solicitud");
  }

  if (sentCode) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <CheckCircle2 aria-hidden="true" className="size-10 text-emerald-600 dark:text-emerald-400" />
        <p className="text-lg font-bold">Solicitud registrada</p>
        <p className="text-muted-foreground text-sm">
          Tu código de seguimiento es <strong className="text-foreground font-mono">{sentCode}</strong>.
          Te vamos a contactar por WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-lg font-bold">Iniciar solicitud</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="regret-name">Nombre y apellido</Label>
          <Input id="regret-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regret-phone">Teléfono / WhatsApp</Label>
          <Input
            id="regret-phone"
            type="tel"
            inputMode="tel"
            className="h-11"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="regret-order">N° de pedido o Gift Card</Label>
        <Input
          id="regret-order"
          className="h-11 font-mono uppercase"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="regret-reason">Motivo (opcional)</Label>
        <Textarea id="regret-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button type="submit" disabled={sending} className="h-11 w-full rounded-xl font-bold sm:w-auto sm:px-8">
        {sending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Enviar solicitud de arrepentimiento
      </Button>
    </form>
  );
}

export function LegalDocument({ doc }: { doc: LegalDocId }) {
  const isHydrated = useIsClient();
  const { web } = useSystem();
  const meta = DOCS[doc];
  const Icon = meta.icon;
  const text =
    doc === "terminos"
      ? web.termsAndConditions
      : doc === "privacidad"
        ? web.privacyPolicy
        : web.regretButtonInfo;
  const routes = businessConfig.webAndLegal.legalRoutes;

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-10 sm:px-5 md:py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a la tienda
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-2xl">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-brand text-xs font-semibold tracking-widest uppercase">{meta.eyebrow}</p>
          <h1 className="text-2xl font-extrabold tracking-tight break-words sm:text-4xl">
            {meta.title}
          </h1>
        </div>
      </div>

      <nav aria-label="Documentos legales" className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(DOCS) as LegalDocId[]).map((id) => (
          <Link
            key={id}
            href={routes[id]}
            aria-current={id === doc ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold outline-none focus-visible:ring-3",
              id === doc
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {DOCS[id].title}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {!isHydrated ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        ) : (
          <article className="bg-card rounded-2xl border p-5 sm:p-8">
            {text
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index} className="text-foreground/90 mb-4 leading-relaxed break-words whitespace-pre-line last:mb-0">
                  {paragraph}
                </p>
              ))}
            {web.legalConfirmedAt && (
              <p className="text-muted-foreground mt-6 border-t pt-4 text-xs">
                Última actualización: {formatDate(web.legalConfirmedAt)} · {web.storeName}
              </p>
            )}
          </article>
        )}

        {doc === "arrepentimiento" && isHydrated && <RegretForm />}
      </div>
    </section>
  );
}
