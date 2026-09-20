"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { QueuedMutation } from "./storage";
import { SyncManager, type SyncState } from "./sync-manager";

/** Stable reference for `useSyncExternalStore`, which re-renders forever if this is rebuilt. */
const SERVER_STATE: SyncState = {
  online: true,
  phase: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  conflict: null,
  storageError: null,
};

interface SyncContextValue {
  state: SyncState;
  enqueue: (mutation: QueuedMutation) => Promise<void>;
  flush: () => Promise<void>;
  retry: () => Promise<void>;
  pull: () => Promise<void>;
  keepLocalChanges: () => Promise<void>;
  discardLocalChanges: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [manager] = useState(() => new SyncManager());

  const state = useSyncExternalStore(manager.subscribe, manager.getState, () => SERVER_STATE);

  const isTechnician = user?.role === "TECHNICIAN";

  useEffect(() => {
    // Only technicians have offline work, and /sync is role-gated to them on the server.
    if (!isTechnician) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await manager.start();
      if (!cancelled) {
        await manager.pull();
      }
    })();

    return () => {
      cancelled = true;
      manager.stop();
    };
  }, [manager, isTechnician]);

  const value = useMemo<SyncContextValue>(
    () => ({
      state,
      enqueue: (mutation) => manager.enqueue(mutation),
      flush: () => manager.flush(),
      retry: () => manager.retry(),
      pull: () => manager.pull(),
      keepLocalChanges: () => manager.keepLocalChanges(),
      discardLocalChanges: () => manager.discardLocalChanges(),
    }),
    [manager, state],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }

  return context;
}
