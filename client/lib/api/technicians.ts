import { api } from "./client";
import type { SurveyDetail, TechnicianDashboard, TechnicianWorkload } from "./types";

export const techniciansApi = {
  list: () => api.get<{ technicians: TechnicianWorkload[] }>("/technicians"),

  get: (id: string) =>
    api.get<{ technician: { id: string; employeeCode: string; zone: string | null; isAvailable: boolean; user: unknown } }>(
      `/technicians/${id}`,
    ),

  getMyDashboard: () => api.get<TechnicianDashboard>("/technicians/me/dashboard"),

  getDashboard: (id: string) => api.get<TechnicianDashboard>(`/technicians/${id}/dashboard`),

  setAvailability: (id: string, isAvailable: boolean) =>
    api.patch<{ technician: { id: string; isAvailable: boolean } }>(`/technicians/${id}/availability`, {
      isAvailable,
    }),
};

export type { SurveyDetail };