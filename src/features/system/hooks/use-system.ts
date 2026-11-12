"use client";

import { useLocalStore } from "@/lib/use-local-store";
import { systemStore } from "../services/system-store";
import type { SystemState } from "../types";

export function useSystem(): SystemState {
  return useLocalStore(systemStore);
}
