import { ApiError } from "@/lib/api/client";
import { syncApi, type SyncPushMutation } from "@/lib/api/sync";
import type { SurveyDetail } from "@/lib/api/types";
import {
  clearMutations,
  countMutations,
  deleteMutation,
  deleteMutationsForSurvey,
  getMutation,
  getSnapshot,
  listMutations,
  putMutation,
  putSnapshot,
  toCachedSnapshot,
  type QueuedMutation,
} from "./storage";

/**
 * `online` is tracked separately from `phase` so the UI can say "offline with 3 pending"
 * without the two states fighting over one field.
 */
export type SyncPhase = "idle" | "syncing" | "error" | "conflict";

export interface SyncConflict {
  surveyId: string;
  /** Resolved from the cached snapshot so the UI can name the survey, not just its id. */
  surveyCode: string | null;
  mutationId: string;
  baseVersion: number;
  currentVersion: number | null;
  /** How many queued edits for this survey "Rebase to Server" would discard. */
  pendingForSurvey: number;
  message: string;
}

export interface SyncState {
  online: boolean;
  phase: SyncPhase;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  conflict: SyncConflict | null;
  /** Set when IndexedDB itself failed, which is the one error we must never hide. */
  storageError: string | null;
}

const LAST_SYNCED_KEY = "sync-last-synced-at";

const INITIAL_STATE: SyncState = {
  online: true,
  phase: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  conflict: null,
  storageError: null,
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected sync error";
}

function conflictDetailsOf(error: ApiError): { currentVersion: number | null } {
  const details = error.details;
  if (typeof details === "object" && details !== null && "currentVersion" in details) {
    const value = (details as { currentVersion: unknown }).currentVersion;
    if (typeof value === "number") {
      return { currentVersion: value };
    }
  }
  return { currentVersion: null };
}

function readLastSyncedAt(): string | null {
  try {
    return window.localStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export class SyncManager {
  private state: SyncState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();
  private flushing: Promise<void> | null = null;
  private started = false;

  /** Store contract for `useSyncExternalStore`. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Returns a stable reference between changes, which `useSyncExternalStore` requires. */
  getState = (): SyncState => this.state;

  private setState(patch: Partial<SyncState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private handleOnline = (): void => {
    this.setState({ online: true });
    void this.flush();
  };

  private handleOffline = (): void => {
    this.setState({ online: false, phase: "idle" });
  };

  async start(): Promise<void> {
    if (this.started || typeof window === "undefined") {
      return;
    }
    this.started = true;

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    this.setState({ online: navigator.onLine, lastSyncedAt: readLastSyncedAt() });

    await this.refreshPendingCount();

    if (this.state.online) {
      await this.flush();
    }
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  /** Pulls the technician's assigned work into IndexedDB so the app keeps working offline. */
  async pull(): Promise<void> {
    if (!this.state.online) {
      return;
    }
    try {
      const data = await syncApi.pull();
      await putSnapshot(toCachedSnapshot(data));
      this.setState({ storageError: null });
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        // Nothing to report: a pull that cannot reach the server just leaves the cache as it was.
        return;
      }
      this.setState({ storageError: messageOf(error) });
    }
  }

  /**
   * Records an edit that could not reach the server. The write is awaited and errors propagate,
   * so a caller that resolves knows the work is durable on disk.
   */
  async enqueue(mutation: QueuedMutation): Promise<void> {
    await putMutation(mutation);
    await this.refreshPendingCount();

    if (this.state.online && !this.state.conflict) {
      void this.flush();
    }
  }

  private async refreshPendingCount(): Promise<void> {
    try {
      const pendingCount = await countMutations();
      this.setState({ pendingCount, storageError: null });
    } catch (error) {
      this.setState({ storageError: messageOf(error) });
    }
  }

  private markSynced(): void {
    const lastSyncedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(LAST_SYNCED_KEY, lastSyncedAt);
    } catch {
      // A full or blocked localStorage must not stop the sync itself.
    }
    this.setState({ lastSyncedAt });
  }

  /** Single-flight: concurrent callers join the run already in progress. */
  flush(): Promise<void> {
    if (this.flushing) {
      return this.flushing;
    }
    const run = this.runFlush().finally(() => {
      if (this.flushing === run) {
        this.flushing = null;
      }
    });
    this.flushing = run;
    return run;
  }

  private async runFlush(): Promise<void> {
    if (typeof window === "undefined" || !this.state.online || this.state.conflict) {
      return;
    }

    let mutations: QueuedMutation[];
    try {
      mutations = await listMutations();
    } catch (error) {
      this.setState({ phase: "error", storageError: messageOf(error), lastError: messageOf(error) });
      return;
    }

    if (mutations.length === 0) {
      this.setState({ phase: "idle", pendingCount: 0, lastError: null });
      return;
    }

    this.setState({ phase: "syncing", lastError: null });

    // Each accepted mutation moves the survey's version, so later edits to the same survey
    // rebase onto the version the server just returned instead of the one cached on disk.
    const rebased = new Map<string, number>();

    for (const mutation of mutations) {
      const baseVersion = rebased.get(mutation.surveyId) ?? mutation.baseVersion;

      try {
        // Rebuilt per branch rather than spread: the server rejects unknown keys, so `queuedAt`
        // and `lastError` must not travel, and the action/data pairing has to stay correlated.
        const payload: SyncPushMutation =
          mutation.action === "SAVE"
            ? {
                mutationId: mutation.mutationId,
                surveyId: mutation.surveyId,
                baseVersion,
                action: "SAVE",
                data: mutation.data,
              }
            : {
                mutationId: mutation.mutationId,
                surveyId: mutation.surveyId,
                baseVersion,
                action: "SUBMIT",
                data: mutation.data,
              };

        const result = await syncApi.push(payload);

        rebased.set(mutation.surveyId, result.survey.version);
        await deleteMutation(mutation.mutationId);
        await this.cacheServerSurvey(result.survey);
        this.markSynced();
      } catch (error) {
        await this.recordMutationFailure(mutation, error);
        break;
      }
    }

    await this.refreshPendingCount();

    if (this.state.phase === "syncing") {
      this.setState({ phase: "idle", lastError: null });
    }
  }

  private async recordMutationFailure(mutation: QueuedMutation, error: unknown): Promise<void> {
    const message = messageOf(error);

    if (error instanceof ApiError && error.code === "SYNC_CONFLICT") {
      const { currentVersion } = conflictDetailsOf(error);
      this.setState({
        phase: "conflict",
        lastError: message,
        conflict: {
          surveyId: mutation.surveyId,
          surveyCode: await this.cachedSurveyCode(mutation.surveyId),
          mutationId: mutation.mutationId,
          baseVersion: mutation.baseVersion,
          currentVersion,
          pendingForSurvey: await this.countPendingForSurvey(mutation.surveyId),
          message,
        },
      });
      return;
    }

    if (error instanceof ApiError && error.isNetworkError) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Connectivity dropped mid-flush; the queue stays intact and retries when we are back.
        this.setState({ online: false, phase: "idle" });
      } else {
        // The device believes it is online but the server is unreachable. Staying "online" is
        // what keeps the Retry control visible, so the technician is not left with no way out.
        this.setState({ phase: "error", lastError: message });
      }
      return;
    }

    this.setState({ phase: "error", lastError: message });

    try {
      await putMutation({ ...mutation, lastError: message });
    } catch {
      // Annotating the queued row is a nicety; losing it must not mask the original failure.
    }
  }

  private async cacheServerSurvey(survey: SurveyDetail): Promise<void> {
    try {
      const snapshot = await getSnapshot();
      if (!snapshot) {
        return;
      }

      const surveyIndex = snapshot.surveys.findIndex((entry) => entry.id === survey.id);
      if (surveyIndex >= 0) {
        snapshot.surveys[surveyIndex] = survey;
      }

      const formIndex = snapshot.forms.findIndex((form) => form.survey.id === survey.id);
      if (formIndex >= 0) {
        const form = snapshot.forms[formIndex];
        snapshot.forms[formIndex] = {
          ...form,
          survey: { ...form.survey, version: survey.version, status: survey.status },
        };
      }

      await putSnapshot(snapshot);
    } catch (error) {
      // The server already has the data; a stale cache is recoverable on the next pull.
      this.setState({ storageError: messageOf(error) });
    }
  }

  /** Backs the "Retry" control. A conflict has to be resolved before another flush can run. */
  async retry(): Promise<void> {
    if (this.state.conflict) {
      return;
    }
    this.setState({ lastError: null, phase: "idle" });
    await this.refreshPendingCount();
    await this.flush();
  }

  private async cachedSurveyCode(surveyId: string): Promise<string | null> {
    try {
      const snapshot = await getSnapshot();
      return snapshot?.surveys.find((survey) => survey.id === surveyId)?.surveyCode ?? null;
    } catch {
      return null;
    }
  }

  private async countPendingForSurvey(surveyId: string): Promise<number> {
    try {
      const mutations = await listMutations();
      return mutations.filter((mutation) => mutation.surveyId === surveyId).length;
    } catch {
      return 0;
    }
  }

  /**
   * "Keep Changes": re-point the queued edit at the version the server now holds so the next
   * push overwrites the server copy. The mutation stays in the queue. It is re-keyed under a
   * fresh mutation id so the rebased payload is unambiguously a new attempt.
   */
  async keepLocalChanges(): Promise<void> {
    const conflict = this.state.conflict;
    if (!conflict) {
      return;
    }

    const mutation = await getMutation(conflict.mutationId);
    if (!mutation) {
      // Already resolved elsewhere (another tab, or a earlier retry). Nothing left to rebase.
      this.setState({ conflict: null, phase: "idle", lastError: null });
      return;
    }

    // Re-read rather than trusting the version captured when the conflict was raised: an online
    // save from this tab, or another device, may have moved it again in the meantime.
    const currentVersion = (await this.serverVersionOf(conflict.surveyId)) ?? conflict.currentVersion;
    if (currentVersion === null) {
      this.setState({
        lastError: "Could not read the current server version. Reconnect and try again.",
      });
      return;
    }

    // Write the rebased copy before removing the old one, so a failure here cannot lose the edit.
    await putMutation({
      ...mutation,
      mutationId: crypto.randomUUID(),
      baseVersion: currentVersion,
      lastError: null,
    });
    await deleteMutation(conflict.mutationId);

    this.setState({ conflict: null, phase: "idle", lastError: null });
    await this.refreshPendingCount();
    await this.flush();
  }

  /**
   * "Rebase to Server": drop every queued edit for the survey and re-cache the server's copy, so
   * the technician restarts from what the server holds.
   */
  async discardLocalChanges(): Promise<void> {
    const conflict = this.state.conflict;
    if (!conflict) {
      return;
    }

    // Refuse while offline: this deletes the technician's work and then replaces it with server
    // data we cannot fetch. Doing half of that would lose the edits for nothing.
    if (!this.state.online) {
      this.setState({
        lastError: "Reconnect before replacing your work with the server version.",
      });
      return;
    }

    await deleteMutationsForSurvey(conflict.surveyId);
    this.setState({ conflict: null, phase: "idle", lastError: null });

    await this.pull();
    await this.refreshPendingCount();
    await this.flush();
  }

  private async serverVersionOf(surveyId: string): Promise<number | null> {
    try {
      const data = await syncApi.pull();
      await putSnapshot(toCachedSnapshot(data));
      return data.surveys.find((survey) => survey.id === surveyId)?.version ?? null;
    } catch {
      return null;
    }
  }

  /** Drops every queued edit. Destructive, so it is only reachable from an explicit user action. */
  async reset(): Promise<void> {
    await clearMutations();
    this.setState({ phase: "idle", pendingCount: 0, lastError: null, conflict: null, storageError: null });
  }
}
