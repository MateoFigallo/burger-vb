"use client";

import { useMemo } from "react";
import { useLocalStore } from "@/lib/use-local-store";
import { DEFAULT_SYSTEM_STATE, systemStore } from "../services/system-store";
import type { SystemState } from "../types";

/** Mezcla lo guardado con los valores por defecto para tolerar datos de versiones anteriores. */
export function useSystem(): SystemState {
  const raw = useLocalStore(systemStore);
  return useMemo(
    () => ({
      ...DEFAULT_SYSTEM_STATE,
      ...raw,
      web: { ...DEFAULT_SYSTEM_STATE.web, ...raw.web },
      fiscal: { ...DEFAULT_SYSTEM_STATE.fiscal, ...raw.fiscal },
    }),
    [raw],
  );
}
