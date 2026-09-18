import type {
  SurveyDetail,
  SurveyFormData,
  SurveyStatus,
} from "@/lib/api/types";

export interface QueuedMutation {
  mutationId: string;
  surveyId: string;
  baseVersion: number;
  action: "SAVE" | "SUBMIT";
  data: { [key: string]: any };
  queuedAt: string;
  lastError?: string | null;
}

export interface CachedSnapshot {
  key: "current";
  syncedAt: string;
  technicianId: string;
  surveyIds: string[];
  surveys: SurveyDetail[];
  forms: SurveyFormData[];
  networkOptions: { areas: any[]; boxes: any[]; lines: any[] };
}

const DRAFT_VERSION = 1;
const SYNC_KEY_PREFIX = "sync:";

function storage(): any {
  try {
    return typeof window === "undefined" ? {} : window.localStorage;
  } catch {
    return {};
  }
}

function syncKey(ownerId: string, surveyId: string): string {
  return `${SYNC_KEY_PREFIX}${ownerId}:${surveyId}`;
}

export async function getSnapshot(): Promise<CachedSnapshot | null> {
  if (typeof window === "undefined") return null;
  const store = storage();
  try {
    const raw = store.getItem("sync:snapshot");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.key !== "current") return null;
    return parsed as CachedSnapshot;
  } catch {
    return null;
  }
}

export async function putSnapshot(snapshot: CachedSnapshot): Promise<void> {
  if (typeof window === "undefined") return;
  const store = storage();
  try {
    store.setItem("sync:snapshot", JSON.stringify(snapshot));
  } catch {
    // Storage unavailable must never break the form.
  }
}

export async function listMutations(): Promise<QueuedMutation[]> {
  if (typeof window === "undefined") return [];
  const store = storage();
  try {
    const raw = store.getItem("sync:mutations");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return (arr || []).map((m: any) => ({
      mutationId: m.mutationId,
      surveyId: m.surveyId,
      baseVersion: m.baseVersion,
      action: m.action,
      data: m.data,
      queuedAt: m.queuedAt,
      lastError: m.lastError,
    }));
  } catch {
    return [];
  }
}

export async function putMutation(m: QueuedMutation): Promise<void> {
  if (typeof window === "undefined") return;
  const store = storage();
  try {
    const arrStr = store.getItem("sync:mutations") || "[]";
    const arr = JSON.parse(arrStr);
    const idx = arr.findIndex((x: any) => x.mutationId === m.mutationId);
    if (idx >= 0) arr.splice(idx, 1);
    arr.push(m);
    store.setItem("sync:mutations", JSON.stringify(arr));
  } catch {
    // Storage unavailable must never break the form.
  }
}

export async function deleteMutation(mutationId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const store = storage();
  try {
    const arrStr = store.getItem("sync:mutations") || "[]";
    const arr = JSON.parse(arrStr);
    const filtered = arr.filter((x: any) => x.mutationId !== mutationId);
    store.setItem("sync:mutations", JSON.stringify(filtered));
  } catch {
    // Storage unavailable must never break the form.
  }
}

export async function clearMutations(): Promise<void> {
  if (typeof window === "undefined") return;
  const store = storage();
  try {
    store.setItem("sync:mutations", JSON.stringify([]));
  } catch {
    // Storage unavailable must never break the form.
  }
}

export function getCachedForm(snapshot: CachedSnapshot | null, surveyId: string): SurveyFormData | null {
  if (!snapshot) return null;
  return snapshot.forms.find((f) => f.survey.id === surveyId) ?? null;
}

export function getCachedSurveyDetail(snapshot: CachedSnapshot | null, surveyId: string): SurveyDetail | null {
  if (!snapshot) return null;
  return snapshot.surveys.find((s) => s.id === surveyId) ?? null;
}