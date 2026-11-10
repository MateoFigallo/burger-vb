"use client";

import { useRef, useState, type FormEvent } from "react";
import { Info, Send, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import {
  CAMPAIGN_TEMPLATES,
  TEMPLATE_VARIABLES,
  createCampaign,
  renderTemplate,
  type Campaign,
} from "@/features/campaigns";
import {
  DEFAULT_INACTIVE_DAYS,
  INACTIVE_DAY_OPTIONS,
  SEGMENTS,
  SEGMENT_LABELS,
  filterBySegment,
  isCustomerSegment,
  useCustomers,
  type CustomerSegment,
} from "@/features/customers";
import { useLoyaltySettings } from "@/features/loyalty";
import { normalizePhone } from "@/lib/ids";
import { cn } from "@/lib/utils";

const MAX_MESSAGE = 700;

type CampaignBuilderProps = {
  now: Date;
  onCreated: (campaign: Campaign) => void;
};

export function CampaignBuilder({ now, onCreated }: CampaignBuilderProps) {
  const customers = useCustomers();
  const { stampsRequired } = useLoyaltySettings();
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [templateId, setTemplateId] = useState(CAMPAIGN_TEMPLATES[0].id);
  const [name, setName] = useState(CAMPAIGN_TEMPLATES[0].name);
  const [segment, setSegment] = useState<CustomerSegment>(CAMPAIGN_TEMPLATES[0].segment);
  const [inactiveDays, setInactiveDays] = useState<number>(DEFAULT_INACTIVE_DAYS);
  const [message, setMessage] = useState(CAMPAIGN_TEMPLATES[0].message);

  const recipients = filterBySegment(customers, segment, {
    now,
    inactiveDays,
    stampsRequired,
  }).filter((customer) => normalizePhone(customer.phone).length >= 8);
  const context = { storeName: siteConfig.name, stampsRequired };
  const preview = recipients[0]
    ? renderTemplate(message, recipients[0], context)
    : renderTemplate(message, { name: "Lucía", stamps: 4 }, context);

  function applyTemplate(id: string) {
    const template = CAMPAIGN_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setTemplateId(id);
    setName(template.name);
    setSegment(template.segment);
    setMessage(template.message);
  }

  function insertVariable(token: string) {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const next = `${message.slice(0, start)}${token}${message.slice(end)}`.slice(0, MAX_MESSAGE);
    setMessage(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 3) {
      toast.error("Ponele un nombre a la campaña.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Escribí el mensaje de la campaña.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("No hay clientes con WhatsApp en ese público.");
      return;
    }

    const campaign = createCampaign({
      name: name.trim(),
      segment,
      inactiveDays,
      template: message.trim(),
      recipients: recipients.map((customer) => ({
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        message: renderTemplate(message.trim(), customer, context),
        sentAt: null,
      })),
    });
    toast.success(`Creaste la campaña con ${recipients.length} clientes`);
    onCreated(campaign);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-6">
        <section
          aria-labelledby="template-title"
          className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
        >
          <h2 id="template-title" className="text-lg font-bold">
            1. Elegí una plantilla
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAMPAIGN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-pressed={templateId === template.id}
                onClick={() => applyTemplate(template.id)}
                className={cn(
                  "focus-visible:ring-ring/50 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3",
                  templateId === template.id
                    ? "border-primary bg-accent text-accent-foreground"
                    : "hover:bg-muted",
                )}
              >
                <span className="block font-semibold">{template.name}</span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="audience-title"
          className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
        >
          <h2 id="audience-title" className="text-lg font-bold">
            2. Público y mensaje
          </h2>

          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nombre de la campaña</Label>
            <Input
              id="campaign-name"
              className="h-11"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaign-segment">A quién le llega</Label>
              <Select
                items={SEGMENT_LABELS}
                value={segment}
                onValueChange={(value) => setSegment(isCustomerSegment(value) ? value : "todos")}
              >
                <SelectTrigger id="campaign-segment" className="h-11! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SEGMENT_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {segment === "inactivos" && (
              <div className="space-y-2">
                <Label htmlFor="campaign-inactive">Sin pedir hace más de</Label>
                <Select
                  items={Object.fromEntries(
                    INACTIVE_DAY_OPTIONS.map((days) => [String(days), `${days} días`]),
                  )}
                  value={String(inactiveDays)}
                  onValueChange={(value) => setInactiveDays(Number(value) || DEFAULT_INACTIVE_DAYS)}
                >
                  <SelectTrigger id="campaign-inactive" className="h-11! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INACTIVE_DAY_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {days} días
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="campaign-message">Mensaje</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {message.length}/{MAX_MESSAGE}
              </span>
            </div>
            <Textarea
              id="campaign-message"
              ref={messageRef}
              rows={5}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">Insertar:</span>
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 min-h-9 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3"
                >
                  {variable.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section
          aria-labelledby="preview-title"
          className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 id="preview-title" className="text-lg font-bold">
              3. Vista previa
            </h2>
            <span className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold">
              {recipients.length} {recipients.length === 1 ? "cliente" : "clientes"}
            </span>
          </div>
          <div className="rounded-2xl bg-[#e5ddd5] p-4 dark:bg-[#0b141a]">
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
              {preview}
            </div>
          </div>
          {recipients[0] && (
            <p className="text-muted-foreground text-xs">
              Así le llega a {recipients[0].name}. Cada cliente recibe su nombre y sus sellos.
            </p>
          )}
          <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold">
            <Sparkles aria-hidden="true" className="size-5" />
            Crear campaña
          </Button>
        </section>

        <div className="text-muted-foreground flex gap-3 rounded-2xl border border-dashed p-4 text-xs">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <Send aria-hidden="true" className="mr-1 inline size-3" />
            Los mensajes se abren uno por uno en WhatsApp para que los envíes vos. El envío
            automático masivo necesita la API de WhatsApp Business.
          </p>
        </div>
      </aside>
    </form>
  );
}
