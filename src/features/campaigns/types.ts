import type { CustomerSegment } from "@/features/customers";

export type CampaignRecipient = {
  customerId: string;
  name: string;
  phone: string;
  /** Mensaje ya personalizado para este cliente. */
  message: string;
  sentAt: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  segment: CustomerSegment;
  inactiveDays: number;
  /** Plantilla con variables, como se escribió. */
  template: string;
  createdAt: string;
  recipients: CampaignRecipient[];
};

export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  segment: CustomerSegment;
  message: string;
};
