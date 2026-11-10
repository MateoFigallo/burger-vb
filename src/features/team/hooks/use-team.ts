"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { teamStore } from "../services/team-store";
import type { Team } from "../types";

export function useTeam(): Team {
  return useLocalStore(teamStore);
}
