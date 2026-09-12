import type { BoxStatus, LineStatus, PortStatus } from "@/lib/api/types";

/**
 * A local draft of the field survey, so a technician does not lose what they typed when the page
 * is reloaded, navigated away from, or interrupted because their session ended.
 *
 * This is deliberately not offline support. Nothing is queued, retried or synced, and no server
 * data is cached: the draft holds only the handful of values the technician entered, and it is
 * thrown away as soon as the survey is saved or submitted.
 *
 * Drafts are scoped to the signed-in technician as well as the survey, so a shared field device
 * never puts one technician's unsaved edits in front of another.
 *
 * GPS is never stored. A position captured minutes ago must not be resubmitted as if it were a
 * fresh measurement, so the technician captures a new fix when they come back.
 */
const DRAFT_VERSION = 1;
const KEY_PREFIX = "survey-draft:";

export interface SurveyDraftInput {
  boxStatus: BoxStatus | "";
  portStatus: PortStatus | "";
  lineStatus: LineStatus | "";
  remark: string;
  boxId: string;
  portId: string;
  lineId: string;
  requiredCapacity: string;
}

interface StoredSurveyDraft extends SurveyDraftInput {
  version: number;
  savedAt: string;
}

/** localStorage is absent during SSR and throws in private mode or when full. */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function draftKey(ownerId: string, surveyId: string): string {
  return `${KEY_PREFIX}${ownerId}:${surveyId}`;
}

export function saveSurveyDraft(ownerId: string, surveyId: string, draft: SurveyDraftInput): void {
  const store = storage();

  if (!store || !ownerId || !surveyId) {
    return;
  }

  try {
    const payload: StoredSurveyDraft = {
      ...draft,
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
    };

    store.setItem(draftKey(ownerId, surveyId), JSON.stringify(payload));
  } catch {
    // Storage being unavailable must never break the form.
  }
}

export function loadSurveyDraft(ownerId: string, surveyId: string): SurveyDraftInput | null {
  const store = storage();

  if (!store || !ownerId || !surveyId) {
    return null;
  }

  try {
    const raw = store.getItem(draftKey(ownerId, surveyId));

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    // A draft written by an older shape is ignored rather than half-applied to the form.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as StoredSurveyDraft).version !== DRAFT_VERSION
    ) {
      return null;
    }

    const draft = parsed as StoredSurveyDraft;

    return {
      boxStatus: draft.boxStatus ?? "",
      portStatus: draft.portStatus ?? "",
      lineStatus: draft.lineStatus ?? "",
      remark: draft.remark ?? "",
      boxId: draft.boxId ?? "",
      portId: draft.portId ?? "",
      lineId: draft.lineId ?? "",
      requiredCapacity: draft.requiredCapacity ?? "0",
    };
  } catch {
    return null;
  }
}

export function clearSurveyDraft(ownerId: string, surveyId: string): void {
  const store = storage();

  if (!store || !ownerId || !surveyId) {
    return;
  }

  try {
    store.removeItem(draftKey(ownerId, surveyId));
  } catch {
    // Ignore: there is nothing useful to do if the browser refuses.
  }
}