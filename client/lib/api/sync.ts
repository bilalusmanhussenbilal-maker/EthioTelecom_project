import { api } from "./client";
import type { FieldDataPayload, SubmitPayload } from "./surveys";
import type { SurveyDetail, SyncPullResponse } from "./types";

interface SyncPushBase {
  mutationId: string;
  surveyId: string;
  baseVersion: number;
}

/** Mirrors the discriminated union `syncPushSchema` accepts on the server. */
export type SyncPushMutation =
  | (SyncPushBase & { action: "SAVE"; data: FieldDataPayload })
  | (SyncPushBase & { action: "SUBMIT"; data: SubmitPayload });

export const syncApi = {
  pull: () => api.get<SyncPullResponse>("/sync/pull"),

  push: (mutation: SyncPushMutation) =>
    api.post<{ mutationId: string; survey: SurveyDetail }>("/sync/push", mutation),
};
