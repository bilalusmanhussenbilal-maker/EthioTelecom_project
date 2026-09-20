import { api } from "./client";
import type {
  ActivityEntry,
  BoxStatus,
  ChangeType,
  FeasibilityPreview,
  LineStatus,
  Paginated,
  PortStatus,
  SurveyDetail,
  SurveyFormData,
  SurveyListItem,
  SurveyStatus,
  SurveyStatusCounts,
} from "./types";

export interface SurveyListParams {
  status?: SurveyStatus;
  technicianId?: string;
  serviceId?: string;
  areaId?: string;
  serviceCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSurveyPayload {
  serviceId: string;
  technicianId?: string | null;
  dueDate?: string | null;
  note?: string | null;
  changeType?: ChangeType;
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
}

export interface FieldDataPayload {
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
  boxStatus?: BoxStatus | null;
  portStatus?: PortStatus | null;
  lineStatus?: LineStatus | null;
  availableCapacity?: number | null;
  technicianRemark?: string | null;
}

export interface SubmitPayload extends FieldDataPayload {
  gps: {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt?: string;
  };
}

export interface FeasibilityCheckPayload {
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
}

export type ReviewDecision = "APPROVE" | "REJECT" | "RETURN";

export const surveysApi = {
  summary: () => api.get<{ counts: SurveyStatusCounts }>("/surveys/summary"),

  list: (params: SurveyListParams = {}) =>
    api.get<Paginated<SurveyListItem>>("/surveys", { query: { ...params } }),

  get: (id: string) => api.get<{ survey: SurveyDetail }>(`/surveys/${id}`),

  getFormData: (id: string) => api.get<SurveyFormData>(`/surveys/${id}/form-data`),

  /** Live feasibility for a target the technician is still choosing. Writes nothing. */
  checkFeasibility: (payload: FeasibilityCheckPayload, options?: { signal?: AbortSignal }) =>
    api.post<{ feasibility: FeasibilityPreview | null }>("/surveys/feasibility-check", payload, {
      signal: options?.signal,
    }),

  getTimeline: (id: string) => api.get<{ activity: ActivityEntry[] }>(`/surveys/${id}/timeline`),

  create: (payload: CreateSurveyPayload) => api.post<{ survey: SurveyDetail }>("/surveys", payload),

  assign: (id: string, payload: { technicianId: string; dueDate?: string | null; note?: string | null }) =>
    api.post<{ survey: SurveyDetail }>(`/surveys/${id}/assign`, payload),

  saveFieldData: (id: string, payload: FieldDataPayload) =>
    api.patch<{ survey: SurveyDetail }>(`/surveys/${id}/field-data`, payload),

  submit: (id: string, payload: SubmitPayload) =>
    api.post<{ survey: SurveyDetail }>(`/surveys/${id}/submit`, payload),

  review: (id: string, payload: { decision: ReviewDecision; remark?: string | null }) =>
    api.post<{ survey: SurveyDetail }>(`/surveys/${id}/review`, payload),
};