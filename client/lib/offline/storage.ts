import type { FieldDataPayload, SubmitPayload } from "@/lib/api/surveys";
import type {
  SurveyDetail,
  SurveyFormData,
  SyncPullResponse,
} from "@/lib/api/types";

interface QueuedMutationBase {
  mutationId: string;
  surveyId: string;
  /** Survey version this edit was made against. Rebasing a conflict rewrites it. */
  baseVersion: number;
  queuedAt: string;
  lastError?: string | null;
}

export interface QueuedSaveMutation extends QueuedMutationBase {
  action: "SAVE";
  data: FieldDataPayload;
}

export interface QueuedSubmitMutation extends QueuedMutationBase {
  action: "SUBMIT";
  data: SubmitPayload;
}

export type QueuedMutation = QueuedSaveMutation | QueuedSubmitMutation;

export interface CachedSnapshot extends SyncPullResponse {
  id: typeof SNAPSHOT_KEY;
}

const DB_NAME = "survey-offline";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "snapshot";
const MUTATION_STORE = "mutations";
const SNAPSHOT_KEY = "current";

/**
 * Every helper here rejects rather than swallowing failures: a technician's queued work is the
 * one thing this app must never lose quietly, so callers have to decide what a failed write means.
 */
export class OfflineStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OfflineStorageError";
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  if (typeof indexedDB === "undefined") {
    return Promise.reject(new OfflineStorageError("Offline storage is unavailable in this browser"));
  }

  // Assigned synchronously so concurrent callers share a single connection attempt.
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: "mutationId" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema must not leave this tab on a stale connection.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () =>
      reject(new OfflineStorageError("Could not open offline storage", { cause: request.error }));

    request.onblocked = () =>
      reject(new OfflineStorageError("Offline storage is blocked by another open tab"));
  });

  // A failed attempt must not poison every later call.
  dbPromise = pending;
  pending.catch(() => {
    if (dbPromise === pending) {
      dbPromise = null;
    }
  });

  return pending;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new OfflineStorageError("Offline storage rejected a read", { cause: request.error }));
  });
}

/** Resolves only once the write is committed, so a caller that awaits it knows the data is durable. */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new OfflineStorageError("Offline storage rejected a write", { cause: tx.error }));
    tx.onabort = () =>
      reject(new OfflineStorageError("Offline write was aborted", { cause: tx.error }));
  });
}

export function toCachedSnapshot(pull: SyncPullResponse): CachedSnapshot {
  return { ...pull, id: SNAPSHOT_KEY };
}

export async function getSnapshot(): Promise<CachedSnapshot | null> {
  const db = await openDb();
  const tx = db.transaction(SNAPSHOT_STORE, "readonly");
  const store = tx.objectStore(SNAPSHOT_STORE);
  const value = await requestResult(store.get(SNAPSHOT_KEY) as IDBRequest<CachedSnapshot | undefined>);
  return value ?? null;
}

export async function putSnapshot(snapshot: CachedSnapshot): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
  tx.objectStore(SNAPSHOT_STORE).put(snapshot);
  await transactionDone(tx);
}

/** FIFO by queue time: a SAVE recorded before a SUBMIT has to reach the server in that order. */
export async function listMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readonly");
  const store = tx.objectStore(MUTATION_STORE);
  const all = await requestResult(store.getAll() as IDBRequest<QueuedMutation[]>);
  return all.sort(
    (a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.mutationId.localeCompare(b.mutationId),
  );
}

export async function getMutation(mutationId: string): Promise<QueuedMutation | null> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readonly");
  const store = tx.objectStore(MUTATION_STORE);
  const value = await requestResult(store.get(mutationId) as IDBRequest<QueuedMutation | undefined>);
  return value ?? null;
}

export async function countMutations(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readonly");
  return requestResult(tx.objectStore(MUTATION_STORE).count());
}

export async function putMutation(mutation: QueuedMutation): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).put(mutation);
  await transactionDone(tx);
}

export async function deleteMutation(mutationId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).delete(mutationId);
  await transactionDone(tx);
}

/**
 * Drops every queued edit for one survey. Rebasing onto the server means abandoning all local
 * work on that survey, not just the one mutation that happened to be rejected first — anything
 * left behind would carry a stale `baseVersion` and conflict again on the next flush.
 *
 * Reads happen in a separate transaction so no `await` ever sits inside the write transaction,
 * which is what causes spurious `TransactionInactiveError`s.
 */
export async function deleteMutationsForSurvey(surveyId: string): Promise<number> {
  const pending = await listMutations();
  const ids = pending.filter((mutation) => mutation.surveyId === surveyId).map((m) => m.mutationId);

  if (ids.length === 0) {
    return 0;
  }

  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  const store = tx.objectStore(MUTATION_STORE);
  for (const id of ids) {
    store.delete(id);
  }
  await transactionDone(tx);

  return ids.length;
}

export async function clearMutations(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(MUTATION_STORE, "readwrite");
  tx.objectStore(MUTATION_STORE).clear();
  await transactionDone(tx);
}

export function getCachedForm(snapshot: CachedSnapshot | null, surveyId: string): SurveyFormData | null {
  return snapshot?.forms.find((form) => form.survey.id === surveyId) ?? null;
}

export function getCachedSurveyDetail(
  snapshot: CachedSnapshot | null,
  surveyId: string,
): SurveyDetail | null {
  return snapshot?.surveys.find((survey) => survey.id === surveyId) ?? null;
}
