import { createLocalStore } from "@/lib/local-store";

export type AuthSheetTab = "login" | "register";
export type AuthSheetState = { open: boolean; tab: AuthSheetTab };

/** Estado efímero de UI (no persiste): permite abrir el panel de ingreso desde cualquier sección. */
export const authSheetStore = createLocalStore<AuthSheetState>(
  "burger-vb:auth-sheet",
  { open: false, tab: "login" },
  "memory",
);

export function openAuthSheet(tab: AuthSheetTab = "login") {
  authSheetStore.set(() => ({ open: true, tab }));
}

export function setAuthSheetOpen(open: boolean) {
  authSheetStore.set((prev) => ({ ...prev, open }));
}

export function setAuthSheetTab(tab: AuthSheetTab) {
  authSheetStore.set((prev) => ({ ...prev, tab }));
}
