import { api } from "./client";
import type { SystemSettingsResponse, SystemSettingsUpdateResponse } from "./types";

export const settingsApi = {
  get: () => api.get<SystemSettingsResponse>("/settings"),

  /**
   * Only the keys present in `values` change, so two administrators editing different settings
   * do not overwrite each other's work.
   */
  update: (values: Record<string, number>) =>
    api.patch<SystemSettingsUpdateResponse>("/settings", values),
};