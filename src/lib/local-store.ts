type StorageKind = "local" | "session" | "memory";

export type LocalStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (updater: (previous: T) => T) => void;
};

function getStorage(kind: StorageKind): Storage | null {
  if (kind === "memory" || typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Estado persistido en el navegador y compartido entre componentes.
 * Si el almacenamiento no está disponible (modo privado, bloqueado), sigue funcionando en memoria.
 */
export function createLocalStore<T>(
  key: string,
  initialValue: T,
  kind: StorageKind = "local",
): LocalStore<T> {
  let cachedValue = initialValue;
  let cachedRaw: string | null | undefined;
  let storageAvailable = kind !== "memory";
  const listeners = new Set<() => void>();

  function getSnapshot(): T {
    const storage = storageAvailable ? getStorage(kind) : null;
    if (!storage) return cachedValue;

    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      storageAvailable = false;
      return cachedValue;
    }

    if (raw !== cachedRaw) {
      cachedRaw = raw;
      if (raw === null) {
        cachedValue = initialValue;
      } else {
        try {
          cachedValue = JSON.parse(raw) as T;
        } catch {
          cachedValue = initialValue;
        }
      }
    }
    return cachedValue;
  }

  function set(updater: (previous: T) => T) {
    const next = updater(getSnapshot());
    cachedValue = next;

    const storage = storageAvailable ? getStorage(kind) : null;
    if (storage) {
      try {
        const raw = JSON.stringify(next);
        storage.setItem(key, raw);
        cachedRaw = raw;
      } catch {
        storageAvailable = false;
      }
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  }

  return { subscribe, getSnapshot, getServerSnapshot: () => initialValue, set };
}
