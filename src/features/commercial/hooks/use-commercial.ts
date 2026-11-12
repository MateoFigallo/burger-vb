"use client";

import { useMemo } from "react";
import { useLocalStore } from "@/lib/use-local-store";
import {
  commercialStore,
  computeSessionSummary,
  getOpenSessionForRegister,
  type SessionFinancialSummary,
} from "../services/commercial-store";
import type { CashSession, CommercialState } from "../types";

export type UseCommercialReturn = {
  state: CommercialState;
  openSession: CashSession | null;
  openSessionSummary: SessionFinancialSummary | null;
};

export function useCommercial(): UseCommercialReturn {
  const state = useLocalStore(commercialStore);

  const openSession = useMemo(
    () => getOpenSessionForRegister(state, state.activeRegisterId),
    [state],
  );

  const openSessionSummary = useMemo(
    () =>
      openSession
        ? computeSessionSummary(openSession, state.sales, state.movements)
        : null,
    [openSession, state.sales, state.movements],
  );

  return {
    state,
    openSession,
    openSessionSummary,
  };
}
