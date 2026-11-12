"use client";

import { useMemo } from "react";
import { useLocalStore } from "@/lib/use-local-store";
import { DEFAULT_TEAM, teamStore } from "../services/team-store";
import type { Team } from "../types";

export function useTeam(): Required<Team> {
  const raw = useLocalStore(teamStore);

  return useMemo(
    () => ({
      roles: raw.roles,
      employees:
        raw.employees.length === 0 && raw.tasks === undefined
          ? DEFAULT_TEAM.employees
          : raw.employees,
      attendance: raw.attendance ?? DEFAULT_TEAM.attendance ?? [],
      advances: raw.advances ?? DEFAULT_TEAM.advances ?? [],
      tasks: raw.tasks ?? DEFAULT_TEAM.tasks ?? [],
    }),
    [raw],
  );
}
