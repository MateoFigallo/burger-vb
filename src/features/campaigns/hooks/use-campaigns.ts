"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { campaignsStore } from "../services/campaigns-store";
import type { Campaign } from "../types";

export function useCampaigns(): Campaign[] {
  return useLocalStore(campaignsStore);
}
