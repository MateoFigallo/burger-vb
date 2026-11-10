import { createLocalStore } from "@/lib/local-store";

export type StoreStatus = {
  isOpen: boolean;
};

export const storeStatusStore = createLocalStore<StoreStatus>("burger-vb:store-status", {
  isOpen: true,
});

export function setStoreOpen(isOpen: boolean) {
  storeStatusStore.set((status) => ({ ...status, isOpen }));
}
