"use client";

import { ArrowLeft, Check, Copy, MessageCircle, Trash } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteCampaign, markRecipientSent, type Campaign } from "@/features/campaigns";
import { SEGMENT_LABELS } from "@/features/customers";
import { formatDateTime } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type CampaignDetailProps = {
  campaign: Campaign;
  onBack: () => void;
};

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps) {
  const sent = campaign.recipients.filter((recipient) => recipient.sentAt).length;
  const total = campaign.recipients.length;
  const progress = total ? Math.round((sent / total) * 100) : 0;
  const nextRecipient = campaign.recipients.find((recipient) => !recipient.sentAt);

  function send(customerId: string) {
    const recipient = campaign.recipients.find((item) => item.customerId === customerId);
    if (!recipient) return;
    window.open(
      getWhatsAppUrl(recipient.phone, recipient.message),
      "_blank",
      "noopener,noreferrer",
    );
    markRecipientSent(campaign.id, customerId);
  }

  async function copy(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Copiaste el mensaje");
    } catch {
      toast.error("No se pudo copiar el mensaje.");
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="-ml-3 h-11 rounded-xl" onClick={onBack}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al historial
      </Button>

      <section className="bg-card space-y-4 rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{campaign.name}</h2>
            <p className="text-muted-foreground text-sm">
              {SEGMENT_LABELS[campaign.segment]} · Creada el {formatDateTime(campaign.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {nextRecipient && (
              <Button
                className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 h-11 rounded-xl font-semibold"
                onClick={() => send(nextRecipient.customerId)}
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                Enviar al siguiente
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="hover:text-destructive size-11 rounded-xl"
              aria-label="Eliminar campaña"
              onClick={() => {
                deleteCampaign(campaign.id);
                toast.success("Eliminaste la campaña");
                onBack();
              }}
            >
              <Trash className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {sent} de {total} enviados
            </span>
            <span className="text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <div
            className="bg-muted h-3 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={sent}
            aria-label="Avance de la campaña"
          >
            <motion.div
              className="bg-whatsapp h-full rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </section>

      <ul className="space-y-3">
        {campaign.recipients.map((recipient) => (
          <li
            key={recipient.customerId}
            className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{recipient.name}</p>
                {recipient.sentAt ? (
                  <Badge className="bg-whatsapp/15 text-whatsapp h-6 dark:text-emerald-300">
                    <Check aria-hidden="true" /> Enviado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-6">
                    Pendiente
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">{recipient.message}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-xl"
                aria-label={`Copiar mensaje para ${recipient.name}`}
                onClick={() => void copy(recipient.message)}
              >
                <Copy className="size-4" />
              </Button>
              <Button
                variant={recipient.sentAt ? "outline" : "default"}
                className="h-11 rounded-xl"
                onClick={() => send(recipient.customerId)}
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {recipient.sentAt ? "Reenviar" : "Enviar"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
