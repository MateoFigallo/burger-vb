"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cake, History, Megaphone, MessageCircle, Moon, PenLine } from "lucide-react";
import { useCampaigns } from "@/features/campaigns";
import {
  DEFAULT_INACTIVE_DAYS,
  SEGMENT_LABELS,
  isInactive,
  useCustomers,
} from "@/features/customers";
import { isBirthdayThisMonth } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "../shared/page-header";
import { SectionTabs } from "../shared/section-tabs";
import { StatCards, type Stat } from "../shared/stat-cards";
import { CampaignBuilder } from "./campaign-builder";
import { CampaignDetail } from "./campaign-detail";

type View = "new" | "history";

export function CampaignsManager() {
  const campaigns = useCampaigns();
  const customers = useCustomers();
  const [now] = useState(() => new Date());
  const [view, setView] = useState<View>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = campaigns.find((campaign) => campaign.id === selectedId) ?? null;
  const sentMessages = campaigns.reduce(
    (sum, campaign) => sum + campaign.recipients.filter((recipient) => recipient.sentAt).length,
    0,
  );

  const stats: Stat[] = [
    {
      label: "Campañas",
      value: String(campaigns.length),
      hint: "Creadas en total",
      icon: Megaphone,
    },
    {
      label: "Mensajes enviados",
      value: String(sentMessages),
      hint: "Por WhatsApp",
      icon: MessageCircle,
    },
    {
      label: "Cumplen este mes",
      value: String(
        customers.filter((customer) => isBirthdayThisMonth(customer.birthday, now)).length,
      ),
      hint: "Para saludar con un regalo",
      icon: Cake,
    },
    {
      label: "Inactivos",
      value: String(
        customers.filter((customer) =>
          isInactive(customer, { now, inactiveDays: DEFAULT_INACTIVE_DAYS }),
        ).length,
      ),
      hint: `Sin pedir hace más de ${DEFAULT_INACTIVE_DAYS} días`,
      icon: Moon,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campañas por WhatsApp"
        description="Armá mensajes personalizados para cada grupo de clientes y envialos desde tu WhatsApp."
      />

      <StatCards stats={stats} />

      <SectionTabs
        id="campaigns"
        label="Vista de campañas"
        value={view}
        onChange={(next) => {
          setView(next);
          setSelectedId(null);
        }}
        tabs={[
          { value: "new", label: "Nueva campaña", icon: PenLine },
          { value: "history", label: "Historial", icon: History, count: campaigns.length },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected ? selected.id : view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {selected ? (
            <CampaignDetail campaign={selected} onBack={() => setSelectedId(null)} />
          ) : view === "new" ? (
            <CampaignBuilder
              now={now}
              onCreated={(campaign) => {
                setView("history");
                setSelectedId(campaign.id);
              }}
            />
          ) : campaigns.length === 0 ? (
            <div className="bg-card text-muted-foreground rounded-2xl border border-dashed px-6 py-16 text-center text-sm">
              Todavía no creaste campañas.
            </div>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((campaign) => {
                const sent = campaign.recipients.filter((recipient) => recipient.sentAt).length;
                const total = campaign.recipients.length;
                return (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(campaign.id)}
                      className="bg-card hover:border-primary/40 focus-visible:ring-ring/50 flex w-full flex-col gap-3 rounded-2xl border p-5 text-left shadow-sm transition-colors outline-none focus-visible:ring-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <span className="block font-semibold">{campaign.name}</span>
                        <span className="text-muted-foreground block text-sm">
                          {SEGMENT_LABELS[campaign.segment]} · {formatDateTime(campaign.createdAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="bg-muted h-2 w-28 overflow-hidden rounded-full">
                          <span
                            className="bg-whatsapp block h-full rounded-full"
                            style={{ width: `${total ? (sent / total) * 100 : 0}%` }}
                          />
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {sent}/{total}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
