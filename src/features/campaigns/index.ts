export type { Campaign, CampaignRecipient, CampaignTemplate } from "./types";
export { CAMPAIGN_TEMPLATES, TEMPLATE_VARIABLES, renderTemplate } from "./services/templates";
export { createCampaign, deleteCampaign, markRecipientSent } from "./services/campaigns-store";
export { useCampaigns } from "./hooks/use-campaigns";
