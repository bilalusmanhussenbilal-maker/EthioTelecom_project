import { api } from "./client";
import type { SyncPullResponse, SurveyDetail } from "./types";

export const syncApi = {
  pull: () => api.get<SyncPullResponse>("/sync/pull"),

  push: (mutation: {
    mutationId: string;
    surveyId: string;
    baseVersion: number;
    action: "SAVE" | "SUBMIT";
    data: any;
  }) => api.post<{ mutationId: string; survey: SurveyDetail }>("/sync/push", mutation),
};