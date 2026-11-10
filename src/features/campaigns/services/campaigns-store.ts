import { createId } from "@/lib/ids";
import { createLocalStore } from "@/lib/local-store";
import type { Campaign } from "../types";

export const campaignsStore = createLocalStore<Campaign[]>("burger-vb:campaigns", []);

export function createCampaign(input: Omit<Campaign, "id" | "createdAt">): Campaign {
  const campaign: Campaign = {
    ...input,
    id: createId("camp"),
    createdAt: new Date().toISOString(),
  };
  campaignsStore.set((campaigns) => [campaign, ...campaigns]);
  return campaign;
}

export function markRecipientSent(campaignId: string, customerId: string) {
  const sentAt = new Date().toISOString();
  campaignsStore.set((campaigns) =>
    campaigns.map((campaign) =>
      campaign.id === campaignId
        ? {
            ...campaign,
            recipients: campaign.recipients.map((recipient) =>
              recipient.customerId === customerId && !recipient.sentAt
                ? { ...recipient, sentAt }
                : recipient,
            ),
          }
        : campaign,
    ),
  );
}

export function deleteCampaign(campaignId: string) {
  campaignsStore.set((campaigns) => campaigns.filter((campaign) => campaign.id !== campaignId));
}
