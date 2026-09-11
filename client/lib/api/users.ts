import { api } from "./client";
import type { ActivityEntry, ManagedUser, Paginated, UserRole } from "./types";

export interface UserListParams {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  zone?: string | null;
}

export interface UpdateUserPayload {
  fullName?: string;
  phoneNumber?: string | null;
  zone?: string | null;
  isAvailable?: boolean;
}

export const usersApi = {
  list: (params: UserListParams = {}) =>
    api.get<Paginated<ManagedUser>>("/users", { query: { ...params } }),

  get: (id: string) =>
    api.get<{ user: ManagedUser; recentActivity: ActivityEntry[] }>(`/users/${id}`),

  create: (payload: CreateUserPayload) => api.post<{ user: ManagedUser }>("/users", payload),

  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<{ user: ManagedUser }>(`/users/${id}`, payload),

  setActive: (id: string, isActive: boolean) =>
    api.patch<{ user: ManagedUser }>(`/users/${id}/active`, { isActive }),

  resetPassword: (id: string, password: string) =>
    api.patch<{ id: string; username: string }>(`/users/${id}/password`, { password }),
};

export const activityApi = {
  list: (params: { surveyId?: string; userId?: string; action?: string; search?: string; page?: number; pageSize?: number } = {}) =>
    api.get<Paginated<ActivityEntry>>("/activity-logs", { query: { ...params } }),
};